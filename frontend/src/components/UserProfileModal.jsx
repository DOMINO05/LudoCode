import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Avatar from '../Avatar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const UserProfileModal = ({ userId, session, onClose }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) {
            fetchProfile();
        }
    }, [userId]);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/public-profile/${userId}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            } else {
                console.error("Failed to fetch profile");
            }
        } catch (err) {
            console.error("Failed to fetch profile", err);
        } finally {
            setLoading(false);
        }
    };

    const handleFollow = async () => {
        try {
            const res = await fetch(`${API_URL}/users/follow/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                setProfile(prev => ({ ...prev, isFollowing: true, followersCount: (prev.followersCount || 0) + 1 }));
            }
        } catch (err) {
            console.error('Follow failed', err);
        }
    };

    const handleUnfollow = async () => {
        try {
            const res = await fetch(`${API_URL}/users/follow/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                setProfile(prev => ({ ...prev, isFollowing: false, followersCount: Math.max(0, (prev.followersCount || 0) - 1) }));
            }
        } catch (err) {
            console.error('Unfollow failed', err);
        }
    };

    if (!userId) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="bg-surface-light dark:bg-surface-dark w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-scale-in"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-6 flex justify-between items-center border-b border-slate-200 dark:border-slate-700">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Felhasználói Profil</h2>
                    <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto p-6 flex-1">
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        </div>
                    ) : profile ? (
                        <div className="flex flex-col gap-8">
                            {/* Top Section: Avatar & Basic Info */}
                            <div className="flex flex-col md:flex-row gap-8 items-center md:items-start">
                                <div className="flex-shrink-0">
                                    <Avatar config={profile.avatarConfig} size={150} />
                                </div>
                                <div className="flex-grow text-center md:text-left space-y-4 w-full">
                                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                        <div>
                                            <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100">{profile.username}</h1>
                                            <p className="text-slate-500 dark:text-slate-400 text-sm">
                                                Csatlakozott: {new Date(profile.createdAt).toLocaleDateString('hu-HU')}
                                            </p>
                                        </div>
                                        {/* Follow Button */}
                                        {profile.id !== session.user.id && (
                                            <button 
                                                onClick={profile.isFollowing ? handleUnfollow : handleFollow}
                                                className={`px-6 py-2 rounded-full font-bold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 ${
                                                    profile.isFollowing 
                                                    ? 'bg-slate-200 text-slate-600 hover:bg-red-100 hover:text-red-600 dark:bg-slate-700 dark:text-slate-300' 
                                                    : 'bg-primary text-white hover:bg-primary-dark'
                                                }`}
                                            >
                                                {profile.isFollowing ? 'Kikövetés' : 'Bekövetés'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                                            <div className="text-2xl font-black text-orange-500">🔥 {profile.currentStreak}</div>
                                            <div className="text-xs uppercase font-bold text-slate-500">Streak</div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                                            <div className="text-2xl font-black text-secondary">{profile.xp}</div>
                                            <div className="text-xs uppercase font-bold text-slate-500">XP</div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                                            <div className="text-2xl font-black text-blue-500">{profile.followersCount}</div>
                                            <div className="text-xs uppercase font-bold text-slate-500">Követők</div>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl text-center border border-slate-200 dark:border-slate-700">
                                            <div className="text-2xl font-black text-purple-500">{profile.followingCount}</div>
                                            <div className="text-xs uppercase font-bold text-slate-500">Követ</div>
                                        </div>
                                    </div>
                                    
                                    {/* Badges */}
                                    {profile.userBadges && profile.userBadges.length > 0 && (
                                        <div className="mt-4">
                                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Jelvények</h3>
                                            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                                                {profile.userBadges.map(ub => (
                                                    <div key={ub.id} className="group relative" title={ub.badge.name + ": " + ub.badge.description}>
                                                        <div className="text-3xl bg-slate-100 dark:bg-slate-800 p-2 rounded-lg border border-slate-200 dark:border-slate-700 cursor-help transform hover:scale-110 transition-transform">
                                                            {ub.badge.iconPath}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Charts Section */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                                {/* Proficiency Chart */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-center text-primary mb-4 font-bold">📈 Proficiency (Theta)</h4>
                                    <div className="h-64 w-full">
                                        {profile.stats?.proficiencyHistory && profile.stats.proficiencyHistory.length > 0 ? (
                                            <ResponsiveContainer>
                                                <LineChart data={profile.stats.proficiencyHistory}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" opacity={0.3} />
                                                    <XAxis 
                                                        dataKey="date" 
                                                        stroke="#64748b" 
                                                        tickFormatter={date => date.substring(5)} 
                                                        fontSize={12} 
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <YAxis 
                                                        stroke="#64748b" 
                                                        domain={['auto', 'auto']} 
                                                        fontSize={12} 
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{ 
                                                            backgroundColor: '#ffffff', 
                                                            borderColor: '#e2e8f0', 
                                                            color: '#1e293b',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                        }} 
                                                    />
                                                    <Line 
                                                        type="monotone" 
                                                        dataKey="value" 
                                                        stroke="#0070f3" 
                                                        strokeWidth={3} 
                                                        dot={{ r: 4, fill: '#0070f3', strokeWidth: 2, stroke: '#fff' }} 
                                                        activeDot={{ r: 6 }} 
                                                    />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-400 italic">Nincs adat</div>
                                        )}
                                    </div>
                                </div>

                                {/* Activity Chart */}
                                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700">
                                    <h4 className="text-center text-success mb-4 font-bold">📊 Napi Aktivitás</h4>
                                    <div className="h-64 w-full">
                                        {profile.stats?.activity && profile.stats.activity.length > 0 ? (
                                            <ResponsiveContainer>
                                                <BarChart data={profile.stats.activity}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" vertical={false} opacity={0.3} />
                                                    <XAxis 
                                                        dataKey="date" 
                                                        stroke="#64748b" 
                                                        tickFormatter={date => date.substring(5)} 
                                                        fontSize={12} 
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <YAxis 
                                                        stroke="#64748b" 
                                                        allowDecimals={false} 
                                                        fontSize={12} 
                                                        tickLine={false}
                                                        axisLine={false}
                                                    />
                                                    <Tooltip 
                                                        contentStyle={{ 
                                                            backgroundColor: '#ffffff', 
                                                            borderColor: '#e2e8f0', 
                                                            color: '#1e293b',
                                                            borderRadius: '8px',
                                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                                        }} 
                                                        cursor={{fill: '#f1f5f9'}} 
                                                    />
                                                    <Bar dataKey="count" fill="#4caf50" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-slate-400 italic">Nincs adat</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center text-slate-500">Felhasználó nem található.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserProfileModal;
