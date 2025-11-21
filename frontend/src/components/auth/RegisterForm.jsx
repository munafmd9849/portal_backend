import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function RegisterForm({ onSuccess }) {
  const { registerWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await registerWithEmail({ email, password, role });
      onSuccess?.();
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input className="w-full border px-3 py-2 rounded" placeholder="Email" type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
      <input className="w-full border px-3 py-2 rounded" placeholder="Password" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
      <select className="w-full border px-3 py-2 rounded" value={role} onChange={(e)=>setRole(e.target.value)}>
        <option value="student">Student</option>
        <option value="recruiter">Recruiter</option>
      </select>
      <button disabled={loading} className="w-full bg-black text-white py-2 rounded disabled:opacity-60">{loading ? 'Creating account...' : 'Create account'}</button>
    </form>
  );
}


