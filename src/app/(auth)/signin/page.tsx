'use client';

import { useState } from 'react';
import { signIn } from '@/lib/auth';
import Link from 'next/link';
import { AuthCard, TextInput, FieldLabel, ErrorNotice } from '@/components/ui';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('redirect') || '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <h1 className="font-display text-2xl font-black text-navy mb-1">Welcome back</h1>
      <p className="font-body text-sm text-stone mb-8">Sign in to your CivicPie account</p>

      {error && <ErrorNotice>{error}</ErrorNotice>}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <FieldLabel>Email Address</FieldLabel>
          <TextInput
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
        </div>
        <div>
          <FieldLabel>Password</FieldLabel>
          <TextInput
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
          />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-red text-white font-display text-sm font-bold py-3.5 rounded-[10px] hover:bg-red-hover transition-all disabled:opacity-50 tracking-[0.3px]"
          style={{ boxShadow: 'var(--cp-shadow-red)' }}>
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="font-body text-sm text-stone">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-red font-semibold hover:underline">Sign up free</Link>
        </p>
      </div>
    </AuthCard>
  );
}
