import { AIProvider, ChatMessage, ChatOptions, ChatResponse } from '@/types';
import { OpenAIProvider } from '@/providers/ai/OpenAIProvider';
import { AnthropicProvider } from '@/providers/ai/AnthropicProvider';
import { GoogleAIProvider } from '@/providers/ai/GoogleAIProvider';
import { HuggingFaceProvider } from '@/providers/ai/HuggingFaceProvider';
import { XAIProvider } from '@/providers/ai/XAIProvider';
import { OpenRouterProvider } from '@/providers/ai/OpenRouterProvider';
import { AppError } from '@/middleware/errorHandler';

export class AIManager {
  private providers: Map<string, AIProvider> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Initialize OpenAI
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider(process.env.OPENAI_API_KEY));
    }

    // Initialize Anthropic
    if (process.env.ANTHROPIC_API_KEY) {
      this.providers.set('anthropic', new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
    }

    // Initialize Google AI
    if (process.env.GOOGLE_AI_API_KEY) {
      this.providers.set('google', new GoogleAIProvider(process.env.GOOGLE_AI_API_KEY));
    }

    // Initialize HuggingFace
    if (process.env.HUGGINGFACE_API_KEY) {
      this.providers.set('huggingface', new HuggingFaceProvider(process.env.HUGGINGFACE_API_KEY));
    }

    // Initialize xAI
    if (process.env.XAI_API_KEY) {
      this.providers.set('xai', new XAIProvider(process.env.XAI_API_KEY));
    }

    // Initialize OpenRouter
    if (process.env.OPENROUTER_API_KEY) {
      this.providers.set('openrouter', new OpenRouterProvider(process.env.OPENROUTER_API_KEY));
    }
  }

  async chat(
    provider: string,
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    const aiProvider = this.providers.get(provider);
    
    if (!aiProvider) {
      throw new AppError(400, `Provider '${provider}' is not available`);
    }

    try {
      return await aiProvider.chat(model, messages, options);
    } catch (error) {
      console.error(`Error with ${provider}:`, error);
      throw new AppError(500, `AI provider error: ${error.message}`);
    }
  }

  async listModels(provider?: string): Promise<Record<string, string[]>> {
    if (provider) {
      const aiProvider = this.providers.get(provider);
      if (!aiProvider) {
        throw new AppError(400, `Provider '${provider}' is not available`);
      }
      return { [provider]: await aiProvider.listModels() };
    }

    // List all models from all providers
    const allModels: Record<string, string[]> = {};
    
    for (const [name, aiProvider] of this.providers) {
      try {
        allModels[name] = await aiProvider.listModels();
      } catch (error) {
        console.error(`Error listing models for ${name}:`, error);
        allModels[name] = [];
      }
    }

    return allModels;
  }

  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  isProviderAvailable(provider: string): boolean {
    return this.providers.has(provider);
  }

  // Helper method to determine the best provider for a model
  suggestProvider(model: string): string | null {
    // Model to provider mapping
    const modelProviders: Record<string, string> = {
      'gpt-4': 'openai',
      'gpt-3.5-turbo': 'openai',
      'claude-3': 'anthropic',
      'claude-2': 'anthropic',
      'gemini': 'google',
      'palm': 'google',
      'llama': 'huggingface',
      'mistral': 'huggingface',
      'grok': 'xai',
    };

    // Find provider based on model prefix
    for (const [prefix, provider] of Object.entries(modelProviders)) {
      if (model.toLowerCase().includes(prefix) && this.providers.has(provider)) {
        return provider;
      }
    }

    // Default to OpenRouter if available (it supports many models)
    if (this.providers.has('openrouter')) {
      return 'openrouter';
    }

    return null;
  }
}

// Singleton instance
export const aiManager = new AIManager();