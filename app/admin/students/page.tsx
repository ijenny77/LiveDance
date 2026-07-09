'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Student } from '@/types';
import { ToastContainer, ToastMessage } from '@/components/toast';
import { 
  Users, 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Loader2, 
  Calendar, 
  Phone 
} from 'lucide-react';

export default function AdminStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // Form fields
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [formError, setFormError] = useState('');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'warning' | 'error', text: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setStudents((data as Student[]) || []);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to fetch students list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const cleanPhone = phoneNumber.replace(/\s+/g, '');

    if (!name.trim() || cleanPhone.length < 9) {
      setFormError('Please provide a valid name and phone number.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .insert({ name: name.trim(), phone_number: cleanPhone })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A student with this phone number is already registered.');
        }
        throw error;
      }

      setStudents(prev => [...prev, data as Student].sort((a, b) => a.name.localeCompare(b.name)));
      addToast('success', 'Student added successfully.');
      setIsAddModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to create student.');
    }
  };

  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) return;
    setFormError('');
    const cleanPhone = phoneNumber.replace(/\s+/g, '');

    if (!name.trim() || cleanPhone.length < 9) {
      setFormError('Please provide a valid name and phone number.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('students')
        .update({ name: name.trim(), phone_number: cleanPhone })
        .eq('id', selectedStudent.id)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('A student with this phone number is already registered.');
        }
        throw error;
      }

      setStudents(prev => prev.map(s => s.id === selectedStudent.id ? (data as Student) : s));
      addToast('success', 'Student updated successfully.');
      setIsEditModalOpen(false);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Failed to update student.');
    }
  };

  const handleDeleteStudent = async (id: string) => {
    if (!confirm('Are you sure you want to remove this student? This will delete all their payments and attendance records.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setStudents(prev => prev.filter(s => s.id !== id));
      addToast('success', 'Student removed successfully.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to remove student');
    }
  };

  const resetForm = () => {
    setName('');
    setPhoneNumber('');
    setFormError('');
    setSelectedStudent(null);
  };

  const openEditModal = (student: Student) => {
    setSelectedStudent(student);
    setName(student.name);
    setPhoneNumber(student.phone_number);
    setIsEditModalOpen(true);
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.phone_number.includes(searchQuery)
  );

  return (
    <div className="flex-grow p-6 md:p-10 space-y-8 max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold uppercase font-heading text-text-primary tracking-wide">
            Student Registry
          </h1>
          <p className="text-sm text-text-secondary">
            Manage dancer details, phone lists, and registration records.
          </p>
        </div>
        
        <Button 
          variant="gradient" 
          className="h-10 text-xs font-semibold py-0 flex items-center gap-2"
          onClick={() => { resetForm(); setIsAddModalOpen(true); }}
        >
          <Plus className="h-4 w-4" /> Add Student
        </Button>
      </div>

      {/* Controls & Search */}
      <div className="flex items-center w-full max-w-md bg-bg-elevated border border-border rounded-xl px-3 py-1.5 focus-within:border-uv-purple/50 transition-colors">
        <Search className="h-4 w-4 text-text-disabled mr-2.5" />
        <input 
          type="text" 
          placeholder="Search by name or phone..." 
          className="bg-transparent border-none outline-none text-sm text-text-primary w-full placeholder:text-text-disabled"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="cursor-pointer">
            <X className="h-4 w-4 text-text-disabled hover:text-text-primary" />
          </button>
        )}
      </div>

      {/* Student List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Loader2 className="h-8 w-8 text-uv-purple animate-spin mb-4" />
          <p className="text-text-secondary text-sm font-semibold uppercase tracking-wider font-heading">
            Fetching registries...
          </p>
        </div>
      ) : filteredStudents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student) => (
            <Card key={student.id} className="border-border p-6 flex flex-col justify-between" glow={false}>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 bg-uv-purple/10 border border-uv-purple/20 rounded-xl flex items-center justify-center">
                    <span className="font-heading font-bold text-uv-purple text-sm uppercase">
                      {student.name.substring(0, 2)}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-bold text-text-primary text-sm line-clamp-1">{student.name}</h3>
                    <div className="flex items-center gap-1 text-xs text-text-secondary mt-0.5">
                      <Phone className="h-3 w-3" />
                      <span>{student.phone_number}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-text-disabled pt-3 border-t border-border">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Registered: {new Date(student.date_registered).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 mt-5">
                <Button 
                  variant="outline" 
                  className="p-2 h-9 w-9" 
                  onClick={() => openEditModal(student)}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button 
                  variant="error" 
                  className="p-2 h-9 w-9 bg-error/10 hover:bg-error/20" 
                  onClick={() => handleDeleteStudent(student.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center text-text-secondary border border-dashed border-border rounded-2xl bg-bg-elevated/20">
          <Users className="h-12 w-12 text-text-disabled mb-3" />
          <p className="font-heading uppercase tracking-wider text-sm font-semibold">No students registered</p>
          <p className="text-xs text-text-disabled mt-1 max-w-xs">
            {searchQuery ? 'No match found for your search query.' : 'Add your first dancer to start running lessons.'}
          </p>
        </div>
      )}

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 border-border relative" glow>
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 text-text-disabled hover:text-text-primary cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold font-heading uppercase tracking-wide text-text-primary mb-6">
              Add New Dancer
            </h2>

            <form onSubmit={handleAddStudent} className="space-y-5">
              <Input 
                label="Full Name"
                type="text"
                placeholder="e.g. John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input 
                label="Phone Number"
                type="tel"
                placeholder="e.g. 0772123456"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />

              {formError && (
                <div className="text-xs text-error font-semibold bg-error/10 border border-error/20 p-3 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-4 py-2"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="px-5 py-2">
                  Create Account
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-8 border-border relative" glow>
            <button 
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 text-text-disabled hover:text-text-primary cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h2 className="text-xl font-bold font-heading uppercase tracking-wide text-text-primary mb-6">
              Edit Dancer Profile
            </h2>

            <form onSubmit={handleEditStudent} className="space-y-5">
              <Input 
                label="Full Name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />

              <Input 
                label="Phone Number"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
              />

              {formError && (
                <div className="text-xs text-error font-semibold bg-error/10 border border-error/20 p-3 rounded-xl">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="px-4 py-2"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="gradient" className="px-5 py-2">
                  Save Changes
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}
