import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider';
import { ChatMessage, ChatOptions, ChatResponse } from '@/types';

export class OpenRouterProvider extends BaseAIProvider {
  name = 'openrouter';
  private apiUrl = 'https://openrouter.ai/api/v1';

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
          stream: false,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
            'X-Title': 'Express OAuth Backend',
          },
        }
      );

      const { choices, usage } = response.data;
      const content = choices[0].message.content;

      // OpenRouter provides cost information in the response
      const cost = response.data.total_cost || 0;

      return {
        content,
        model,
        usage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
        },
        cost,
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
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
        .map((model: any) => model.id)
        .sort();
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`OpenRouter API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }
}