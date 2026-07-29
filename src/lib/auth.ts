// ─── CivicPie Auth Utility ──────────────────────────────────────────────────
// Primary: AWS Cognito (real auth, user pools, Google OAuth, hosted UI)
// Fallback: localStorage mock (when Cognito isn't configured)

import { isCognitoConfigured, getAmplifyConfig } from './aws-config';

const AUTH_KEY = 'civicpie_auth';
const AUTH_COOKIE = 'civicpie_session';

export interface User {
  id: string;
  name: string;
  email: string;
  zipCode: string;
  ward?: string;
  stateAbbr?: string;
}

// ─── Cognito auth (real) ─────────────────────────────────────────────────────

let _amplifyAuth: any = null;

async function getCognitoAuth() {
  if (_amplifyAuth) return _amplifyAuth;
  try {
    const { Amplify } = await import('aws-amplify');
    const config = getAmplifyConfig();
    Amplify.configure(config);
    const { signIn, signUp, signOut, confirmSignUp, getCurrentUser, signInWithRedirect, fetchAuthSession } = await import('aws-amplify/auth');
    _amplifyAuth = { signIn, signUp, signOut, confirmSignUp, getCurrentUser, signInWithRedirect, fetchAuthSession, Amplify };
    return _amplifyAuth;
  } catch (e) {
    console.warn('Cognito not available:', e);
    return null;
  }
}

async function cognitoSignIn(email: string, password: string): Promise<User> {
  const auth = await getCognitoAuth();
  if (!auth) throw new Error('Auth service not available');
  const { isSignedIn, nextStep } = await auth.signIn({ username: email, password });
  if (!isSignedIn && nextStep.signInStep !== 'DONE') {
    throw new Error('Sign in requires additional verification. Check your email.');
  }
  const { userId, signInDetails } = await auth.getCurrentUser();
  return {
    id: userId,
    name: signInDetails?.loginId?.split('@')[0] || email.split('@')[0],
    email: signInDetails?.loginId || email,
    zipCode: '',
  };
}

async function cognitoSignUp(name: string, email: string, password: string, zipCode: string): Promise<User> {
  const auth = await getCognitoAuth();
  if (!auth) throw new Error('Auth service not available');
  const { isSignUpComplete, nextStep } = await auth.signUp({
    username: email,
    password,
    options: {
      userAttributes: {
        email,
        name,
        'custom:zip_code': zipCode,
      },
    },
  });
  if (!isSignUpComplete) {
    // Cognito sends a confirmation code to email
    throw new Error(
      `Account created! Check your email (${email}) for a verification code. ` +
      `Enter it to complete sign-up. (Code step: ${nextStep.signUpStep})`
    );
  }
  const user: User = { id: 'pending_confirmation', name, email, zipCode };
  persistUser(user, 'cognito_pending');
  return user;
}

async function cognitoSignInWithGoogle(): Promise<User> {
  const auth = await getCognitoAuth();
  if (!auth) throw new Error('Auth service not available');
  await auth.signInWithRedirect({ provider: 'Google' });
  throw new Error('Redirecting to Google...');
}

async function cognitoSignOut(): Promise<void> {
  const auth = await getCognitoAuth();
  if (auth) await auth.signOut();
  clearPersistedUser();
}

async function cognitoGetUser(): Promise<User | null> {
  const auth = await getCognitoAuth();
  if (!auth) return null;
  try {
    const { userId, signInDetails } = await auth.getCurrentUser();
    const session = await auth.fetchAuthSession();
    const idToken = session.tokens?.idToken?.payload as any;
    return {
      id: userId,
      name: idToken?.name || idToken?.['custom:name'] || signInDetails?.loginId?.split('@')[0] || '',
      email: idToken?.email || signInDetails?.loginId || '',
      zipCode: idToken?.['custom:zip_code'] || '',
      ward: idToken?.['custom:ward_id'] || undefined,
    };
  } catch {
    return null;
  }
}

// ─── Mock fallback ───────────────────────────────────────────────────────────

async function mockSignIn(email: string, password: string): Promise<User> {
  await new Promise(r => setTimeout(r, 600));
  if (!email || !password) throw new Error('Email and password required.');
  const users: Record<string, User & { password: string }> = JSON.parse(localStorage.getItem('civicpie_users') || '{}');
  const stored = users[email.toLowerCase()];
  if (!stored) throw new Error('No account found. Sign up first.');
  if (stored.password !== password) throw new Error('Invalid password.');
  const { password: _, ...user } = stored;
  persistUser(user, 'mock_' + Date.now());
  return user;
}

async function mockSignUp(name: string, email: string, password: string, zipCode: string): Promise<User> {
  await new Promise(r => setTimeout(r, 600));
  if (!name || !email || !password) throw new Error('All fields required.');
  const users: Record<string, User & { password: string }> = JSON.parse(localStorage.getItem('civicpie_users') || '{}');
  if (users[email.toLowerCase()]) throw new Error('Account already exists.');
  const user: User = { id: 'user_' + Date.now(), name, email: email.toLowerCase(), zipCode: zipCode || '' };
  users[email.toLowerCase()] = { ...user, password };
  localStorage.setItem('civicpie_users', JSON.stringify(users));
  persistUser(user, 'mock_' + Date.now());
  return user;
}

function mockSignOut(): void { clearPersistedUser(); }
function mockGetUser(): User | null {
  if (typeof window === 'undefined') return null;
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || '{}').user || null; }
  catch { return null; }
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function persistUser(user: User, token: string): void {
  localStorage.setItem(AUTH_KEY, JSON.stringify({ user, token }));
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=604800; SameSite=Lax`;
}

function clearPersistedUser(): void {
  localStorage.removeItem(AUTH_KEY);
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

const USE_COGNITO = isCognitoConfigured();

export function getCurrentUser(): User | null {
  return mockGetUser();
}

export function isAuthenticated(): boolean {
  return getCurrentUser() !== null;
}

export async function signIn(email: string, password: string): Promise<User> {
  return USE_COGNITO ? cognitoSignIn(email, password) : mockSignIn(email, password);
}

export async function signUp(name: string, email: string, password: string, zipCode: string): Promise<User> {
  return USE_COGNITO ? cognitoSignUp(name, email, password, zipCode) : mockSignUp(name, email, password, zipCode);
}

export function signOut(): void {
  USE_COGNITO ? cognitoSignOut() : mockSignOut();
}

export async function signInWithGoogle(): Promise<User> {
  return USE_COGNITO ? cognitoSignInWithGoogle() : mockSignIn('demo@civicpie.com', 'password');
}

export async function refreshUser(): Promise<User | null> {
  if (USE_COGNITO) {
    const user = await cognitoGetUser();
    if (user) persistUser(user, 'cognito_session');
    return user;
  }
  return mockGetUser();
}
