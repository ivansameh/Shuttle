import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { useAuthStore } from '../store/authStore';
import {
  User, Mail, Phone, Shield, Save, Loader2,
  CheckCircle2, AlertCircle, ArrowLeft, Camera
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
}

export default function Settings() {
  const navigate = useNavigate();
  const { user: authUser, login } = useAuthStore();
  
  // Local form state
  const [name, setName]     = useState('');
  const [email, setEmail]   = useState('');
  const [phone, setPhone]   = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch full profile (includes phone which may not be in auth token)
  const { data: profile, isLoading } = useQuery<UserProfile>({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/rider/profile') as any;
      return res.data;
    },
  });

  // Sync profile to form states
  useEffect(() => {
    if (profile) {
      setName(profile.name);
      setEmail(profile.email);
      setPhone(profile.phone || '');
    }
  }, [profile]);

  // Update mutation
  const { mutate: update, isPending, error } = useMutation({
    mutationFn: async (data: Partial<UserProfile>) => {
      const res = await api.patch('/rider/profile', data) as any;
      return res.data;
    },
    onSuccess: (response: any) => {
      // Update local auth store so the name in the header updates immediately
      // response is { success, data, error } because mutationFn returns res.data
      if (response.success) {
        login(response.data, useAuthStore.getState().token!); 
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update({ name, email, phone: phone || null });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-muted hover:text-foreground hover:bg-gray-50 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-black text-foreground">Profile Settings</h1>
        <div className="w-10 h-10" /> {/* Spacer */}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Profile Pic Placeholder */}
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="relative group">
            <div className="w-24 h-24 bg-primary-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-primary-500/20 group-hover:scale-105 transition-transform duration-300">
              {name.split(' ').map(n => n[0]).slice(0, 2).join('') || '?'}
            </div>
            <button
              type="button"
              className="absolute -bottom-2 -right-2 w-9 h-9 bg-surface border border-border rounded-xl flex items-center justify-center text-muted hover:text-primary-400 shadow-lg transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <div className="text-center">
            <p className="text-foreground font-bold text-lg">{name || 'Your Name'}</p>
            <p className="text-muted text-xs uppercase tracking-widest font-bold">{profile?.role}</p>
          </div>
        </div>

        {/* Form Sections */}
        <div className="space-y-4">
          {/* General Info */}
          <Card padding="lg" className="space-y-6">
            <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
              <User className="w-4 h-4 text-primary-400" />
              General Information
            </h2>

              <div>
                <Input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Enter your full name"
                  label="Full Name"
                  leftIcon={<User className="w-4 h-4 text-muted" />}
                  required
                />
              </div>

              <div>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  label="Email Address"
                  leftIcon={<Mail className="w-4 h-4 text-muted" />}
                  required
                />
              </div>

              <div>
                <Input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+20 123 456 7890"
                  label="Phone Number"
                  leftIcon={<Phone className="w-4 h-4 text-muted" />}
                />
              </div>
          </Card>

          {/* Security (Read Only for now) */}
          <Card padding="md" className="space-y-5 bg-gray-50 border-dashed border-border/60">
            <h2 className="text-sm font-bold text-muted uppercase tracking-widest flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Security
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-foreground font-semibold text-sm">Account Password</p>
                <p className="text-muted text-xs">Update your secure password</p>
              </div>
              <button disabled type="button" className="text-primary-600 text-xs font-bold hover:underline opacity-50">
                Change Password
              </button>
            </div>
          </Card>
        </div>

        {/* Feedback Messages */}
        {success && (
          <div className="flex items-center gap-2 text-success text-sm font-medium bg-success/10 border border-success/30 rounded-xl px-4 py-3 animate-slide-up">
            <CheckCircle2 className="w-4 h-4" />
            Profile updated successfully!
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-error text-sm font-medium bg-error/10 border border-error/30 rounded-xl px-4 py-3 animate-slide-up">
            <AlertCircle className="w-4 h-4" />
            {error.message || 'Failed to update profile. Please try again.'}
          </div>
        )}

        {/* CTA */}
        <Button
          type="submit"
          disabled={isPending}
          isLoading={isPending}
          fullWidth
          size="lg"
          leftIcon={!isPending && <Save className="w-5 h-5" />}
        >
          {isPending ? 'Saving Changes…' : 'Save Changes'}
        </Button>
      </form>

      {/* Logout button for extra convenience */}
      <div className="pt-6 text-center">
        <button
          onClick={() => { useAuthStore.getState().logout(); navigate('/login'); }}
          className="text-muted hover:text-error text-sm font-bold uppercase tracking-widest transition-colors"
        >
          Log out of account
        </button>
      </div>
    </div>
  );
}
