import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import AvatarEditor from './AvatarEditor';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ProfilePage() {
    const { session, profile, refreshProfile, handleLogout } = useOutletContext();
    const navigate = useNavigate();
    
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [avatarConfig, setAvatarConfig] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);
    
    // Easter Egg State
    const [keySequence, setKeySequence] = useState('');

    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setBio(profile.bio || '');
            setAvatarConfig(profile.avatarConfig || {});
            fetchInventory();
        }
    }, [profile]);

    const fetchInventory = async () => {
        try {
            const res = await fetch(`${API_URL}/shop/inventory`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setInventory(data);
            }
        } catch (err) {
            console.error("Failed to fetch inventory", err);
        }
    };

    // Easter Egg Listener
    useEffect(() => {
        const handleKeyDown = async (e) => {
            const newSeq = (keySequence + e.key).slice(-10).toLowerCase(); // Keep last 10 chars
            setKeySequence(newSeq);

            if (newSeq.includes('ludo') || newSeq.includes('konami')) {
                // Trigger Easter Egg
                try {
                    const res = await fetch(`${API_URL}/users/easter-egg`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({ code: newSeq.includes('ludo') ? 'ludo' : 'konami' })
                    });
                    const data = await res.json();
                    if (data.success) {
                        setMessage({ type: 'success', text: `Easter Egg Found! ${data.message}` });
                        setKeySequence(''); // Reset
                    }
                } catch (err) {
                    console.error('Easter egg failed', err);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keySequence, session]);

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/users/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    username: username,
                    bio: bio,
                    avatar_config: avatarConfig
                })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Failed to update profile');
            }

            await refreshProfile();
            setMessage({ type: 'success', text: 'Profile updated successfully!' });
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: err.message });
        } finally {
            setLoading(false);
        }
    };

    if (!profile) return <div>Loading...</div>;

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', color: 'var(--text-color)' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Edit Profile</h1>

            {message && (
                <div style={{
                    padding: '15px',
                    marginBottom: '20px',
                    borderRadius: '5px',
                    backgroundColor: message.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                    color: message.type === 'success' ? 'var(--success-color)' : 'var(--error-color)',
                    border: `1px solid ${message.type === 'success' ? 'var(--success-color)' : 'var(--error-color)'}`,
                    textAlign: 'center'
                }}>
                    {message.text}
                </div>
            )}

            <div className="card" style={{ marginBottom: '40px' }}>
                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '18px' }}>Username</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)}
                        style={{ width: '100%', boxSizing: 'border-box' }}
                    />
                </div>

                {profile.userBadges && profile.userBadges.length > 0 && (
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', marginBottom: '10px', fontSize: '18px' }}>Badges</label>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            {profile.userBadges.map((ub) => (
                                <div key={ub.badgeId} title={ub.badge.description} style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    padding: '10px',
                                    backgroundColor: 'var(--surface-color)',
                                    borderRadius: '12px',
                                    border: '1px solid var(--card-border)',
                                    minWidth: '80px'
                                }}>
                                    <span style={{ fontSize: '24px' }}>{ub.badge.iconPath}</span>
                                    <span style={{ fontSize: '12px', fontWeight: 'bold', marginTop: '5px', textAlign: 'center' }}>{ub.badge.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '10px', fontSize: '18px' }}>
                        Bio
                        <span style={{ float: 'right', fontSize: '14px', color: bio.length > 160 ? 'var(--error-color)' : 'var(--text-color)', opacity: 0.7 }}>
                            {bio.length}/160
                        </span>
                    </label>
                    <textarea 
                        value={bio} 
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Mesélj magadról..."
                        rows={3}
                        style={{ 
                            width: '100%', 
                            boxSizing: 'border-box', 
                            padding: '10px', 
                            borderRadius: '8px',
                            border: '1px solid var(--card-border)',
                            backgroundColor: 'var(--bg-color)',
                            color: 'var(--text-color)',
                            resize: 'none'
                        }}
                    />
                </div>

                {/* 
                {profile.badges && profile.badges.length > 0 && (
                    ...
                )} 
                */}

                <div style={{ marginBottom: '20px' }}>
                    <label style={{ display: 'block', marginBottom: '20px', fontSize: '18px' }}>Customize Avatar</label>
                    <AvatarEditor 
                        config={avatarConfig} 
                        onChange={setAvatarConfig} 
                        inventory={inventory}
                    />
                </div>

                <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '30px' }}>
                    <button 
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-outline"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={loading}
                        className="btn btn-primary"
                        style={{ opacity: loading ? 0.7 : 1 }}
                    >
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '40px', borderTop: '1px solid #ccc', paddingTop: '20px' }}>
                 <button 
                    onClick={handleLogout} 
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-bold transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}
