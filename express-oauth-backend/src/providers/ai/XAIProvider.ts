import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider';
import { ChatMessage, ChatOptions, ChatResponse } from '@/types';

export class XAIProvider extends BaseAIProvider {
  name = 'xai';
  private apiUrl = 'https://api.x.ai/v1';

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
          },
        }
      );

      const { choices, usage } = response.data;
      const content = choices[0].message.content;

      return {
        content,
        model,
        usage: {
          promptTokens: usage?.prompt_tokens || 0,
          completionTokens: usage?.completion_tokens || 0,
          totalTokens: usage?.total_tokens || 0,
        },
        cost: 0, // Update with actual pricing when available
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`xAI API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    // xAI models
    return [
      'grok-1',
      'grok-1.5',
    ];
  }
}