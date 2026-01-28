import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Avatar from './Avatar';
import BackButton from './components/BackButton';

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
            const { data, error } = await supabase.rpc('get_shop_items');
            if (error) throw error;
            
            // Map cost_gems to costGems if component expects it
            const mappedData = data.map(item => ({
                ...item,
                costGems: item.cost_gems,
                isOwned: item.is_owned // Explicitly mapping is_owned
            }));

            setItems(mappedData);
        } catch (err) {
            console.error("Failed to fetch shop items", err);
        } finally {
            setLoading(false);
        }
    };

    const handleBuy = async (item) => {
        setMessage(null);
        try {
            const { data, error } = await supabase.rpc('buy_shop_item', {
                p_item_id: item.id,
                p_expected_cost: item.costGems,
                p_metadata: item.metadata
            });
            
            if (error) throw error;

            if (data && data.success) {
                setMessage({ type: 'success', text: 'Sikeres vásárlás!' });
                refreshProfile();
                fetchItems(); // Refresh list to update isOwned
            } else {
                setMessage({ type: 'error', text: 'Hiba történt a vásárlás során' });
            }
        } catch (err) {
            console.error("Buy failed", err);
            setMessage({ type: 'error', text: err.message === 'Item already owned' ? 'Ez a tárgy már a birtokodban van!' : (err.message || 'Hálózati hiba') });
        }
    };

    if (loading) return <div>Loading Shop...</div>;

    return (
        
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }} className="text-slate-800 dark:text-slate-100">
            <BackButton to="/dashboard" />
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
                    const isOwned = item.isOwned && !['streak_freeze', 'xp_boost'].includes(item.category);
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

                            <div style={{ padding: '15px', width: '100%', marginTop: 'auto', borderTop: '1px solid #eee' }} className="dark:border-slate-700 text-center">
                                {isOwned ? (
                                    <div className="w-full py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-lg uppercase text-sm">
                                        Megvásárolva
                                    </div>
                                ) : (
                                    <button 
                                        className="btn btn-primary w-full flex justify-center items-center gap-2"
                                        onClick={() => handleBuy(item)}
                                        disabled={profile.gems < item.costGems}
                                        style={{ 
                                            opacity: profile.gems < item.costGems ? 0.5 : 1
                                        }}
                                    >
                                        <span>💎</span> {item.costGems}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
