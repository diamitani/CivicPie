'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  Landmark, MapPin, Building2, Globe, Shield, Menu, X, ExternalLink, Search,
} from 'lucide-react';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const districtNav = [
    { label: 'Wards', href: '/ward/chicago-48', icon: MapPin, badge: 'Chicago' },
    { label: 'Cities', href: '/city/chicago', icon: Building2, badge: '50 cities' },
    { label: 'Counties', href: '/county/cook', icon: Shield, badge: '3,143' },
    { label: 'States', href: '/state/illinois', icon: Globe, badge: '50 states' },
    { label: 'Federal', href: '/federal/us', icon: Landmark, badge: 'National' },
  ];

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#001B3D] text-white flex flex-col
          transform transition-transform duration-250 ease-out
          lg:translate-x-0 lg:static lg:z-auto
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#E8A030] to-[#F5BE6A] flex items-center justify-center">
              <Landmark className="w-4 h-4 text-[#001B3D]" />
            </div>
            <span className="font-display font-bold text-lg tracking-tight">
              <span className="text-white">Civic</span>
              <span className="text-[#E8A030]">Pie</span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1.5 rounded-md hover:bg-white/[0.08]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[3px] text-white/30">
            Explore Districts
          </p>
          <div className="space-y-0.5">
            {districtNav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-[#C41230]/15 text-[#E8A030] border-l-[3px] border-[#C41230] pl-[10px]'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.06] border-l-[3px] border-transparent pl-[10px]'
                  }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#C41230]' : 'text-white/30 group-hover:text-white/60'}`} />
                  <span className="flex-1">{item.label}</span>
                  {item.badge && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E8A030]/15 text-[#E8A030] font-semibold whitespace-nowrap">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          <div className="mt-6 space-y-1">
            <Link href="/dashboard" onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                pathname === '/dashboard'
                  ? 'bg-[#C41230]/15 text-[#E8A030]'
                  : 'text-white/60 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <Landmark className="w-4 h-4 flex-shrink-0" />
              Dashboard
            </Link>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-4 border-t border-white/[0.08]">
          <Link href="/" className="block px-2 py-1 text-xs text-white/35 hover:text-white/60 transition-colors">
            ← CivicPie Home
          </Link>
          <p className="px-2 pt-3 text-[10px] text-white/20">CivicPie — Local info. Real impact.</p>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b border-[#E8E8E6] bg-white flex items-center px-4 lg:px-8 gap-4 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 rounded-md hover:bg-[#F4F4F2]">
            <Menu className="w-5 h-5 text-[#001B3D]" />
          </button>
          <Link href="/" className="flex items-center gap-2 lg:hidden">
            <div className="w-7 h-7 rounded-md bg-gradient-to-br from-[#E8A030] to-[#F5BE6A] flex items-center justify-center">
              <Landmark className="w-3.5 h-3.5 text-[#001B3D]" />
            </div>
            <span className="font-display font-bold text-sm tracking-tight">
              <span className="text-[#001B3D]">Civic</span>
              <span className="text-[#C41230]">Pie</span>
            </span>
          </Link>
          <div className="flex-1" />
          <Link href="/" className="text-sm text-[#6B7280] hover:text-[#001B3D] transition-colors hidden sm:inline-flex items-center gap-1">
            <Search className="w-4 h-4" /> Find my district
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
