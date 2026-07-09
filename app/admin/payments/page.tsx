'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ToastContainer, ToastMessage } from '@/components/toast';
import { CreditCard, Check, X, Loader2, Search, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

interface PaymentJoin {
  id: string;
  student_id: string;
  lesson_id: string;
  status: 'pending' | 'approved' | 'rejected';
  paid_at: string | null;
  student: {
    name: string;
    phone_number: string;
  };
  lesson: {
    title: string;
    price: number;
    date: string;
  };
}

export default function AdminPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<PaymentJoin[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      // Fetch payments with student and lesson details
      const { data, error } = await supabase
        .from('payments')
        .select(`
          id,
          student_id,
          lesson_id,
          status,
          paid_at,
          student:students (name, phone_number),
          lesson:lessons (title, price, date)
        `)
        .order('paid_at', { ascending: false });

      if (error) throw error;
      setPayments((data as any[]) || []);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to fetch payment queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();

    // Subscribe to realtime payment status changes
    const channel = supabase
      .channel('admin-payments-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, () => {
        fetchPayments();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'approved',
          paid_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      
      addToast('success', 'Payment approved successfully.');
      // Local state update
      setPayments(prev => 
        prev.map(p => p.id === id ? { ...p, status: 'approved', paid_at: new Date().toISOString() } : p)
      );
    } catch (err: any) {
      addToast('error', err.message || 'Failed to approve payment');
    }
  };

  const handleReject = async (id: string) => {
    try {
      const { error } = await supabase
        .from('payments')
        .update({
          status: 'rejected',
          paid_at: null
        })
        .eq('id', id);

      if (error) throw error;
      
      addToast('warning', 'Payment registration request rejected.');
      setPayments(prev => 
        prev.map(p => p.id === id ? { ...p, status: 'rejected', paid_at: null } : p)
      );
    } catch (err: any) {
      addToast('error', err.message || 'Failed to reject payment');
    }
  };

  const pendingPayments = payments.filter(p => p.status === 'pending');
  const historyPayments = payments.filter(p => p.status !== 'pending');

  const activePayments = activeTab === 'pending' ? pendingPayments : historyPayments;

  const filteredPayments = activePayments.filter(p => 
    p.student?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.student?.phone_number.includes(searchQuery) ||
    p.lesson?.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-grow p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold uppercase font-heading text-text-primary tracking-wide">
            Payment Approval
          </h1>
          <p className="text-sm text-text-secondary">
            Process pending Mobile Money admissions and trace history logs.
          </p>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-border pb-4">
        {/* Toggle buttons */}
        <div className="flex gap-2 bg-bg-elevated p-1 rounded-xl border border-border">
          <button
            onClick={() => { setActiveTab('pending'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-uv-purple text-text-primary shadow-[0_0_10px_rgba(123,47,247,0.3)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Pending Queue ({pendingPayments.length})
          </button>
          <button
            onClick={() => { setActiveTab('history'); setSearchQuery(''); }}
            className={`px-4 py-2 rounded-lg text-xs font-heading font-semibold uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-uv-purple text-text-primary shadow-[0_0_10px_rgba(123,47,247,0.3)]'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            History Log ({historyPayments.length})
          </button>
        </div>

        {/* Search */}
        <div className="flex items-center w-full sm:max-w-xs bg-bg-elevated border border-border rounded-xl px-3 py-1.5 focus-within:border-uv-purple/50 transition-colors">
          <Search className="h-4 w-4 text-text-disabled mr-2" />
          <input 
            type="text" 
            placeholder="Search student or lesson..." 
            className="bg-transparent border-none outline-none text-xs text-text-primary w-full placeholder:text-text-disabled"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* List Queue */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
          <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
            Fetching payment records...
          </p>
        </div>
      ) : filteredPayments.length > 0 ? (
        <div className="space-y-4">
          {filteredPayments.map((payment) => (
            <Card key={payment.id} className="border-border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4" glow={false}>
              
              {/* Payment Details */}
              <div className="flex-grow flex flex-col sm:flex-row sm:items-center gap-4">
                <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${
                  payment.status === 'approved' 
                    ? 'bg-success/10 border-success/20 text-success' 
                    : payment.status === 'rejected'
                    ? 'bg-error/10 border-error/20 text-error'
                    : 'bg-warning/10 border-warning/20 text-warning animate-pulse'
                }`}>
                  <CreditCard className="h-5 w-5" />
                </div>

                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-text-primary text-sm">
                      {payment.student?.name || 'Unknown Student'}
                    </h3>
                    <span className="font-mono text-xs text-text-secondary bg-bg-elevated-2 px-2 py-0.5 rounded border border-border">
                      {payment.student?.phone_number}
                    </span>
                  </div>
                  
                  <p className="text-xs text-text-secondary">
                    Lesson: <span className="text-text-primary font-medium">{payment.lesson?.title || 'Unknown Lesson'}</span>
                  </p>

                  <div className="flex items-center gap-1.5 text-[10px] text-text-disabled font-medium">
                    <Clock className="h-3 w-3" />
                    <span>Lesson date: {payment.lesson?.date}</span>
                    {payment.paid_at && (
                      <>
                        <span>•</span>
                        <span>Approved: {new Date(payment.paid_at).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Price and Action Section */}
              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-border">
                {/* Price Display */}
                <div className="text-right">
                  <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Fee amount</p>
                  <p className="text-lg font-bold text-success font-mono">
                    ${Number(payment.lesson?.price || 0).toFixed(2)}
                  </p>
                </div>

                {/* Status/Action Button */}
                <div className="flex gap-2">
                  {payment.status === 'pending' ? (
                    <>
                      <Button 
                        variant="success"
                        className="h-9 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold font-heading"
                        onClick={() => handleApprove(payment.id)}
                      >
                        <Check className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button 
                        variant="error" 
                        className="h-9 px-3 bg-error/10 hover:bg-error/20 flex items-center justify-center gap-1.5 text-xs font-semibold font-heading"
                        onClick={() => handleReject(payment.id)}
                      >
                        <X className="h-3.5 w-3.5" /> Reject
                      </Button>
                    </>
                  ) : (
                    <span className={`px-3.5 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider font-heading flex items-center gap-1.5 ${
                      payment.status === 'approved'
                        ? 'bg-success/10 border-success/30 text-success'
                        : 'bg-error/10 border-error/30 text-error'
                    }`}>
                      {payment.status === 'approved' ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                      {payment.status}
                    </span>
                  )}
                </div>
              </div>

            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary border border-dashed border-border rounded-2xl bg-bg-elevated/20">
          <CreditCard className="h-12 w-12 text-text-disabled mb-3" />
          <p className="font-heading uppercase tracking-wider text-sm font-semibold">
            {activeTab === 'pending' ? 'Payments queue empty' : 'No history logged'}
          </p>
          <p className="text-xs text-text-disabled mt-1 max-w-xs">
            {searchQuery ? 'No match found for your search query.' : (
              activeTab === 'pending' 
                ? 'No students are currently waiting for payment approval.' 
                : 'Transactions will show here after being processed.'
            )}
          </p>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
