import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { session, profile } = useOutletContext();
  const navigate = useNavigate();

  if (!profile) return <div>Loading dashboard...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '30px' }}>
      <h1>Welcome back, {profile.username || session.user.email}!</h1>
      
      <div style={{ display: 'flex', gap: '40px', textAlign: 'center' }}>
          <div style={{ border: '2px solid #0070f3', padding: '20px', borderRadius: '10px', minWidth: '150px' }}>
              <h2>Level / ELO</h2>
              <div style={{ fontSize: '40px', fontWeight: 'bold' }}>{profile.globalEloRating}</div>
          </div>
          
          <div style={{ border: '2px solid #ff9800', padding: '20px', borderRadius: '10px', minWidth: '150px' }}>
              <h2>XP</h2>
              <div style={{ fontSize: '40px', fontWeight: 'bold' }}>{profile.xp}</div>
          </div>
      </div>

      <button 
        onClick={() => navigate('/solve')}
        style={{ 
            padding: '20px 40px', 
            fontSize: '24px', 
            background: '#4caf50', 
            color: 'white', 
            border: 'none', 
            borderRadius: '50px',
            cursor: 'pointer',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
        }}
      >
        START TRAINING
      </button>
    </div>
  );
}
