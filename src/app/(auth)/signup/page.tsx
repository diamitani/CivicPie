'use client';

import { useState } from 'react';
import { signUp, signInWithGoogle } from '@/lib/auth';
import Link from 'next/link';
import { AuthCard, TextInput, FieldLabel, ErrorNotice } from '@/components/ui';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signUp(name, email, password, zipCode);
      const params = new URLSearchParams(window.location.search);
      window.location.href = params.get('redirect') || '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
      setLoading(false);
    }
  };

  return (
    <AuthCard>
      <h1 className="font-display text-2xl font-black text-navy mb-1">Create your account</h1>
      <p className="font-body text-sm text-stone mb-8">Free forever. Know your government.</p>

      {error && <ErrorNotice>{error}</ErrorNotice>}

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-[10px] border-2 border-gray-200 bg-white hover:bg-gray-50 transition-colors font-display text-sm font-semibold text-navy mb-6 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-stone-light font-body">or</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <FieldLabel>Full Name</FieldLabel>
          <TextInput type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
        </div>
        <div>
          <FieldLabel>Email Address</FieldLabel>
          <TextInput type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" />
        </div>
        <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
          <div>
            <FieldLabel>Password</FieldLabel>
            <TextInput type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters" />
          </div>
          <div>
            <FieldLabel>Zip Code</FieldLabel>
            <TextInput type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="e.g. 60614" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-red text-white font-display text-sm font-bold py-3.5 rounded-[10px] hover:bg-red-hover transition-all disabled:opacity-50 tracking-[0.3px] mt-2"
          style={{ boxShadow: 'var(--cp-shadow-red)' }}>
          {loading ? 'Creating account…' : 'Sign Up Free'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200 text-center">
        <p className="font-body text-sm text-stone">
          Already have an account?{' '}
          <Link href="/signin" className="text-red font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </AuthCard>
  );
}
