import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Avatar from './Avatar';
import BackButton from './components/BackButton';
import { INITIAL_AVATAR_CONFIG } from './utils/avatarDefaults';

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
                isOwned: item.is_owned
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
                fetchItems();
            } else {
                setMessage({ type: 'error', text: 'Hiba történt a vásárlás során' });
            }
        } catch (err) {
            console.error("Buy failed", err);
            setMessage({ type: 'error', text: err.message === 'Item already owned' ? 'Ez a tárgy már a birtokodban van!' : (err.message || 'Hálózati hiba') });
        }
    };

    if (loading) return <div className="p-10 text-center animate-pulse text-slate-500">Bolt betöltése...</div>;

    // Standardize avatar config access with default fallback
    const rawConfig = profile?.avatarConfig || profile?.avatar_config;
    const userAvatarConfig = (rawConfig && Object.keys(rawConfig).length > 0)
        ? rawConfig
        : { ...INITIAL_AVATAR_CONFIG, seed: profile?.username || 'user' };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 text-slate-800 dark:text-slate-100">
            <BackButton to="/dashboard" />
            
            <div className="text-center mb-12">
                <div className="inline-block p-4 bg-purple-100 dark:bg-purple-900/30 rounded-full mb-4">
                    <span className="text-4xl">🛒</span>
                </div>
                <h1 className="text-4xl font-black mb-4 uppercase tracking-tight">Bolt</h1>
                <div className="flex items-center justify-center gap-3 bg-purple-500 text-white px-6 py-2 rounded-2xl w-fit mx-auto font-black shadow-lg">
                    <span className="text-2xl">💎</span> {profile?.gems || 0} GEM
                </div>
            </div>

            {message && (
                <div className={`
                    p-4 rounded-2xl mb-8 text-center font-bold animate-in zoom-in-95 duration-300 border-2
                    ${message.type === 'success' ? 'bg-green-100 border-green-500 text-green-700' : 'bg-red-100 border-red-500 text-red-700'}
                `}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {items.map(item => {
                    const isCosmetic = ['hat', 'accessory', 'avatar_frame', 'theme', 'clothing'].includes(item.category);
                    const isOwned = item.isOwned && !['streak_freeze', 'xp_boost'].includes(item.category);
                    
                    // PREVIEW LOGIC
                    let previewConfig = null;
                    if (isCosmetic) {
                        previewConfig = { ...userAvatarConfig };
                        
                        if (item.category === 'avatar_frame') {
                            previewConfig.frame = item.name;
                        } else if (item.category === 'theme') {
                            previewConfig.background = 'custom';
                            previewConfig.backgroundColor = item.metadata?.color || 'transparent';
                        } else {
                            const dicebear = item.metadata?.dicebear || {};
                            previewConfig = { ...previewConfig, ...dicebear };
                        }
                    }

                    return (
                        <div key={item.id} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md rounded-3xl overflow-hidden flex flex-col hover:shadow-xl transition-all group relative">
                            
                            {isCosmetic ? (
                                <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-center items-center relative p-6">
                                    <div className="transform group-hover:scale-110 transition-transform duration-300">
                                        <Avatar config={previewConfig} size={160} />
                                    </div>
                                </div>
                            ) : (
                                <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-center items-center p-10 text-center">
                                    <div className="text-7xl mb-4 group-hover:scale-110 transition-transform duration-300">
                                        {item.category === 'streak_freeze' ? '❄️' : 
                                         item.category === 'xp_boost' ? '🚀' : '🎁'}
                                    </div>
                                    <h3 className="font-black text-xl mb-2">{item.name}</h3>
                                    <p className="text-slate-500 text-sm">{item.metadata?.description || 'Nincs leírás'}</p>
                                </div>
                            )}

                            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 mt-auto">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                                        <div className="flex items-center gap-1 text-purple-500 font-black">
                                            <span className="text-lg">💎</span> {item.costGems}
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 uppercase">
                                        {item.rarity || 'common'}
                                    </div>
                                </div>

                                {isOwned ? (
                                    <div className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 font-bold rounded-2xl text-center uppercase text-xs tracking-wider">
                                        Megvásárolva
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => handleBuy(item)}
                                        disabled={profile.gems < item.costGems}
                                        className={`
                                            w-full py-3 rounded-2xl font-black uppercase tracking-widest text-sm shadow-lg transition-all active:translate-y-1 active:shadow-none
                                            ${profile.gems < item.costGems 
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-b-0' 
                                                : 'bg-primary hover:bg-primary-dark text-white border-b-4 border-green-700'}
                                        `}
                                    >
                                        Vásárlás
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
