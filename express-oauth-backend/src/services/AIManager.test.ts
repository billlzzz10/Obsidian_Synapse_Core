import { AIManager } from './AIManager';
import { ChatMessage } from '@/types';
import { AppError } from '@/middleware/errorHandler';

// Mock all AI providers
jest.mock('@/providers/ai/OpenAIProvider');
jest.mock('@/providers/ai/AnthropicProvider');
jest.mock('@/providers/ai/GoogleAIProvider');
jest.mock('@/providers/ai/HuggingFaceProvider');
jest.mock('@/providers/ai/XAIProvider');
jest.mock('@/providers/ai/OpenRouterProvider');

describe('AIManager', () => {
  let aiManager: AIManager;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up environment variables for testing
    process.env.OPENAI_API_KEY = 'test-openai-key';
    process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
    
    aiManager = new AIManager();
  });

  describe('chat', () => {
    it('should call the correct provider for chat', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello!' },
      ];

      const mockResponse = {
        content: 'Hello! How can I help you?',
        model: 'gpt-3.5-turbo',
        usage: {
          promptTokens: 10,
          completionTokens: 8,
          totalTokens: 18,
        },
        cost: 0.001,
      };

      // Mock the provider's chat method
      const mockChat = jest.fn().mockResolvedValue(mockResponse);
      (aiManager as any).providers.get('openai').chat = mockChat;

      const result = await aiManager.chat('openai', 'gpt-3.5-turbo', messages);

      expect(mockChat).toHaveBeenCalledWith('gpt-3.5-turbo', messages, undefined);
      expect(result).toEqual(mockResponse);
    });

    it('should throw error for unavailable provider', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello!' },
      ];

      await expect(
        aiManager.chat('nonexistent', 'model', messages)
      ).rejects.toThrow(AppError);
    });

    it('should handle provider errors gracefully', async () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello!' },
      ];

      // Mock provider to throw error
      const mockChat = jest.fn().mockRejectedValue(new Error('API Error'));
      (aiManager as any).providers.get('openai').chat = mockChat;

      await expect(
        aiManager.chat('openai', 'gpt-3.5-turbo', messages)
      ).rejects.toThrow('AI provider error: API Error');
    });
  });

  describe('listModels', () => {
    it('should list models from specific provider', async () => {
      const mockModels = ['gpt-3.5-turbo', 'gpt-4'];
      const mockListModels = jest.fn().mockResolvedValue(mockModels);
      (aiManager as any).providers.get('openai').listModels = mockListModels;

      const result = await aiManager.listModels('openai');

      expect(mockListModels).toHaveBeenCalled();
      expect(result).toEqual({ openai: mockModels });
    });

    it('should list models from all providers', async () => {
      // Mock list models for each provider
      const mockOpenAIModels = ['gpt-3.5-turbo', 'gpt-4'];
      const mockAnthropicModels = ['claude-2', 'claude-instant'];

      (aiManager as any).providers.get('openai').listModels = jest.fn().mockResolvedValue(mockOpenAIModels);
      (aiManager as any).providers.get('anthropic').listModels = jest.fn().mockResolvedValue(mockAnthropicModels);

      const result = await aiManager.listModels();

      expect(result).toHaveProperty('openai', mockOpenAIModels);
      expect(result).toHaveProperty('anthropic', mockAnthropicModels);
    });

    it('should handle errors when listing models', async () => {
      // Mock one provider to throw error
      (aiManager as any).providers.get('openai').listModels = jest.fn().mockRejectedValue(new Error('API Error'));
      (aiManager as any).providers.get('anthropic').listModels = jest.fn().mockResolvedValue(['claude-2']);

      const result = await aiManager.listModels();

      expect(result).toHaveProperty('openai', []);
      expect(result).toHaveProperty('anthropic', ['claude-2']);
    });

    it('should throw error for unavailable provider when listing specific provider models', async () => {
      await expect(
        aiManager.listModels('nonexistent')
      ).rejects.toThrow(AppError);
    });
  });

  describe('getAvailableProviders', () => {
    it('should return list of available providers', () => {
      const providers = aiManager.getAvailableProviders();

      expect(providers).toContain('openai');
      expect(providers).toContain('anthropic');
      expect(providers).toHaveLength(2); // Only providers with API keys
    });
  });

  describe('isProviderAvailable', () => {
    it('should return true for available provider', () => {
      expect(aiManager.isProviderAvailable('openai')).toBe(true);
      expect(aiManager.isProviderAvailable('anthropic')).toBe(true);
    });

    it('should return false for unavailable provider', () => {
      expect(aiManager.isProviderAvailable('nonexistent')).toBe(false);
      expect(aiManager.isProviderAvailable('google')).toBe(false); // No API key set
    });
  });

  describe('suggestProvider', () => {
    it('should suggest correct provider for known models', () => {
      expect(aiManager.suggestProvider('gpt-4')).toBe('openai');
      expect(aiManager.suggestProvider('gpt-3.5-turbo')).toBe('openai');
      expect(aiManager.suggestProvider('claude-2')).toBe('anthropic');
      expect(aiManager.suggestProvider('claude-3-opus')).toBe('anthropic');
    });

    it('should return null when no suitable provider is available', () => {
      // Remove all providers
      (aiManager as any).providers.clear();

      expect(aiManager.suggestProvider('gpt-4')).toBeNull();
    });

    it('should default to openrouter if available', () => {
      process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
      const newManager = new AIManager();

      expect(newManager.suggestProvider('unknown-model')).toBe('openrouter');
    });
  });

  describe('initialization', () => {
    it('should initialize only providers with API keys', () => {
      // Clear all env vars
      delete process.env.OPENAI_API_KEY;
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.GOOGLE_AI_API_KEY;
      delete process.env.HUGGINGFACE_API_KEY;
      delete process.env.XAI_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      // Set only specific keys
      process.env.OPENAI_API_KEY = 'test-key';
      process.env.GOOGLE_AI_API_KEY = 'test-key';

      const newManager = new AIManager();
      const providers = newManager.getAvailableProviders();

      expect(providers).toContain('openai');
      expect(providers).toContain('google');
      expect(providers).not.toContain('anthropic');
      expect(providers).not.toContain('huggingface');
    });
  });
});