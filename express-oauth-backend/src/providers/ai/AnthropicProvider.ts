import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider';
import { ChatMessage, ChatOptions, ChatResponse } from '@/types';

export class AnthropicProvider extends BaseAIProvider {
  name = 'anthropic';
  private apiUrl = 'https://api.anthropic.com/v1';

  async chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    try {
      // Convert messages to Anthropic format
      const systemMessage = messages.find(m => m.role === 'system')?.content || '';
      const conversationMessages = messages.filter(m => m.role !== 'system');

      const response = await axios.post(
        `${this.apiUrl}/messages`,
        {
          model,
          messages: conversationMessages,
          system: systemMessage,
          max_tokens: options?.maxTokens || 4096,
          temperature: options?.temperature ?? 0.7,
          top_p: options?.topP,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
        }
      );

      const { content, usage } = response.data;
      const textContent = content.find((c: any) => c.type === 'text')?.text || '';

      const cost = this.calculateCost(model, {
        prompt: usage.input_tokens,
        completion: usage.output_tokens,
      });

      return {
        content: textContent,
        model,
        usage: {
          promptTokens: usage.input_tokens,
          completionTokens: usage.output_tokens,
          totalTokens: usage.input_tokens + usage.output_tokens,
        },
        cost,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    // Anthropic doesn't have a list models endpoint, so we return known models
    return [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
      'claude-2.1',
      'claude-2.0',
      'claude-instant-1.2',
    ];
  }

  protected calculateCost(model: string, tokens: { prompt: number; completion: number }): number {
    // Anthropic pricing (per 1M tokens)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'claude-3-opus-20240229': { prompt: 15, completion: 75 },
      'claude-3-sonnet-20240229': { prompt: 3, completion: 15 },
      'claude-3-haiku-20240307': { prompt: 0.25, completion: 1.25 },
      'claude-2.1': { prompt: 8, completion: 24 },
      'claude-2.0': { prompt: 8, completion: 24 },
      'claude-instant-1.2': { prompt: 0.8, completion: 2.4 },
    };

    const modelPricing = pricing[model] || { prompt: 0, completion: 0 };
    
    return (
      (tokens.prompt / 1000000) * modelPricing.prompt +
      (tokens.completion / 1000000) * modelPricing.completion
    );
  }
}