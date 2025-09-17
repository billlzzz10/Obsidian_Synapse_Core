import { OpenAIProvider } from './OpenAIProvider';
import axios from 'axios';
import { ChatMessage } from '@/types';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new OpenAIProvider('test-api-key');
  });

  describe('chat', () => {
    it('should make chat completion request successfully', async () => {
      const messages: ChatMessage[] = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello!' },
      ];

      const mockResponse = {
        data: {
          choices: [
            {
              message: {
                content: 'Hello! How can I help you today?',
              },
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18,
          },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await provider.chat('gpt-3.5-turbo', messages);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-3.5-turbo',
          messages,
          temperature: 0.7,
          max_tokens: undefined,
          top_p: undefined,
          frequency_penalty: undefined,
          presence_penalty: undefined,
          stream: false,
        },
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          },
        }
      );

      expect(result.content).toBe('Hello! How can I help you today?');
      expect(result.model).toBe('gpt-3.5-turbo');
      expect(result.usage).toEqual({
        promptTokens: 10,
        completionTokens: 8,
        totalTokens: 18,
      });
      expect(result.cost).toBeGreaterThan(0);
    });

    it('should handle API errors properly', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello!' }];

      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            error: {
              message: 'Invalid API key',
            },
          },
        },
      });

      await expect(provider.chat('gpt-3.5-turbo', messages)).rejects.toThrow(
        'OpenAI API error: Invalid API key'
      );
    });

    it('should pass custom options', async () => {
      const messages: ChatMessage[] = [{ role: 'user', content: 'Hello!' }];
      const options = {
        temperature: 0.5,
        maxTokens: 100,
        topP: 0.9,
        frequencyPenalty: 0.5,
        presencePenalty: 0.5,
      };

      const mockResponse = {
        data: {
          choices: [{ message: { content: 'Response' } }],
          usage: { prompt_tokens: 5, completion_tokens: 3, total_tokens: 8 },
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await provider.chat('gpt-4', messages, options);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          temperature: 0.5,
          max_tokens: 100,
          top_p: 0.9,
          frequency_penalty: 0.5,
          presence_penalty: 0.5,
        }),
        expect.any(Object)
      );
    });
  });

  describe('listModels', () => {
    it('should list available GPT models', async () => {
      const mockResponse = {
        data: {
          data: [
            { id: 'gpt-4', object: 'model' },
            { id: 'gpt-3.5-turbo', object: 'model' },
            { id: 'text-davinci-003', object: 'model' },
            { id: 'gpt-3.5-turbo-16k', object: 'model' },
          ],
        },
      };

      mockedAxios.get.mockResolvedValueOnce(mockResponse);

      const models = await provider.listModels();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://api.openai.com/v1/models',
        {
          headers: {
            'Authorization': 'Bearer test-api-key',
          },
        }
      );

      expect(models).toEqual(['gpt-3.5-turbo', 'gpt-3.5-turbo-16k', 'gpt-4']);
      expect(models).not.toContain('text-davinci-003'); // Should filter out non-GPT models
    });

    it('should handle list models errors', async () => {
      mockedAxios.get.mockRejectedValueOnce({
        isAxiosError: true,
        response: {
          data: {
            error: {
              message: 'Unauthorized',
            },
          },
        },
      });

      await expect(provider.listModels()).rejects.toThrow('OpenAI API error: Unauthorized');
    });
  });

  describe('calculateCost', () => {
    it('should calculate cost correctly for different models', () => {
      const provider = new OpenAIProvider('test-key');
      
      // Access protected method through any type casting
      const calculateCost = (provider as any).calculateCost.bind(provider);

      // GPT-3.5-turbo
      const cost1 = calculateCost('gpt-3.5-turbo', { prompt: 1000, completion: 500 });
      expect(cost1).toBeCloseTo(0.0005 + 0.00075, 5); // $0.00125

      // GPT-4
      const cost2 = calculateCost('gpt-4', { prompt: 1000, completion: 500 });
      expect(cost2).toBeCloseTo(0.03 + 0.03, 5); // $0.06

      // Unknown model
      const cost3 = calculateCost('unknown-model', { prompt: 1000, completion: 500 });
      expect(cost3).toBe(0);
    });
  });
});