import { OAuthConfig } from '@/types';

export const oauthConfigs: Record<string, OAuthConfig> = {
  clickup: {
    clientId: process.env.CLICKUP_CLIENT_ID!,
    clientSecret: process.env.CLICKUP_CLIENT_SECRET!,
    redirectUri: process.env.CLICKUP_REDIRECT_URI || 'http://localhost:3000/auth/clickup/callback',
    authorizationUrl: 'https://app.clickup.com/api',
    tokenUrl: 'https://api.clickup.com/api/v2/oauth/token',
    scope: [],
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID!,
    clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    redirectUri: process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/auth/github/callback',
    authorizationUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: ['repo', 'user'],
  },
};