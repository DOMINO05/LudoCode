import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';

export default function Layout({ session }) {
  const [profile, setProfile] = useState(null);
  const navigate = useNavigate();

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
      <header style={{ 
          padding: '10px 20px', 
          background: '#333', 
          color: 'white', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '20px', cursor: 'pointer' }} onClick={() => navigate('/dashboard')}>
            LudoCode
        </div>
        
        <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
            {profile ? (
                <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginRight: '10px' }}>
                        {profile.avatarUrl && <img src={profile.avatarUrl} alt="Avatar" style={{ width: '30px', height: '30px', borderRadius: '50%', border: '1px solid #fff' }} />}
                        <span style={{ fontWeight: 'bold' }}>{profile.username || 'User'}</span>
                    </div>
                    <span>XP: {profile.xp}</span>
                    <span>HP: {'❤️'.repeat(Math.max(0, profile.hp))}</span>
                    <span>ELO: {profile.globalEloRating}</span>
                    <button onClick={() => navigate('/profile')} style={{ background: '#0070f3', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                        Edit Profile
                    </button>
                </>
            ) : (
                <span>Loading stats...</span>
            )}
            <button onClick={handleLogout} style={{ background: '#d32f2f', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '4px', cursor: 'pointer' }}>
                Logout
            </button>
        </div>
      </header>
      
      <main style={{ flex: 1, overflow: 'hidden' }}>
        <Outlet context={{ session, profile, refreshProfile: fetchProfile }} />
      </main>
    </div>
  );
}
