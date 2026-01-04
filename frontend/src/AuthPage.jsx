import React, { useState } from 'react';
import { supabase } from './supabaseClient';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [message, setMessage] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // If auto-confirm is on or checks allow session creation immediately
        if (data.session) {
           await syncProfile(data.session.access_token);
        } else {
           setMessage('Registration successful! Please check your email.');
        }
      }
    } catch (error) {
      setMessage(error.message);
    }
  };

  const syncProfile = async (token) => {
    try {
        const response = await fetch('http://localhost:3000/users/sync', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ level })
        });
        if (!response.ok) throw new Error('Failed to sync profile');
        setMessage('Registration and profile creation successful!');
    } catch (err) {
        console.error(err);
        setMessage('Profile sync failed: ' + err.message);
    }
  }

  return (
    <div style={{ maxWidth: '400px', margin: 'auto', padding: '20px' }}>
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={handleAuth}>
        <div style={{ marginBottom: '10px' }}>
          <label>Email:</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>Password:</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required style={{ width: '100%' }} />
        </div>
        
        {!isLogin && (
          <div style={{ marginBottom: '10px' }}>
            <label>Skill Level:</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} style={{ width: '100%' }}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Pro">Pro</option>
            </select>
          </div>
        )}

        <button type="submit">{isLogin ? 'Login' : 'Register'}</button>
      </form>

      <p>{message}</p>

      <button onClick={() => setIsLogin(!isLogin)}>
        Switch to {isLogin ? 'Register' : 'Login'}
      </button>
    </div>
  );
}
