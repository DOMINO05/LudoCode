import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from './supabaseClient';
import Avatar from './Avatar';
import BackButton from './components/BackButton';
import { INITIAL_AVATAR_CONFIG } from './utils/avatarDefaults';

export default function ShopAllPage() {
    const { session, profile } = useOutletContext();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllItems();
    }, []);

    const fetchAllItems = async () => {
        try {
            // Direct query to get EVERYTHING, not using the rotating RPC
            const { data, error } = await supabase
                .from('shop_items')
                .select('*')
                .order('category', { ascending: true })
                .order('cost_gems', { ascending: true });

            if (error) throw error;
            
            setItems(data || []);
        } catch (err) {
            console.error("Failed to fetch all shop items", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Összes kiegészítő betöltése...</div>;

    const userAvatarConfig = profile?.avatarConfig || profile?.avatar_config || INITIAL_AVATAR_CONFIG;

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 text-slate-800 dark:text-slate-100">
            <BackButton to="/shop" label="Vissza a Bolthoz" />
            
            <div className="text-center mb-12">
                <h1 className="text-4xl font-black mb-4 uppercase tracking-tight">Minden Kiegészítő</h1>
                <p className="text-slate-500 text-lg">Itt láthatod a rendszerben lévő összes megvásárolható tárgyat.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {items.map(item => {
                    const isCosmetic = ['hat', 'accessory', 'avatar_frame', 'theme', 'clothing'].includes(item.category);
                    
                    let previewConfig = null;
                    if (isCosmetic) {
                        previewConfig = { ...userAvatarConfig, seed: profile?.username || 'user' };
                        
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
                        <div key={item.id} className="bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 shadow-md rounded-3xl overflow-hidden flex flex-col hover:shadow-xl transition-all group">
                            
                            {isCosmetic ? (
                                <div className="w-full aspect-square bg-slate-50 dark:bg-slate-900/50 flex flex-col justify-center items-center relative p-6">
                                    <div className="absolute top-4 left-4 bg-blue-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg z-10">
                                        {item.name}
                                    </div>
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

                            <div className="p-6 bg-slate-50/50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 mt-auto flex justify-between items-center">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.category}</span>
                                    <div className="flex items-center gap-1 text-purple-500 font-black">
                                        <span className="text-lg">💎</span> {item.cost_gems}
                                    </div>
                                </div>
                                <div className="text-[10px] font-bold px-3 py-1 bg-slate-200 dark:bg-slate-700 rounded-full text-slate-500 uppercase">
                                    {item.rarity || 'common'}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
