import axios from 'axios';
import { BaseAIProvider } from './BaseAIProvider';
import { ChatMessage, ChatOptions, ChatResponse } from '@/types';

export class HuggingFaceProvider extends BaseAIProvider {
  name = 'huggingface';
  private apiUrl = 'https://api-inference.huggingface.co/models';

  async chat(
    model: string,
    messages: ChatMessage[],
    options?: ChatOptions
  ): Promise<ChatResponse> {
    try {
      // Convert messages to a single prompt for HuggingFace
      const prompt = this.messagesToPrompt(messages);

      const response = await axios.post(
        `${this.apiUrl}/${model}`,
        {
          inputs: prompt,
          parameters: {
            temperature: options?.temperature ?? 0.7,
            max_new_tokens: options?.maxTokens || 512,
            top_p: options?.topP,
            repetition_penalty: options?.frequencyPenalty,
          },
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // HuggingFace returns different formats based on the model
      let content = '';
      if (Array.isArray(response.data)) {
        content = response.data[0]?.generated_text || '';
      } else if (response.data.generated_text) {
        content = response.data.generated_text;
      } else if (typeof response.data === 'string') {
        content = response.data;
      }

      // Remove the input prompt from the output if it's included
      if (content.startsWith(prompt)) {
        content = content.slice(prompt.length).trim();
      }

      return {
        content,
        model,
        usage: {
          promptTokens: 0, // HuggingFace doesn't provide token counts
          completionTokens: 0,
          totalTokens: 0,
        },
        cost: 0, // Most HuggingFace models are free
      };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(`HuggingFace API error: ${error.response?.data?.error || error.message}`);
      }
      throw error;
    }
  }

  async listModels(): Promise<string[]> {
    // Return popular text generation models
    return [
      'meta-llama/Llama-2-7b-chat-hf',
      'meta-llama/Llama-2-13b-chat-hf',
      'mistralai/Mistral-7B-Instruct-v0.1',
      'microsoft/phi-2',
      'google/flan-t5-large',
      'facebook/blenderbot-400M-distill',
      'EleutherAI/gpt-neo-2.7B',
      'bigscience/bloom-560m',
    ];
  }

  private messagesToPrompt(messages: ChatMessage[]): string {
    return messages
      .map(msg => {
        switch (msg.role) {
          case 'system':
            return `System: ${msg.content}`;
          case 'user':
            return `Human: ${msg.content}`;
          case 'assistant':
            return `Assistant: ${msg.content}`;
          default:
            return msg.content;
        }
      })
      .join('\n\n') + '\n\nAssistant:';
  }
}