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
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh', 
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
        <h2 style={{ textAlign: 'center', color: 'var(--primary-color)', marginBottom: '30px' }}>
          {isLogin ? 'Bejelentkezés' : 'Regisztráció'}
        </h2>
        
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>Email:</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px' }} 
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '8px' }}>Jelszó:</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              style={{ width: '100%', boxSizing: 'border-box', padding: '12px' }} 
            />
          </div>
          
          {!isLogin && (
            <div>
              <label style={{ display: 'block', marginBottom: '8px' }}>Szint:</label>
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)} 
                style={{ 
                  width: '100%', 
                  padding: '12px', 
                  borderRadius: '5px',
                  border: '1px solid var(--input-border)',
                  backgroundColor: 'var(--input-bg)',
                  color: 'var(--text-color)'
                }}
              >
                <option value="Beginner">Kezdő</option>
                <option value="Intermediate">Haladó</option>
                <option value="Pro">Pro</option>
              </select>
            </div>
          )}

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }}>
            {isLogin ? 'Belépés' : 'Regisztráció'}
          </button>
        </form>

        {message && (
          <p style={{ 
            marginTop: '20px', 
            textAlign: 'center', 
            color: message.includes('success') ? 'var(--success-color)' : 'var(--error-color)' 
          }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="btn btn-outline"
            style={{ width: '100%' }}
          >
            {isLogin ? 'Nincs fiókod? Regisztrálj!' : 'Már van fiókod? Belépés'}
          </button>
        </div>
      </div>
    </div>
  );
}
