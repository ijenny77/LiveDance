'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Music, Radio } from 'lucide-react';

export default function StudentEntryPage() {
  const router = useRouter();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [lessonCode, setLessonCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Format phone number as: 07XX XXX XXX or similar
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, ''); // strip non-digits
    if (rawVal.length <= 12) {
      // Just set raw digits or simple format
      // Let's format nicely if it's a standard 10 digit number
      if (rawVal.length <= 10) {
        let formatted = rawVal;
        if (rawVal.length > 4) {
          formatted = `${rawVal.slice(0, 4)} ${rawVal.slice(4)}`;
        }
        if (rawVal.length > 7) {
          formatted = `${rawVal.slice(0, 4)} ${rawVal.slice(4, 7)} ${rawVal.slice(7)}`;
        }
        setPhoneNumber(formatted);
      } else {
        setPhoneNumber(rawVal);
      }
    }
  };

  const handleCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Uppercase lesson codes
    setLessonCode(e.target.value.toUpperCase().trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (cleanPhone.length < 9) {
      setError('Please enter a valid phone number');
      return;
    }
    if (!lessonCode) {
      setError('Please enter a lesson code');
      return;
    }

    setIsLoading(true);
    // Redirect to status page
    router.push(`/status?phone=${encodeURIComponent(cleanPhone)}&code=${encodeURIComponent(lessonCode)}`);
  };

  return (
    <main className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden bg-bg-base">
      {/* Dynamic UV Gradient Background Blobs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-uv-purple/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-80 h-80 rounded-full bg-uv-blue/15 blur-[120px] pointer-events-none" />
      
      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center animate-fade-in">
          <div className="flex items-center justify-center h-14 w-14 rounded-2xl bg-uv-gradient shadow-[0_0_20px_rgba(123,47,247,0.4)] mb-4">
            <Music className="h-7 w-7 text-text-primary animate-indicator-pulse" />
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-wider text-text-primary font-heading">
            LiveDance <span className="text-uv-blue font-extrabold">Academy</span>
          </h1>
          <p className="text-sm text-text-secondary mt-1 max-w-xs">
            Learn Amapiano and urban dance live with top instructors
          </p>
        </div>

        {/* Card Panel */}
        <Card className="p-8 border-glow relative overflow-hidden" glow>
          <div className="absolute top-0 left-0 w-full h-[3px] bg-uv-gradient" />
          
          <div className="flex items-center gap-2 mb-6">
            <Radio className="h-4 w-4 text-uv-purple animate-pulse" />
            <h2 className="text-lg font-bold font-heading uppercase tracking-wide text-text-primary">
              Join the session
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="e.g. 0772 123 456"
              value={phoneNumber}
              onChange={handlePhoneChange}
              required
              disabled={isLoading}
              className="font-mono"
            />
            
            <Input
              label="Lesson Code"
              type="text"
              placeholder="e.g. DANCE-101"
              value={lessonCode}
              onChange={handleCodeChange}
              required
              disabled={isLoading}
              className="font-mono tracking-widest uppercase font-bold text-center"
            />

            {error && (
              <div className="p-3.5 bg-error/10 border border-error/20 rounded-xl text-xs font-semibold text-error text-center">
                {error}
              </div>
            )}

            <Button
              type="submit"
              variant="gradient"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Enter Session
            </Button>
          </form>

          <p className="text-center text-xs text-text-disabled mt-6">
            No account needed — just your number and lesson code.
          </p>
        </Card>
      </div>
    </main>
  );
}
