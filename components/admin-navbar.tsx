'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  CreditCard, 
  History, 
  LogOut, 
  Music 
} from 'lucide-react';

export default function AdminNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { label: 'Students', path: '/admin/students', icon: Users },
    { label: 'Lessons', path: '/admin/lessons', icon: BookOpen },
    { label: 'Payments', path: '/admin/payments', icon: CreditCard },
    { label: 'Attendance', path: '/admin/attendance', icon: History },
  ];

  return (
    <nav className="w-full bg-bg-elevated border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-40">
      {/* Brand */}
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-uv-gradient">
          <Music className="h-4.5 w-4.5 text-text-primary" />
        </div>
        <Link href="/admin" className="font-heading font-bold text-sm tracking-wider uppercase text-text-primary">
          LiveDance <span className="text-uv-blue font-extrabold">Console</span>
        </Link>
      </div>

      {/* Nav Links */}
      <div className="hidden md:flex items-center gap-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.path;
          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-heading font-semibold uppercase tracking-wider transition-all duration-200 ${
                isActive 
                  ? 'bg-uv-purple/10 text-uv-purple border border-uv-purple/20' 
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated-2 border border-transparent'
              }`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </div>

      {/* Sign Out */}
      <button
        onClick={handleSignOut}
        className="flex items-center gap-2 text-text-secondary hover:text-error transition-colors px-3 py-2 rounded-xl hover:bg-error/5 text-xs font-semibold uppercase tracking-wider font-heading cursor-pointer"
      >
        <LogOut className="h-4 w-4" />
        <span className="hidden sm:inline">Sign Out</span>
      </button>
    </nav>
  );
}
