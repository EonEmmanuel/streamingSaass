import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../lib/api';
import { Button, Card, PageShell } from '../../components/ui';

export const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    try {
      const response = await apiFetch<{ token: string }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      localStorage.setItem('token', response.token);
      navigate('/admin/dashboard');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <PageShell>
      <Card className="mx-auto max-w-md shadow-vimeo border-none p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-black mb-2">Welcome Back</h1>
          <p className="text-black/60 text-sm">Sign in to manage your streaming server</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-black px-1">Username</label>
            <input 
              className="w-full rounded-xl border border-vimeo-border bg-vimeo-lightGray p-3 text-black outline-none focus:border-vimeo-blue transition-all" 
              placeholder="Enter your username" 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-black px-1">Password</label>
            <input 
              className="w-full rounded-xl border border-vimeo-border bg-vimeo-lightGray p-3 text-black outline-none focus:border-vimeo-blue transition-all" 
              placeholder="••••••••" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}
          
          <Button type="submit" className="w-full py-3 rounded-xl shadow-lg shadow-vimeo-blue/20">Sign in to Dashboard</Button>
        </form>
      </Card>
    </PageShell>
  );
};
