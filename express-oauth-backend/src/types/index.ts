import { Request } from 'express';
import { User } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scope: string[];
}

export interface AIProvider {
  name: string;
  chat(model: string, messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  listModels(): Promise<string[]>;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost?: number;
}

export interface SentryEventData {
  level: 'error' | 'warning' | 'info' | 'debug';
  message?: string;
  exception?: {
    type: string;
    value: string;
    stacktrace?: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  environment?: string;
  release?: string;
}

export interface GitOperation {
  type: 'clone' | 'pull' | 'push' | 'commit' | 'branch' | 'merge' | 'status' | 'log';
  repository?: string;
  branch?: string;
  message?: string;
  files?: string[];
  options?: Record<string, any>;
}