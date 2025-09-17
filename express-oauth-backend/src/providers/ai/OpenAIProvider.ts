import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider';
import { ChatMessage, ChatOptions, ChatResponse } from '@/types';

export class OpenAIProvider extends BaseAIProvider {
  name = 'openai';
  private apiUrl = 'https://api.openai.com/v1';

  async chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/chat/completions`,
        {
          model,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens,
          top_p: options?.topP,
          frequency_penalty: options?.frequencyPenalty,
          presence_penalty: options?.presencePenalty,
          stream: false, // Handle streaming separately if needed
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const { choices, usage } = response.data;
      const content = choices[0].message.content;

      const cost = this.calculateCost(model, {
        prompt: usage.prompt_tokens,
        completion: usage.completion_tokens,
      });

      return {
        content,
        model,
        usage: {
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        cost,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(`${this.apiUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });

      return response.data.data
        .filter((model: any) => model.id.includes('gpt'))
        .map((model: any) => model.id)
        .sort();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  protected calculateCost(model: string, tokens: { prompt: number; completion: number }): number {
    // OpenAI pricing as of 2024 (per 1K tokens)
    const pricing: Record<string, { prompt: number; completion: number }> = {
      'gpt-4': { prompt: 0.03, completion: 0.06 },
      'gpt-4-32k': { prompt: 0.06, completion: 0.12 },
      'gpt-3.5-turbo': { prompt: 0.0005, completion: 0.0015 },
      'gpt-3.5-turbo-16k': { prompt: 0.003, completion: 0.004 },
    };

    const modelPricing = pricing[model] || { prompt: 0, completion: 0 };
    
    return (
      (tokens.prompt / 1000) * modelPricing.prompt +
      (tokens.completion / 1000) * modelPricing.completion
    );
  }
}