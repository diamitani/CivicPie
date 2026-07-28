// ─── CivicPie Auth Utility ──────────────────────────────────────────────────
// Mock localStorage-based auth. Swap for Supabase when ready.

const AUTH_KEY = 'civicpie_auth';
const AUTH_COOKIE = 'civicpie_session';

export interface User {
  id: string;
  name: string;
  email: string;
  zipCode: string;
  ward?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
}

function getAuth(): AuthState {
  if (typeof window === 'undefined') return { user: null, token: null };
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { user: null, token: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { user: null, token: null };
  }
}

function setAuth(user: User, token: string): void {
  const state: AuthState = { user, token };
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));
  document.cookie = `${AUTH_COOKIE}=${token}; path=/; max-age=86400; SameSite=Lax`;
}

export function getCurrentUser(): User | null {
  return getAuth().user;
}

export function isAuthenticated(): boolean {
  return !!getAuth().token;
}

export function getAuthToken(): string | null {
  return getAuth().token;
}

export async function signIn(
  email: string,
  password: string,
): Promise<User> {
  await new Promise((r) => setTimeout(r, 800));

  if (!email || !password) throw new Error('Email and password are required.');
  if (password.length < 6) throw new Error('Invalid credentials.');

  const users: Record<string, User & { password: string }> = JSON.parse(
    localStorage.getItem('civicpie_users') || '{}',
  );

  const stored = users[email.toLowerCase()];
  if (!stored) throw new Error('No account found with this email.');
  if (stored.password !== password) throw new Error('Invalid password.');

  const token = 'mock_token_' + Date.now();
  const { password: _, ...user } = stored;
  setAuth(user, token);
  return user;
}

export async function signUp(data: {
  name: string;
  email: string;
  password: string;
  zipCode: string;
}): Promise<User> {
  await new Promise((r) => setTimeout(r, 800));

  if (!data.name || !data.email || !data.password || !data.zipCode) {
    throw new Error('All fields are required.');
  }
  if (data.password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }
  if (!/^\d{5}(-\d{4})?$/.test(data.zipCode)) {
    throw new Error('Please enter a valid ZIP code.');
  }

  const users: Record<string, User & { password: string }> = JSON.parse(
    localStorage.getItem('civicpie_users') || '{}',
  );

  const key = data.email.toLowerCase();
  if (users[key]) throw new Error('An account with this email already exists.');

  const user: User = {
    id: 'user_' + Date.now(),
    name: data.name,
    email: key,
    zipCode: data.zipCode,
  };

  users[key] = { ...user, password: data.password };
  localStorage.setItem('civicpie_users', JSON.stringify(users));

  const token = 'mock_token_' + Date.now();
  setAuth(user, token);
  return user;
}

export function signOut(): void {
  localStorage.removeItem(AUTH_KEY);
  if (typeof document !== 'undefined') {
    document.cookie = `${AUTH_COOKIE}=; path=/; max-age=0`;
  }
}

export async function signInWithGoogle(): Promise<User> {
  await new Promise((r) => setTimeout(r, 600));

  const user: User = {
    id: 'google_user_' + Date.now(),
    name: 'Demo User',
    email: 'demo@civicpie.com',
    zipCode: '60640',
    ward: '48',
  };

  const token = 'mock_google_token_' + Date.now();
  setAuth(user, token);
  return user;
}
