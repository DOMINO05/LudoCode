import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

const Leaderboard = ({ currentUserId }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLeaderboard = async () => {
            try {
                const res = await fetch('http://localhost:3000/users/leaderboard');
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
        <div style={{ marginTop: '40px', width: '100%', maxWidth: '800px', backgroundColor: '#1e1e1e', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
            <h2 style={{ textAlign: 'center', color: '#ffd700', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '2px' }}>🏆 Top Ranglista</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                <thead>
                    <tr style={{ borderBottom: '2px solid #333', textAlign: 'left' }}>
                        <th style={{ padding: '10px' }}>#</th>
                        <th style={{ padding: '10px' }}>Felhasználó</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>XP</th>
                        <th style={{ padding: '10px', textAlign: 'right' }}>ELO</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((user, index) => {
                        const isCurrentUser = user.id === currentUserId;
                        return (
                            <tr key={user.id} style={{ 
                                borderBottom: '1px solid #333', 
                                backgroundColor: isCurrentUser ? 'rgba(255, 215, 0, 0.1)' : 'transparent',
                                fontWeight: isCurrentUser ? 'bold' : 'normal'
                            }}>
                                <td style={{ padding: '10px' }}>
                                    {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : index + 1 === 3 ? '🥉' : index + 1}
                                </td>
                                <td style={{ padding: '10px' }}>
                                    {user.username || 'Anonymous'} {isCurrentUser && '(Te)'}
                                </td>
                                <td style={{ padding: '10px', textAlign: 'right', color: '#4caf50' }}>{user.xp}</td>
                                <td style={{ padding: '10px', textAlign: 'right', color: '#2196f3' }}>{user.globalEloRating}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

const ProgressChart = ({ session }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await fetch('http://localhost:3000/users/stats', {
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
            <div style={{ marginTop: '40px', padding: '20px', textAlign: 'center', color: '#888' }}>
                <h3>Nincs elég adat a grafikonokhoz.</h3>
                <p>Oldj meg több feladatot a statisztikákhoz!</p>
            </div>
        );
    }

    return (
        <div style={{ marginTop: '40px', width: '100%', maxWidth: '900px', display: 'flex', flexDirection: 'column', gap: '40px' }}>
            {/* ELO Chart */}
            <div style={{ backgroundColor: '#1e1e1e', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <h3 style={{ textAlign: 'center', color: '#2196f3', marginBottom: '20px' }}>📈 ELO Pontszám Növekedése</h3>
                <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer>
                        <LineChart data={stats.eloHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="date" stroke="#888" tickFormatter={date => date.substring(5)} />
                            <YAxis stroke="#888" domain={['auto', 'auto']} />
                            <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} />
                            <Line type="monotone" dataKey="elo" stroke="#2196f3" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Activity Chart */}
            <div style={{ backgroundColor: '#1e1e1e', borderRadius: '10px', padding: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.3)' }}>
                <h3 style={{ textAlign: 'center', color: '#4caf50', marginBottom: '20px' }}>📊 Napi Megoldott Feladatok</h3>
                <div style={{ height: '300px', width: '100%' }}>
                    <ResponsiveContainer>
                        <BarChart data={stats.activity}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="date" stroke="#888" tickFormatter={date => date.substring(5)} />
                            <YAxis stroke="#888" allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#333', border: 'none' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                            <Bar dataKey="count" fill="#4caf50" radius={[4, 4, 0, 0]} />
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '100%', padding: '20px', gap: '30px' }}>
      <h1>Welcome back, {profile.username || session.user.email}!</h1>
      
      <div style={{ display: 'flex', gap: '40px', textAlign: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
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
      
      <ProgressChart session={session} />
      
      <Leaderboard currentUserId={profile.id} />

      {showBonus && <BonusModal onClose={() => setShowBonus(false)} />}
    </div>
  );
}
