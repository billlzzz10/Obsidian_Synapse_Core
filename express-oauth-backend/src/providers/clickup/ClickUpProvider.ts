import axios, { AxiosInstance } from 'axios';
import { OAuthToken } from '@prisma/client';
import { prisma } from '@/index';

export class ClickUpProvider {
  private api: AxiosInstance;
  private token: OAuthToken;

  constructor(token: OAuthToken) {
    this.token = token;
    this.api = axios.create({
      baseURL: 'https://api.clickup.com/api/v2',
      headers: {
        'Authorization': token.accessToken,
        'Content-Type': 'application/json',
      },
    });
  }

  // OAuth methods
  static getAuthorizationUrl(state: string): string {
    const clientId = process.env.CLICKUP_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.CLICKUP_REDIRECT_URI!);
    return `https://app.clickup.com/api?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
  }

  static async exchangeCodeForToken(code: string): Promise<any> {
    const response = await axios.post('https://api.clickup.com/api/v2/oauth/token', {
      client_id: process.env.CLICKUP_CLIENT_ID,
      client_secret: process.env.CLICKUP_CLIENT_SECRET,
      code,
    });
    return response.data;
  }

  // Workspace methods
  async getWorkspaces() {
    const response = await this.api.get('/team');
    return response.data;
  }

  async getWorkspace(teamId: string) {
    const response = await this.api.get(`/team/${teamId}`);
    return response.data;
  }

  // Space methods
  async getSpaces(teamId: string) {
    const response = await this.api.get(`/team/${teamId}/space`);
    return response.data;
  }

  async createSpace(teamId: string, name: string, features?: any) {
    const response = await this.api.post(`/team/${teamId}/space`, {
      name,
      multiple_assignees: true,
      features: features || {
        due_dates: { enabled: true },
        tags: { enabled: true },
        time_tracking: { enabled: true },
        priorities: { enabled: true },
        custom_fields: { enabled: true },
      },
    });
    return response.data;
  }

  // Folder methods
  async getFolders(spaceId: string) {
    const response = await this.api.get(`/space/${spaceId}/folder`);
    return response.data;
  }

  async createFolder(spaceId: string, name: string) {
    const response = await this.api.post(`/space/${spaceId}/folder`, { name });
    return response.data;
  }

  // List methods
  async getLists(folderId: string) {
    const response = await this.api.get(`/folder/${folderId}/list`);
    return response.data;
  }

  async getFolderlessLists(spaceId: string) {
    const response = await this.api.get(`/space/${spaceId}/list`);
    return response.data;
  }

  async createList(folderId: string, name: string, content?: string) {
    const response = await this.api.post(`/folder/${folderId}/list`, {
      name,
      content,
    });
    return response.data;
  }

  async createFolderlessList(spaceId: string, name: string, content?: string) {
    const response = await this.api.post(`/space/${spaceId}/list`, {
      name,
      content,
    });
    return response.data;
  }

  // Task methods
  async getTasks(listId: string, options?: any) {
    const response = await this.api.get(`/list/${listId}/task`, { params: options });
    return response.data;
  }

  async getTask(taskId: string) {
    const response = await this.api.get(`/task/${taskId}`);
    return response.data;
  }

  async createTask(listId: string, task: any) {
    const response = await this.api.post(`/list/${listId}/task`, task);
    return response.data;
  }

  async updateTask(taskId: string, updates: any) {
    const response = await this.api.put(`/task/${taskId}`, updates);
    return response.data;
  }

  async deleteTask(taskId: string) {
    const response = await this.api.delete(`/task/${taskId}`);
    return response.data;
  }

  // Comment methods
  async getComments(taskId: string) {
    const response = await this.api.get(`/task/${taskId}/comment`);
    return response.data;
  }

  async createComment(taskId: string, commentText: string, assignee?: string) {
    const response = await this.api.post(`/task/${taskId}/comment`, {
      comment_text: commentText,
      assignee,
      notify_all: true,
    });
    return response.data;
  }

  // Tag methods
  async getTags(spaceId: string) {
    const response = await this.api.get(`/space/${spaceId}/tag`);
    return response.data;
  }

  async addTagToTask(taskId: string, tagName: string) {
    const response = await this.api.post(`/task/${taskId}/tag/${tagName}`);
    return response.data;
  }

  async removeTagFromTask(taskId: string, tagName: string) {
    const response = await this.api.delete(`/task/${taskId}/tag/${tagName}`);
    return response.data;
  }

  // Custom fields
  async getCustomFields(listId: string) {
    const response = await this.api.get(`/list/${listId}/field`);
    return response.data;
  }

  async setCustomFieldValue(taskId: string, fieldId: string, value: any) {
    const response = await this.api.post(`/task/${taskId}/field/${fieldId}`, { value });
    return response.data;
  }

  // Time tracking
  async getTimeEntries(teamId: string, options?: any) {
    const response = await this.api.get(`/team/${teamId}/time_entries`, { params: options });
    return response.data;
  }

  async createTimeEntry(teamId: string, entry: any) {
    const response = await this.api.post(`/team/${teamId}/time_entries`, entry);
    return response.data;
  }

  // Views
  async getViews(listId: string) {
    const response = await this.api.get(`/list/${listId}/view`);
    return response.data;
  }

  async getView(viewId: string) {
    const response = await this.api.get(`/view/${viewId}`);
    return response.data;
  }

  // Goals
  async getGoals(teamId: string) {
    const response = await this.api.get(`/team/${teamId}/goal`);
    return response.data;
  }

  async createGoal(teamId: string, goal: any) {
    const response = await this.api.post(`/team/${teamId}/goal`, goal);
    return response.data;
  }

  // Webhooks
  async getWebhooks(teamId: string) {
    const response = await this.api.get(`/team/${teamId}/webhook`);
    return response.data;
  }

  async createWebhook(teamId: string, webhook: any) {
    const response = await this.api.post(`/team/${teamId}/webhook`, webhook);
    return response.data;
  }

  async deleteWebhook(webhookId: string) {
    const response = await this.api.delete(`/webhook/${webhookId}`);
    return response.data;
  }
}