'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import AdminNavbar from '@/components/admin-navbar';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const isLoginPath = pathname === '/admin/login';
      
      if (!session) {
        setAuthenticated(false);
        if (!isLoginPath) {
          router.push('/admin/login');
        } else {
          setLoading(false);
        }
      } else {
        setAuthenticated(true);
        if (isLoginPath) {
          router.push('/admin');
        } else {
          setLoading(false);
        }
      }
    };

    checkAuth();

    // Subscribe to auth state updates
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const isLoginPath = pathname === '/admin/login';
      if (!session) {
        setAuthenticated(false);
        if (!isLoginPath) router.push('/admin/login');
      } else {
        setAuthenticated(true);
        if (isLoginPath) router.push('/admin');
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-bg-base">
        <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
        <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
          Checking admin session...
        </p>
      </div>
    );
  }

  const isLoginPath = pathname === '/admin/login';

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      {!isLoginPath && authenticated && <AdminNavbar />}
      <main className="flex-1 w-full flex flex-col">
        {children}
      </main>
    </div>
  );
}
