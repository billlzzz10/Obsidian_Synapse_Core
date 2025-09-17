import { AIProvider, ChatMessage, ChatOptions, ChatResponse } from '@/types';

export abstract class BaseAIProvider implements AIProvider {
  abstract name: string;
  protected apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  abstract chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse>;

  abstract listModels(): Promise<string[]>;

  protected calculateCost(model: string, tokens: { prompt: number; completion: number }): number {
    // Override in specific providers with actual pricing
    return 0;
  }
}