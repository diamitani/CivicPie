'use client';

import { useState } from 'react';
import { signUp } from '@/lib/auth';
import Link from 'next/link';
import { Landmark } from 'lucide-react';

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
      await signUp({ name, email, password, zipCode });
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Sign up failed');
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-[20px] border border-[#E8E8E6] p-10 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E8A030] to-[#F5BE6A] flex items-center justify-center">
          <Landmark className="w-4 h-4 text-[#001B3D]" />
        </div>
        <div>
          <div className="font-display text-2xl font-black tracking-[-0.5px] text-navy leading-none">
            Civic<span className="text-[#C41230]">Pie</span>
          </div>
          <div className="font-display text-[7px] font-bold tracking-[2px] uppercase text-stone mt-0.5">Hyperlocal Civic Engagement</div>
        </div>
      </div>

      <h1 className="font-display text-2xl font-black text-navy mb-1">Create your account</h1>
      <p className="font-body text-sm text-stone mb-8">Free forever. Know your government.</p>

      {error && (
        <div className="bg-[rgba(196,18,48,0.06)] border border-[rgba(196,18,48,0.2)] rounded-lg p-3 mb-6 text-sm text-[#C41230] font-medium">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-display text-xs font-bold text-navy tracking-[0.5px] mb-2">Full Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} placeholder="Your name"
            className="w-full font-body text-sm text-navy bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-navy focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]" />
        </div>
        <div>
          <label className="block font-display text-xs font-bold text-navy tracking-[0.5px] mb-2">Email Address</label>
          <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
            className="w-full font-body text-sm text-navy bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-navy focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-display text-xs font-bold text-navy tracking-[0.5px] mb-2">Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 characters"
              className="w-full font-body text-sm text-navy bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-navy focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]" />
          </div>
          <div>
            <label className="block font-display text-xs font-bold text-navy tracking-[0.5px] mb-2">Zip Code</label>
            <input type="text" value={zipCode} onChange={e => setZipCode(e.target.value)} placeholder="e.g. 60614"
              className="w-full font-body text-sm text-navy bg-white border-[1.5px] border-[#E8E8E6] rounded-lg px-4 py-3 outline-none focus:border-navy focus:shadow-[0_0_0_3px_rgba(0,27,61,0.08)] transition-all placeholder:text-[#9BA3AF]" />
          </div>
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-[#C41230] text-white font-display text-sm font-bold py-3.5 rounded-[10px] hover:bg-[#E8243E] transition-all shadow-[0_4px_14px_rgba(196,18,48,0.35)] disabled:opacity-50 tracking-[0.3px] mt-2">
          {loading ? 'Creating account…' : 'Sign Up Free'}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-[#E8E8E6] text-center">
        <p className="font-body text-sm text-stone">
          Already have an account?{' '}
          <Link href="/signin" className="text-[#C41230] font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
