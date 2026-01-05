import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';

const AVATAR_SEEDS = [
    'Felix', 'Aneka', 'Zoe', 'Midnight', 'Bear', 'Tiger', 'Leo', 'Max', 'Luna', 'Shadow', 
    'Simba', 'Milo', 'Oreo', 'Coco', 'Bella', 'Charlie', 'Lucy', 'Daisy', 'Lola', 'Jasper'
];

export default function ProfilePage() {
    const { session, profile, refreshProfile } = useOutletContext();
    const navigate = useNavigate();
    
    const [username, setUsername] = useState('');
    const [selectedAvatar, setSelectedAvatar] = useState('');
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (profile) {
            setUsername(profile.username || '');
            setSelectedAvatar(profile.avatarUrl || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${profile.username || 'default'}`);
        }
    }, [profile]);

    const handleAvatarClick = (seed) => {
        setSelectedAvatar(`https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`);
    };

    const handleSave = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('http://localhost:3000/users/profile', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    username: username,
                    avatar_url: selectedAvatar
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
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', color: '#fff' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>Edit Profile</h1>

            {message && (
                <div style={{
                    padding: '15px',
                    marginBottom: '20px',
                    borderRadius: '5px',
                    backgroundColor: message.type === 'success' ? 'rgba(76, 175, 80, 0.2)' : 'rgba(211, 47, 47, 0.2)',
                    color: message.type === 'success' ? '#4caf50' : '#ff5252',
                    border: `1px solid ${message.type === 'success' ? '#4caf50' : '#ff5252'}`,
                    textAlign: 'center'
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ marginBottom: '40px' }}>
                <label style={{ display: 'block', marginBottom: '10px', fontSize: '18px' }}>Username</label>
                <input 
                    type="text" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '15px',
                        fontSize: '16px',
                        backgroundColor: '#1e1e1e',
                        border: '1px solid #333',
                        color: '#fff',
                        borderRadius: '5px'
                    }}
                />
            </div>

            <div style={{ marginBottom: '40px' }}>
                <label style={{ display: 'block', marginBottom: '20px', fontSize: '18px' }}>Choose Avatar</label>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '30px' }}>
                    <div style={{ 
                        width: '120px', 
                        height: '120px', 
                        borderRadius: '50%', 
                        overflow: 'hidden', 
                        border: '4px solid #0070f3',
                        backgroundColor: '#1e1e1e'
                    }}>
                        <img src={selectedAvatar} alt="Selected Avatar" style={{ width: '100%', height: '100%' }} />
                    </div>
                </div>

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
                    gap: '15px' 
                }}>
                    {AVATAR_SEEDS.map(seed => {
                        const url = `https://api.dicebear.com/7.x/pixel-art/svg?seed=${seed}`;
                        const isSelected = selectedAvatar === url;
                        return (
                            <div 
                                key={seed}
                                onClick={() => handleAvatarClick(seed)}
                                style={{
                                    cursor: 'pointer',
                                    borderRadius: '10px',
                                    border: isSelected ? '3px solid #0070f3' : '3px solid transparent',
                                    overflow: 'hidden',
                                    backgroundColor: '#1e1e1e',
                                    transition: 'transform 0.2s',
                                    transform: isSelected ? 'scale(1.1)' : 'scale(1)'
                                }}
                            >
                                <img src={url} alt={seed} style={{ width: '100%', height: '100%', display: 'block' }} />
                            </div>
                        );
                    })}
                </div>
            </div>

            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
                <button 
                    onClick={() => navigate('/dashboard')}
                    style={{
                        padding: '15px 30px',
                        fontSize: '16px',
                        backgroundColor: 'transparent',
                        color: '#aaa',
                        border: '1px solid #555',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    }}
                >
                    Cancel
                </button>
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                        padding: '15px 40px',
                        fontSize: '16px',
                        backgroundColor: '#0070f3',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        opacity: loading ? 0.7 : 1
                    }}
                >
                    {loading ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
        </div>
    );
}
