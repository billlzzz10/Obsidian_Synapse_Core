import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider';
import { ChatMessage, ChatOptions, ChatResponse } from '@/types';

export class GoogleAIProvider extends BaseAIProvider {
  name = 'google';
  private apiUrl = 'https://generativelanguage.googleapis.com/v1beta';

  async chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    try {
      // Convert messages to Google AI format
      const contents = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }],
      }));

      const response = await axios.post(
        `${this.apiUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          contents,
          generationConfig: {
            temperature: options?.temperature ?? 0.7,
            maxOutputTokens: options?.maxTokens,
            topP: options?.topP,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const { candidates } = response.data;
      const content = candidates[0]?.content?.parts?.[0]?.text || '';
      
      // Google AI doesn't always provide token usage
      const usage = response.data.usageMetadata || {
        promptTokenCount: 0,
        candidatesTokenCount: 0,
        totalTokenCount: 0,
      };

      return {
        content,
        model,
        usage: {
          promptTokens: usage.promptTokenCount,
          completionTokens: usage.candidatesTokenCount,
          totalTokens: usage.totalTokenCount,
        },
        cost: 0, // Google AI is currently free for most models
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Google AI API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await axios.get(
        `${this.apiUrl}/models?key=${this.apiKey}`
      );

      return response.data.models
        .filter((model: any) => model.supportedGenerationMethods?.includes('generateContent'))
        .map((model: any) => model.name.replace('models/', ''));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Google AI API error: ${error.response?.data?.error?.message || error.message}`);
      }
      throw error;
    }
  }
}