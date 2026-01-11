import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import Avatar from './Avatar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function ShopPage() {
    const { session, profile, refreshProfile } = useOutletContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            const res = await fetch(`${API_URL}/shop/items`);
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            }
        } catch (err) {
            console.error("Failed to fetch shop items", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (itemId) => {
        setMessage(null);
        try {
            const res = await fetch(`${API_URL}/shop/buy/${itemId}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
            
            if (res.ok) {
                setMessage({ type: 'success', text: 'Item purchased!' });
                refreshProfile();
            } else {
                const err = await res.json();
                setMessage({ type: 'error', text: err.message || 'Failed to buy item' });
            }
        } catch (err) {
            console.error("Buy failed", err);
            setMessage({ type: 'error', text: 'Network error' });
        }
    };

    if (loading) return <div>Loading Shop...</div>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }} className="text-slate-800 dark:text-slate-100">
            <h1 style={{ textAlign: 'center', marginBottom: '30px', fontSize: '2em' }}>🛒 Shop</h1>
            <div style={{ textAlign: 'center', marginBottom: '40px', fontSize: '1.2em' }}>
                Your Gems: <span style={{ fontWeight: 'bold', color: '#9c27b0' }}>💎 {profile?.gems || 0}</span>
            </div>

            {message && (
                <div style={{
                    padding: '15px', marginBottom: '30px', borderRadius: '10px', textAlign: 'center',
                    backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: message.type === 'success' ? '#2e7d32' : '#c62828',
                    border: `1px solid ${message.type === 'success' ? '#2e7d32' : '#c62828'}`
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '30px' }}>
                {items.map(item => {
                    const isCosmetic = ['hat', 'accessory', 'avatar_frame', 'theme'].includes(item.category);
                    const previewConfig = isCosmetic && profile?.avatarConfig 
                        ? { ...profile.avatarConfig, ...(item.metadata?.dicebear || {}) }
                        : null;

                    return (
                        <div key={item.id} className="card bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-xl" style={{ padding: '0', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', height: '100%' }}>
                            
                            {isCosmetic ? (
                                <div className="w-full aspect-square bg-slate-50 dark:bg-slate-700 flex justify-center items-center">
                                    <Avatar config={previewConfig} size="80%" />
                                </div>
                            ) : (
                                <div style={{ padding: '30px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '50px', marginBottom: '15px' }}>
                                        {item.category === 'streak_freeze' ? '❄️' : 
                                         item.category === 'xp_boost' ? '🚀' : '🎁'}
                                    </div>
                                    <h3 style={{ margin: '0 0 10px 0' }}>{item.name}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm m-0">{item.metadata?.description || 'No description'}</p>
                                </div>
                            )}

                            <div style={{ padding: '15px', width: '100%', marginTop: 'auto', borderTop: '1px solid #eee' }} className="dark:border-slate-700">
                                <button 
                                    className="btn btn-primary"
                                    onClick={() => handleBuy(item.id)}
                                    disabled={profile.gems < item.costGems}
                                    style={{ 
                                        width: '100%', 
                                        opacity: profile.gems < item.costGems ? 0.5 : 1,
                                        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
                                    }}
                                >
                                    <span>💎</span> {item.costGems}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
