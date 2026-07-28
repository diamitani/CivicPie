'use client';

import { useState } from 'react';
import { PieLogo } from '@/components/Logo';
import { signIn } from '@/lib/auth';
import Link from 'next/link';

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
      signIn(email, password);
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[20px] border border-[#E8E8E6] p-10 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <PieLogo size={28} />
        <div>
          <div className="font-display text-2xl font-black tracking-[-0.5px] text-navy leading-none">
            Civic<span className="text-[#C41230]">Pie</span>
          </div>
          <div className="font-display text-[7px] font-bold tracking-[2px] uppercase text-stone mt-0.5">Hyperlocal Civic Engagement</div>
        </div>
      </div>

      <h1 className="font-display text-2xl font-black text-navy mb-1">Welcome back</h1>
      <p className="font-body text-sm text-stone mb-8">Sign in to your CivicPie account</p>

      {error && (
        <div className="bg-[rgba(196,18,48,0.06)] border border-[rgba(196,18,48,0.2)] rounded-lg p-3 mb-6 text-sm text-[#C41230] font-medium">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block font-display text-xs font-bold text-navy tracking-[0.5px] mb-2">Email Address</label>
          <input
            type="email" required value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full font-body text-sm text-navy bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-navy focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]"
          />
        </div>
        <div>
          <label className="block font-display text-xs font-bold text-navy tracking-[0.5px] mb-2">Password</label>
          <input
            type="password" required value={password} onChange={e => setPassword(e.target.value)}
            placeholder="Enter your password"
            className="w-full font-body text-sm text-navy bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-navy focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]"
          />
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-[#C41230] text-white font-display text-sm font-bold py-3.5 rounded-[10px] hover:bg-[#E8243E] transition-all shadow-[0_4px_14px_rgba(196,18,48,0.35)] disabled:opacity-50 tracking-[0.3px]">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#E8E8E6] text-center">
        <p className="font-body text-sm text-stone">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#C41230] font-semibold hover:underline">Sign up free</Link>
        </p>
      </div>
    </div>
  );
}
