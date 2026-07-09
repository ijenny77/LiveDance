'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ToastContainer, ToastMessage } from '@/components/toast';
import { ShieldCheck, Music } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        addToast('error', error.message || 'Authentication failed');
      } else {
        addToast('success', 'Logged in successfully!');
        router.push('/admin');
      }
    } catch (err: any) {
      addToast('error', 'An unexpected error occurred during login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-bg-base">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-uv-purple/10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-uv-blue/10 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-uv-gradient shadow-[0_0_15px_rgba(123,47,247,0.3)] mb-4">
            <Music className="h-6 w-6 text-text-primary" />
          </div>
          <h1 className="text-2xl font-bold font-heading uppercase tracking-wider text-text-primary">
            LiveDance <span className="text-uv-blue font-extrabold">Console</span>
          </h1>
          <p className="text-xs text-text-secondary mt-1">
            Instructor dashboard management login
          </p>
        </div>

        <Card className="p-8 border-glow relative overflow-hidden" glow>
          <div className="absolute top-0 left-0 w-full h-[3px] bg-uv-gradient" />
          
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="h-4 w-4 text-uv-purple" />
            <h2 className="text-base font-bold font-heading uppercase tracking-wide text-text-primary">
              Admin Authentication
            </h2>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <Input
              label="Email Address"
              type="email"
              placeholder="admin@livedance.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
            />

            <Button
              type="submit"
              variant="gradient"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>
        </Card>
      </div>

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
