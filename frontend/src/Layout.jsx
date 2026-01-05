import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { useTheme } from './ThemeContext';

export default function Layout({ session }) {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  useEffect(() => {
    fetchProfile();
  }, [session]);

  const fetchProfile = async () => {
    try {
        const res = await fetch('http://localhost:3000/users/profile', {
            headers: {
                'Authorization': `Bearer ${session.access_token}`
            }
        });
        if (res.ok) {
            const data = await res.json();
            setProfile(data);
        }
    } catch (err) {
        console.error('Failed to fetch profile', err);
    }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      navigate('/');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <header className="app-header">
        <div style={{ fontWeight: 'bold', fontSize: '20px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            LudoCode
        </div>
        
        <div className="header-right">
            <button 
                onClick={toggleTheme} 
                className="btn btn-outline"
                style={{ fontSize: '18px', padding: '5px 10px', border: 'none' }}
                title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
                {isDark ? '☀️' : '🌙'}
            </button>

            {profile ? (
                <>
                    <div className="user-info" onClick={() => navigate('/profile')} style={{ cursor: 'pointer' }}>
                        {profile.avatarUrl && <img src={profile.avatarUrl} alt="Avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--text-color)' }} />}
                        <span style={{ fontWeight: 'bold' }}>{profile.username || 'User'}</span>
                    </div>
                    <div className="user-stats">
                        <span>XP: {profile.xp}</span>
                        <span>HP: {'❤️'.repeat(Math.max(0, profile.hp))}</span>
                        <span>ELO: {profile.globalEloRating}</span>
                    </div>
                </>
            ) : (
                <span>Loading...</span>
            )}
            <button onClick={handleLogout} className="btn" style={{ backgroundColor: 'var(--error-color)', color: 'white', padding: '5px 10px' }}>
                Logout
            </button>
        </div>
      </header>
      
      <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-color)', color: 'var(--text-color)' }}>
        <Outlet context={{ session, profile, refreshProfile: fetchProfile }} />
      </main>
    </div>
  );
}
