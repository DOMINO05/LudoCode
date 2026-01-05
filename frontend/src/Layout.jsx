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
      <header className="app-header" style={{ 
          padding: '10px 20px', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '20px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            LudoCode
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '10px' }}>
                        {profile.avatarUrl && <img src={profile.avatarUrl} alt="Avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--text-color)' }} />}
                        <span style={{ fontWeight: 'bold' }}>{profile.username || 'User'}</span>
                    </div>
                    <span>XP: {profile.xp}</span>
                    <span>HP: {'❤️'.repeat(Math.max(0, profile.hp))}</span>
                    <span>ELO: {profile.globalEloRating}</span>
                    <button onClick={() => navigate('/profile')} className="btn btn-primary" style={{ padding: '5px 10px' }}>
                        Edit Profile
                    </button>
                </>
            ) : (
                <span>Loading stats...</span>
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
