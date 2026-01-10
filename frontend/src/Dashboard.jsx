import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const BonusModal = ({ onClose }) => (
  <div style={{
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'var(--modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  }}>
    <div className="modal-content" style={{
      padding: '40px', borderRadius: '15px',
      maxWidth: '400px', width: '90%', textAlign: 'center', border: '2px solid var(--secondary-color)',
      boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
      animation: 'popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    }}>
      <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎁</div>
      <h2 style={{ color: 'var(--secondary-color)', marginBottom: '10px', fontSize: '28px' }}>Napi Bónusz!</h2>
      <p style={{ fontSize: '20px', marginBottom: '30px' }}>+50 XP</p>
      <button 
        onClick={onClose}
        className="btn btn-secondary"
        style={{ 
          borderRadius: '25px',
          fontSize: '16px',
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

const Leaderboard = ({ currentUserId }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch(`${API_URL}/users/leaderboard`);
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                }
            } catch (err) {
                console.error("Failed to fetch leaderboard", err);
            } finally {
                setLoading(false);
            }
        };
        fetchLeaderboard();
    }, []);

    if (loading) return <div>Loading leaderboard...</div>;

    return (
        <div className="card" style={{ width: '100%', overflow: 'hidden', minWidth: 0 }}>
            <h3 style={{ textAlign: 'center', color: 'var(--secondary-color)', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '2px' }}>🏆 Top Ranglista</h3>
            <div style={{ overflowX: 'auto', width: '100%' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--text-color)', minWidth: '300px' }}>
                    <thead>
                        <tr style={{ borderBottom: '2px solid var(--card-border)', textAlign: 'left' }}>
                            <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>#</th>
                            <th style={{ padding: '10px', whiteSpace: 'nowrap' }}>Felhasználó</th>
                            <th style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>XP</th>
                            <th style={{ padding: '10px', textAlign: 'right', whiteSpace: 'nowrap' }}>Proficiency (Theta)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user, index) => {
                            const isCurrentUser = user.id === currentUserId;
                            return (
                                <tr key={user.id} style={{ 
                                    borderBottom: '1px solid var(--card-border)', 
                                    backgroundColor: isCurrentUser ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                                    fontWeight: isCurrentUser ? 'bold' : 'normal'
                                }}>
                                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                        {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : index + 1 === 3 ? '🥉' : index + 1}
                                    </td>
                                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>
                                        {user.username || 'Anonymous'} {isCurrentUser && '(Te)'}
                                    </td>
                                    <td style={{ padding: '10px', textAlign: 'right', color: 'var(--success-color)', whiteSpace: 'nowrap' }}>{user.xp}</td>
                                    <td style={{ padding: '10px', textAlign: 'right', color: 'var(--primary-color)', whiteSpace: 'nowrap' }}>{user.globalProficiency?.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const ProgressChart = ({ session }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch(`${API_URL}/users/stats`, {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                });
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [session]);

    if (loading) return <div>Loading stats...</div>;

    if (!stats || (stats.activity.every(d => d.count === 0))) {
        return (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
                <p>Oldj meg több feladatot a statisztikákhoz!</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: 0 }}>
            {/* Proficiency Chart */}
            <div className="card">
                <h4 style={{ textAlign: 'center', color: 'var(--primary-color)', marginBottom: '10px' }}>📈 Proficiency (Theta)</h4>
                <div style={{ height: '200px', width: '100%' }}>
                    <ResponsiveContainer>
                        <LineChart data={stats.proficiencyHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                            <XAxis dataKey="date" stroke="var(--text-color)" tickFormatter={date => date.substring(5)} fontSize={12} />
                            <YAxis stroke="var(--text-color)" domain={['auto', 'auto']} fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-color)' }} />
                            <Line type="monotone" dataKey="value" stroke="var(--primary-color)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Activity Chart */}
            <div className="card">
                <h4 style={{ textAlign: 'center', color: 'var(--success-color)', marginBottom: '10px' }}>📊 Napi Aktivitás</h4>
                <div style={{ height: '200px', width: '100%' }}>
                    <ResponsiveContainer>
                        <BarChart data={stats.activity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="date" stroke="var(--text-color)" tickFormatter={date => date.substring(5)} fontSize={12} />
                            <YAxis stroke="var(--text-color)" allowDecimals={false} fontSize={12} />
                            <Tooltip contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--card-border)', color: 'var(--text-color)' }} cursor={{fill: 'var(--input-bg)'}} />
                            <Bar dataKey="count" fill="var(--success-color)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default function Dashboard() {
  const { session, profile, refreshProfile } = useOutletContext();
  const navigate = useNavigate();
  const [showBonus, setShowBonus] = useState(false);

  useEffect(() => {
    const claimDailyBonus = async () => {
      try {
        const res = await fetch(`${API_URL}/users/daily-claim`, {
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%', padding: '20px', gap: '30px', maxWidth: '1200px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      <h1 style={{ fontSize: 'clamp(24px, 5vw, 48px)', textAlign: 'center', margin: '0 0 20px 0' }}>Welcome back, {profile.username || session.user.email}!</h1>
      
      {/* Stats Cards */}
      <div style={{ display: 'flex', gap: '20px', textAlign: 'center', flexWrap: 'wrap', justifyContent: 'center', width: '100%' }}>
          <div className="card" style={{ flex: '1 1 150px', minWidth: '150px', borderColor: 'var(--primary-color)', padding: '15px' }}>
              <h3 style={{margin: 0, marginBottom: '5px', fontSize: '16px'}}>Proficiency</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{profile.globalProficiency?.toFixed(2)}</div>
          </div>
          
          <div className="card" style={{ flex: '1 1 150px', minWidth: '150px', borderColor: 'var(--secondary-color)', padding: '15px' }}>
              <h3 style={{margin: 0, marginBottom: '5px', fontSize: '16px'}}>XP</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{profile.xp}</div>
          </div>

          <div className="card" style={{ flex: '1 1 150px', minWidth: '150px', borderColor: '#9c27b0', padding: '15px' }}>
              <h3 style={{margin: 0, marginBottom: '5px', fontSize: '16px'}}>Gems</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>💎 {profile.gems}</div>
          </div>

          <div className="card" style={{ flex: '1 1 150px', minWidth: '150px', borderColor: '#2196f3', padding: '15px' }}>
              <h3 style={{margin: 0, marginBottom: '5px', fontSize: '16px'}}>Sanity</h3>
              <div style={{ fontSize: '32px', fontWeight: 'bold' }}>🧠 {profile.sanityPoints}%</div>
          </div>
      </div>

      {/* Main Action Cards */}
      <div className="grid-responsive" style={{ width: '100%' }}>
          {/* Quick Play */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px', cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => navigate('/solve')}>
              <div style={{ fontSize: 'clamp(40px, 8vw, 60px)', marginBottom: '20px' }}>⚡</div>
              <h2 style={{ color: 'var(--primary-color)', marginBottom: '10px' }}>Gyors Gyakorlás</h2>
              <p style={{ marginBottom: '30px', color: 'var(--text-color)', opacity: 0.8 }}>Adaptív feladatok a szintednek megfelelően.</p>
              <button className="btn btn-primary" style={{ padding: '15px 40px', fontSize: '18px', borderRadius: '50px', width: '100%' }}>
                  Indítás
              </button>
          </div>

          {/* Learning Path */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px', cursor: 'pointer' }} onClick={() => navigate('/courses')}>
              <div style={{ fontSize: 'clamp(40px, 8vw, 60px)', marginBottom: '20px' }}>🗺️</div>
              <h2 style={{ color: 'var(--secondary-color)', marginBottom: '10px' }}>Tanuló Ösvény</h2>
              <p style={{ marginBottom: '30px', color: 'var(--text-color)', opacity: 0.8 }}>Haladj lépésről lépésre a témakörökön.</p>
              <button className="btn btn-secondary" style={{ padding: '15px 40px', fontSize: '18px', borderRadius: '50px', width: '100%' }}>
                  Kurzusok
              </button>
          </div>
      </div>
      
      {/* Lower Section: Charts & Leaderboard */}
      <div className="grid-responsive" style={{ width: '100%' }}>
          <ProgressChart session={session} />
          <Leaderboard currentUserId={profile.id} />
      </div>

      {showBonus && <BonusModal onClose={() => setShowBonus(false)} />}
    </div>
  );
}
