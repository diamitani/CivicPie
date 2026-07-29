'use client';

import { useState } from 'react';
import { signUp, signInWithGoogle } from '@/lib/auth';
import { PieLogo } from '@/components/Logo';
import Link from 'next/link';

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
      window.location.href = '/dashboard';
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
    <div className="bg-white rounded-[20px] border border-[#E8E8E6] p-10 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <PieLogo size={28} />
        <div>
          <div className="font-display text-2xl font-black tracking-[-0.5px] text-[#001B3D] leading-none">
            Civic<span className="text-[#C41230]">Pie</span>
          </div>
          <div className="font-display text-[7px] font-bold tracking-[2px] uppercase text-[#6B7280] mt-0.5">Hyperlocal Civic Engagement</div>
        </div>
      </div>

      <h1 className="font-display text-2xl font-black text-[#001B3D] mb-1">Create your account</h1>
      <p className="font-body text-sm text-[#6B7280] mb-8">Free forever. Know your government.</p>

      {error && (
        <div className="bg-[rgba(196,18,48,0.06)] border border-[rgba(196,18,48,0.2)] rounded-lg p-3 mb-6 text-sm text-[#C41230] font-medium">{error}</div>
      )}

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3 rounded-[10px] border-2 border-[#E8E8E6] bg-white hover:bg-[#FAFAF8] transition-colors font-display text-sm font-semibold text-[#001B3D] mb-6 disabled:opacity-50"
      >
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Continue with Google
      </button>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 h-px bg-[#E8E8E6]" />
        <span className="text-xs text-[#9BA3AF] font-body">or</span>
        <div className="flex-1 h-px bg-[#E8E8E6]" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-display text-xs font-bold text-[#001B3D] tracking-[0.5px] mb-2">Full Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full font-body text-sm text-[#001B3D] bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-[#001B3D] focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]" />
        </div>
        <div>
          <label className="block font-display text-xs font-bold text-[#001B3D] tracking-[0.5px] mb-2">Email Address</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
            className="w-full font-body text-sm text-[#001B3D] bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-[#001B3D] focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-display text-xs font-bold text-[#001B3D] tracking-[0.5px] mb-2">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 6 characters"
              className="w-full font-body text-sm text-[#001B3D] bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-[#001B3D] focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]" />
          </div>
          <div>
            <label className="block font-display text-xs font-bold text-[#001B3D] tracking-[0.5px] mb-2">Zip Code</label>
            <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="e.g. 60614"
              className="w-full font-body text-sm text-[#001B3D] bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-[#001B3D] focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-[#C41230] text-white font-display text-sm font-bold py-3.5 rounded-[10px] hover:bg-[#E8243E] transition-all shadow-[0_4px_14px_rgba(196,18,48,0.35)] disabled:opacity-50 tracking-[0.3px] mt-2">
          {loading ? 'Creating account…' : 'Sign Up Free'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#E8E8E6] text-center">
        <p className="font-body text-sm text-[#6B7280]">
          Already have an account?{' '}
          <Link href="/signin" className="text-[#C41230] font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
