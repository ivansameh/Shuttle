import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { api } from '../lib/axios';
import { Bus, Eye, EyeOff, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
  const [email, setEmail]         = useState('');
  const [password, setPassword]   = useState('');
  const [showPwd, setShowPwd]     = useState(false);
  const [error, setError]         = useState('');
  const [loading, setLoading]     = useState(false);

  const login    = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password }) as any;
      const { user: userData, token } = res.data;
      login(userData, token);

      // Role-based redirection after login
      switch (userData.role) {
        case 'DRIVER':
          navigate('/driver/schedule');
          break;
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'RIDER':
        default:
          navigate('/rider/home');
          break;
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface">
      {/* Brand Panel (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-900 relative overflow-hidden flex-col justify-between p-16">
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 rounded-2xl mb-8 backdrop-blur-md border border-white/20">
            <Bus className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-5xl font-black text-white leading-tight mb-6">
            The smartest way<br/>to your destination.
          </h2>
          <p className="text-primary-100 text-lg max-w-md">
            Join thousands of riders experiencing comfortable, stress-free daily commutes with Shuttle.
          </p>
        </div>
        
        {/* Decorative graphic patterns */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary-800 rounded-full blur-3xl opacity-50 translate-x-1/2 -translate-y-1/4" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary-950 rounded-full blur-3xl opacity-50 -translate-x-1/4 translate-y-1/4" />
        
        <div className="relative z-10">
          <p className="text-primary-200 text-sm font-medium">© {new Date().getFullYear()} Shuttle. All rights reserved.</p>
        </div>
      </div>

      {/* Form Panel */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-6 sm:px-12 relative">
        <div className="w-full max-w-sm mx-auto animate-slide-up">
          {/* Header */}
          <div className="mb-10">
            <div className="lg:hidden inline-flex items-center justify-center w-14 h-14 bg-primary-600 rounded-2xl mb-6 shadow-lg shadow-primary-500/30">
              <Bus className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-black text-foreground tracking-tight mb-2">Welcome back.</h1>
            <p className="text-muted">Sign in to continue your journey.</p>
          </div>

          <div className="space-y-6">
          {error && (
            <div className="bg-error/10 border border-error/30 text-error text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                label="Email Address"
                required
              />
            </div>

            <div>
              <Input
                id="login-password"
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                label="Password"
                required
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="text-muted hover:text-foreground transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                }
              />
            </div>
            <Button
              id="login-submit"
              type="submit"
              disabled={loading}
              isLoading={loading}
              fullWidth
              size="lg"
              className="mt-2"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </form>

          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-muted text-xs">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <p className="text-center text-sm text-muted">
            New to Shuttle?{' '}
            <Link to="/register" className="text-primary-600 font-bold hover:text-primary-700 transition-colors">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  </div>
);
}
