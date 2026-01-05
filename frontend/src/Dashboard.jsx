import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const BonusModal = ({ onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  }}>
    <div style={{
      backgroundColor: '#1e1e1e', color: '#fff', padding: '40px', borderRadius: '15px',
      maxWidth: '400px', width: '90%', textAlign: 'center', border: '2px solid #ffd700',
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
      animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎁</div>
      <h2 style={{ color: '#ffd700', marginBottom: '10px', fontSize: '28px' }}>Napi Bónusz!</h2>
      <p style={{ fontSize: '20px', marginBottom: '30px' }}>+50 XP</p>
      <button 
        onClick={onClose}
        style={{ 
          padding: '12px 30px', 
          backgroundColor: '#ffd700', 
          color: '#000', 
          border: 'none', 
          borderRadius: '25px',
          cursor: 'pointer', 
          fontSize: '16px',
          fontWeight: 'bold'
        }}
      >
        Király!
      </button>
      <style>{`
        @keyframes popIn {
          from { transform: scale(0.5); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  </div>
);

export default function Dashboard() {
  const { session, profile, refreshProfile } = useOutletContext();
  const navigate = useNavigate();
  const [showBonus, setShowBonus] = useState(false);

  useEffect(() => {
    const claimDailyBonus = async () => {
      try {
        const res = await fetch('http://localhost:3000/users/daily-claim', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.claimed) {
            setShowBonus(true);
            refreshProfile(); // Update XP in TopBar and Dashboard
          }
        }
      } catch (error) {
        console.error('Error claiming daily bonus:', error);
      }
    };

    claimDailyBonus();
  }, []);

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

      {showBonus && <BonusModal onClose={() => setShowBonus(false)} />}
    </div>
  );
}
