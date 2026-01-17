import React, { useState } from 'react';
import { supabase } from './supabaseClient';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [level, setLevel] = useState('Beginner');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);
    
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
        
        if (data.session) {
           await syncProfile(data.session.access_token);
        } else {
           // If session is missing, try to login immediately (assuming confirmation is disabled)
           const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
              email,
              password,
           });
           
           if (loginError) {
               // If login fails (e.g. confirmation actually required), show message
               if (loginError.message.includes('Email not confirmed')) {
                   setMessage('Registration successful! Please check your email to confirm.');
               } else {
                   throw loginError;
               }
           } else if (loginData.session) {
               await syncProfile(loginData.session.access_token);
           }
        }
      }
    } catch (error) {
      setMessage(error.message);
    } finally {
        setIsLoading(false);
    }
  };

  const syncProfile = async (token) => {
    try {
        const response = await fetch(`${API_URL}/users/sync`, {
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
    <div className="min-h-screen flex items-center justify-center bg-background-light dark:bg-background-dark p-4 font-nunito">
      <div className="w-full max-w-md bg-surface-light dark:bg-surface-dark p-8 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 animate-fade-in">
        <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-2 tracking-tight">
                LudoCode
            </h1>
            <p className="text-slate-500 dark:text-slate-400">
                {isLogin ? 'Welcome back! 👋' : 'Create your account 🚀'}
            </p>
        </div>
        
        <form onSubmit={handleAuth} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
              placeholder="name@example.com"
            />
          </div>
          
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none"
              placeholder="••••••••"
            />
          </div>
          
          {!isLogin && (
            <div className="animate-fade-in">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 ml-1">Experience Level</label>
              <select 
                value={level} 
                onChange={(e) => setLevel(e.target.value)} 
                className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all outline-none appearance-none"
              >
                <option value="Beginner">Beginner (Started recently)</option>
                <option value="Intermediate">Intermediate (Can code a bit)</option>
                <option value="Pro">Pro (Working professional)</option>
              </select>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full py-3 px-6 rounded-lg font-bold text-white bg-primary hover:bg-primary-dark shadow-lg hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed transition-all mt-2"
          >
            {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        {message && (
          <div className={`mt-6 p-3 rounded-lg text-center text-sm font-bold ${message.includes('success') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'} animate-pop`}>
            {message}
          </div>
        )}

        <div className="mt-8 text-center">
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-surface-light dark:bg-surface-dark text-slate-500">or</span>
                </div>
            </div>

          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="w-full py-2 px-4 rounded-lg font-bold text-slate-600 dark:text-slate-300 border-2 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            {isLogin ? 'Create an account' : 'I already have an account'}
          </button>
        </div>
      </div>
    </div>
  );
}
