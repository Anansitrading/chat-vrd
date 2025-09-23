import React, { useEffect, useState, FormEvent } from 'react';
import { supabaseService } from '../services/supabaseService';

interface AuthGateProps {
  children: React.ReactNode;
}

export const AuthGate: React.FC<AuthGateProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseService.isAvailable()) {
      setLoading(false);
      return;
    }

    const client = supabaseService.getClient();

    const init = async () => {
      const { data: { session } } = await client.auth.getSession();
      setUser(session?.user || null);
      setLoading(false);
    };

    const { data: sub } = client.auth.onAuthStateChange((_event: any, session: any) => {
      setUser(session?.user || null);
    });

    init();

    return () => {
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleGoogle = async () => {
    setError(null);
    try {
      const client = supabaseService.getClient();
      await client.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
      });
    } catch (e: any) {
      setError(e?.message || 'Google sign-in failed');
    }
  };

  const handleEmailPassword = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const client = supabaseService.getClient();
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error) {
        // If user not found, offer sign-up
        const signUp = confirm('Account not found or invalid credentials. Do you want to create an account?');
        if (signUp) {
          const { error: signUpError } = await client.auth.signUp({ email, password });
          if (signUpError) throw signUpError;
        } else {
          throw error;
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Email/password sign-in failed');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-400">Checking authentication…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900/80 border border-gray-700/50 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-white">Sign in to continue</h2>

          {error && <div className="text-red-400 text-sm">{error}</div>}

          <button
            onClick={handleGoogle}
            className="w-full py-2 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition"
          >
            Continue with Google
          </button>

          <div className="text-center text-gray-500 text-sm">or</div>

          <form onSubmit={handleEmailPassword} className="space-y-3">
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-gray-800 text-white border border-gray-700 focus:outline-none"
              required
            />
            <button
              type="submit"
              className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition"
            >
              Sign in / Sign up
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};