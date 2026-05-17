import { useState } from 'react';
import { Card, CardContent, CardHeader } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { register, login } from '../api/client';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';

export function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const setLoggedIn = useAuthStore(s => s.setLoggedIn);
  const setView = useUiStore(s => s.setView);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        const data = await register(username.trim(), password);
        setLoggedIn(data.username);
        setSuccess('Account created! Welcome aboard 🎉');
        // Navigate to Run Test after showing success message
        setTimeout(() => setView('run-test'), 2000);
      } else {
        const data = await login(username.trim(), password);
        setLoggedIn(data.username);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError(null);
    setConfirmPassword('');
  };

  return (
    <div className="max-w-md mx-auto mt-8">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-bold text-text">
            {mode === 'login' ? 'Welcome Back' : 'Create Account'}
          </h2>
          <p className="text-sm text-text-muted mt-1">
            {mode === 'login'
              ? 'Log in to track your benchmarks'
              : 'Register to contribute to the global leaderboard'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Username
              </label>
              <Input
                placeholder="Choose a username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1">
                Password
              </label>
              <Input
                type="password"
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            )}

            {success && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm">
                {success}
              </div>
            )}
            {error && (
              <div className="p-3 rounded-lg bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <Button
              variant="primary"
              type="submit"
              className="w-full"
              disabled={loading}
            >
              {loading ? '...' : mode === 'login' ? 'Log In' : 'Register'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={toggleMode}
              className="text-sm text-lumina-500 hover:text-lumina-400 transition-colors"
            >
              {mode === 'login'
                ? "Don't have an account? Register"
                : 'Already have an account? Log in'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
