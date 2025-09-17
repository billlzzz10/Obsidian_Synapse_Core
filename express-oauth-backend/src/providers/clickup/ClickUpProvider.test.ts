import { ClickUpProvider } from './ClickUpProvider';
import axios from 'axios';
import { OAuthToken } from '@prisma/client';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ClickUpProvider', () => {
  let provider: ClickUpProvider;
  let mockToken: OAuthToken;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockToken = {
      id: 'test-id',
      provider: 'clickup',
      accessToken: 'test-access-token',
      refreshToken: 'test-refresh-token',
      expiresAt: new Date(Date.now() + 3600000),
      scope: null,
      tokenType: 'Bearer',
      userId: 'test-user-id',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock axios.create to return a mocked axios instance
    mockedAxios.create.mockReturnValue(mockedAxios);
    
    provider = new ClickUpProvider(mockToken);
  });

  describe('OAuth methods', () => {
    it('should generate correct authorization URL', () => {
      process.env.CLICKUP_CLIENT_ID = 'test-client-id';
      process.env.CLICKUP_REDIRECT_URI = 'http://localhost:3000/callback';

      const state = 'test-state';
      const url = ClickUpProvider.getAuthorizationUrl(state);

      expect(url).toContain('https://app.clickup.com/api');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
      expect(url).toContain('state=test-state');
    });

    it('should exchange code for token', async () => {
      process.env.CLICKUP_CLIENT_ID = 'test-client-id';
      process.env.CLICKUP_CLIENT_SECRET = 'test-client-secret';

      const mockResponse = {
        data: {
          access_token: 'new-access-token',
          refresh_token: 'new-refresh-token',
          expires_in: 3600,
        },
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      const result = await ClickUpProvider.exchangeCodeForToken('test-code');

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api.clickup.com/api/v2/oauth/token',
        {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          code: 'test-code',
        }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('Workspace methods', () => {
    it('should get workspaces', async () => {
      const mockWorkspaces = { teams: [{ id: '123', name: 'Test Team' }] };
      mockedAxios.get.mockResolvedValueOnce({ data: mockWorkspaces });

      const result = await provider.getWorkspaces();

      expect(mockedAxios.get).toHaveBeenCalledWith('/team');
      expect(result).toEqual(mockWorkspaces);
    });

    it('should get specific workspace', async () => {
      const mockWorkspace = { id: '123', name: 'Test Team' };
      mockedAxios.get.mockResolvedValueOnce({ data: mockWorkspace });

      const result = await provider.getWorkspace('123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/team/123');
      expect(result).toEqual(mockWorkspace);
    });
  });

  describe('Space methods', () => {
    it('should get spaces', async () => {
      const mockSpaces = { spaces: [{ id: '456', name: 'Test Space' }] };
      mockedAxios.get.mockResolvedValueOnce({ data: mockSpaces });

      const result = await provider.getSpaces('123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/team/123/space');
      expect(result).toEqual(mockSpaces);
    });

    it('should create space', async () => {
      const mockSpace = { id: '789', name: 'New Space' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockSpace });

      const result = await provider.createSpace('123', 'New Space');

      expect(mockedAxios.post).toHaveBeenCalledWith('/team/123/space', {
        name: 'New Space',
        multiple_assignees: true,
        features: expect.any(Object),
      });
      expect(result).toEqual(mockSpace);
    });
  });

  describe('Task methods', () => {
    it('should get tasks', async () => {
      const mockTasks = { tasks: [{ id: 'task-1', name: 'Test Task' }] };
      mockedAxios.get.mockResolvedValueOnce({ data: mockTasks });

      const result = await provider.getTasks('list-123');

      expect(mockedAxios.get).toHaveBeenCalledWith('/list/list-123/task', { params: undefined });
      expect(result).toEqual(mockTasks);
    });

    it('should create task', async () => {
      const mockTask = { id: 'task-2', name: 'New Task' };
      const taskData = { name: 'New Task', description: 'Test description' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockTask });

      const result = await provider.createTask('list-123', taskData);

      expect(mockedAxios.post).toHaveBeenCalledWith('/list/list-123/task', taskData);
      expect(result).toEqual(mockTask);
    });

    it('should update task', async () => {
      const mockTask = { id: 'task-1', name: 'Updated Task' };
      const updates = { name: 'Updated Task' };
      mockedAxios.put.mockResolvedValueOnce({ data: mockTask });

      const result = await provider.updateTask('task-1', updates);

      expect(mockedAxios.put).toHaveBeenCalledWith('/task/task-1', updates);
      expect(result).toEqual(mockTask);
    });

    it('should delete task', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });

      const result = await provider.deleteTask('task-1');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/task/task-1');
      expect(result).toEqual({});
    });
  });

  describe('Comment methods', () => {
    it('should create comment', async () => {
      const mockComment = { id: 'comment-1', comment_text: 'Test comment' };
      mockedAxios.post.mockResolvedValueOnce({ data: mockComment });

      const result = await provider.createComment('task-1', 'Test comment', 'user-1');

      expect(mockedAxios.post).toHaveBeenCalledWith('/task/task-1/comment', {
        comment_text: 'Test comment',
        assignee: 'user-1',
        notify_all: true,
      });
      expect(result).toEqual(mockComment);
    });
  });

  describe('Tag methods', () => {
    it('should add tag to task', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: {} });

      const result = await provider.addTagToTask('task-1', 'important');

      expect(mockedAxios.post).toHaveBeenCalledWith('/task/task-1/tag/important');
      expect(result).toEqual({});
    });

    it('should remove tag from task', async () => {
      mockedAxios.delete.mockResolvedValueOnce({ data: {} });

      const result = await provider.removeTagFromTask('task-1', 'important');

      expect(mockedAxios.delete).toHaveBeenCalledWith('/task/task-1/tag/important');
      expect(result).toEqual({});
    });
  });
});