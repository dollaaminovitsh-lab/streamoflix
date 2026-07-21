import React, { useState } from 'react';
import { Film, Lock, Mail, Sparkles, Loader2 } from 'lucide-react';
import { User } from '../types';

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }

    setLoading(true);
    const endpoint = isSignUp ? '/api/auth/signup' : '/api/auth/signin';

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed. Please check credentials.');
      }

      onAuthSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-60px)] flex items-center justify-center bg-[#050505] px-4 overflow-hidden">
      {/* Dynamic Background Backdrop Pattern */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[120px]" />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-purple-600/15 rounded-full blur-[80px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#0c0c0e] border border-white/10 rounded-2xl p-8 shadow-2xl shadow-black/80">
          {/* Logo Heading */}
          <div className="flex flex-col items-center gap-2 mb-8">
            <div className="bg-indigo-600 p-3 rounded-xl text-white shadow-xl shadow-indigo-600/20">
              <Film className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-2">
              Streamo<span className="text-indigo-500">Flix</span>
            </h1>
            <p className="text-xs text-white/50">
              {isSignUp ? 'Create your account to unlock unlimited cinema' : 'Welcome back to streaming paradise'}
            </p>
          </div>

          {/* Form container */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs py-3 px-4 rounded-lg">
                {error}
              </div>
            )}

            {/* Email input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Password input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold tracking-wider text-white/40 uppercase">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>
            </div>

            {/* Premium highlight message for Sign Up */}
            {isSignUp && (
              <div className="bg-amber-400/5 border border-amber-400/10 rounded-xl p-3 flex gap-3 text-amber-300">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="text-[10px] leading-relaxed">
                  Join today! After account creation, simply complete the monthly plan subscription to start playing instantly.
                </span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isSignUp ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Sign in / Sign up Toggle */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError('');
              }}
              className="text-xs text-white/40 hover:text-white transition-colors underline underline-offset-4"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up Now"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
