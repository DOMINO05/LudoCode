import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';

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
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
            <h1 style={{ textAlign: 'center', marginBottom: '10px' }}>🛒 Shop</h1>
            <div style={{ textAlign: 'center', marginBottom: '30px', fontSize: '1.2em' }}>
                Your Gems: <span style={{ fontWeight: 'bold', color: '#9c27b0' }}>💎 {profile?.gems || 0}</span>
            </div>

            {message && (
                <div style={{
                    padding: '10px', marginBottom: '20px', borderRadius: '5px', textAlign: 'center',
                    backgroundColor: message.type === 'success' ? '#e8f5e9' : '#ffebee',
                    color: message.type === 'success' ? '#2e7d32' : '#c62828'
                }}>
                    {message.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '20px' }}>
                {items.map(item => (
                    <div key={item.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '40px', marginBottom: '10px' }}>
                            {item.category === 'streak_freeze' ? '❄️' : 
                             item.category === 'theme' ? '🎨' :
                             item.category === 'xp_boost' ? '🚀' : '🎁'}
                        </div>
                        <h3>{item.name}</h3>
                        <p style={{ color: '#666', marginBottom: '15px' }}>{item.metadata?.description || 'No description'}</p>
                        <div style={{ marginTop: 'auto' }}>
                            <button 
                                className="btn btn-primary"
                                onClick={() => handleBuy(item.id)}
                                disabled={profile.gems < item.costGems}
                                style={{ opacity: profile.gems < item.costGems ? 0.5 : 1 }}
                            >
                                Buy for 💎 {item.costGems}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
