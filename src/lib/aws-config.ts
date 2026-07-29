// ─── AWS Backend Configuration ──────────────────────────────────────────────

export const AWS_CONFIG = {
  // Cognito
  userPoolId: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  userPoolClientId: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  userPoolDomain: process.env.NEXT_PUBLIC_COGNITO_DOMAIN || '',

  // DynamoDB — uses AWS SDK with credentials from env/SSO/EC2 instance role
  profilesTable: process.env.NEXT_PUBLIC_DYNAMODB_PROFILES_TABLE || `civicpie-prod-profiles`,
  alertsTable: process.env.NEXT_PUBLIC_DYNAMODB_ALERTS_TABLE || `civicpie-prod-alerts`,

  // Redirect
  signInRedirectURL: process.env.NEXT_PUBLIC_AUTH_REDIRECT || (typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : ''),
  signOutRedirectURL: process.env.NEXT_PUBLIC_AUTH_REDIRECT || (typeof window !== 'undefined' ? window.location.origin : ''),
};

const hasCognitoConfig =
  AWS_CONFIG.userPoolId.length > 0 && !AWS_CONFIG.userPoolId.includes('your-');

export function isCognitoConfigured(): boolean {
  return hasCognitoConfig;
}

// ─── Amplify config (lazy load to avoid crashing w/o deps) ──────────────────

export function getAmplifyConfig() {
  return {
    Auth: {
      Cognito: {
        userPoolId: AWS_CONFIG.userPoolId,
        userPoolClientId: AWS_CONFIG.userPoolClientId,
        loginWith: {
          email: true,
          oauth: {
            domain: AWS_CONFIG.userPoolDomain,
            scopes: ['email', 'openid', 'profile'],
            redirectSignIn: [AWS_CONFIG.signInRedirectURL],
            redirectSignOut: [AWS_CONFIG.signOutRedirectURL],
            responseType: 'code' as 'code',
            providers: ['Google'] as any[],
          },
        },
      },
    },
  };
}
