import React, { useEffect, useState } from 'react';
import UserProfileModal from './UserProfileModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const Leaderboard = ({ session, currentUserId }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('global'); // 'global' | 'friends'
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);

    useEffect(() => {
        if (!isSearching) {
            fetchLeaderboard();
        }
    }, [tab, isSearching]);

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/leaderboard?type=${tab}`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`
                }
            });
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

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim()) {
            setIsSearching(false);
            return;
        }
        
        setIsSearching(true);
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(searchQuery)}`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setLoading(false);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
        setIsSearching(false);
    };

    // Kept for potential future use or if we add callbacks from modal
    const handleFollow = async (userId) => {
        try {
            const res = await fetch(`${API_URL}/users/follow/${userId}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                setUsers(users.map(u => u.id === userId ? { ...u, isFollowing: true } : u));
            }
        } catch (err) {
            console.error('Follow failed', err);
        }
    };

    const handleUnfollow = async (userId) => {
        try {
            const res = await fetch(`${API_URL}/users/follow/${userId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            if (res.ok) {
                if (tab === 'friends' && !isSearching) {
                    setUsers(users.filter(u => u.id !== userId));
                } else {
                    setUsers(users.map(u => u.id === userId ? { ...u, isFollowing: false } : u));
                }
            }
        } catch (err) {
            console.error('Unfollow failed', err);
        }
    };

    return (
        <div className="w-full bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6 overflow-hidden">
            <div className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <h3 className="text-secondary uppercase tracking-widest font-bold text-lg text-center md:text-left">
                        {isSearching ? '🔍 Keresési Eredmények' : '🏆 Ranglista'}
                    </h3>
                    
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                        <button 
                            onClick={() => { setTab('global'); setIsSearching(false); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${!isSearching && tab === 'global' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Globális
                        </button>
                        <button 
                            onClick={() => { setTab('friends'); setIsSearching(false); }}
                            className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${!isSearching && tab === 'friends' ? 'bg-white dark:bg-slate-700 shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        >
                            Barátok
                        </button>
                    </div>
                </div>

                <form onSubmit={handleSearch} className="relative w-full">
                    <input 
                        type="text" 
                        placeholder="Felhasználó keresése..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full p-3 pl-10 pr-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
                    {isSearching && (
                        <button 
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            ✕
                        </button>
                    )}
                </form>
            </div>

            {loading ? (
                <div className="p-4 text-center text-slate-500">Loading...</div>
            ) : (
                <div className="overflow-x-auto">
                    {users.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 italic">
                            {isSearching 
                                ? "Nincs találat." 
                                : (tab === 'friends' ? "Még nem követsz senkit." : "Nincs adat.")}
                        </div>
                    ) : (
                        <table className="w-full min-w-[300px]">
                            <thead>
                                <tr className="border-b-2 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm uppercase tracking-wider">
                                    <th className="p-3 text-left">#</th>
                                    <th className="p-3 text-left w-full">Felhasználó</th>
                                    <th className="p-3 text-right">XP</th>
                                </tr>
                            </thead>
                            <tbody className="text-slate-700 dark:text-slate-200">
                                {users.map((user, index) => {
                                    const isCurrentUser = user.id === currentUserId;
                                    return (
                                        <tr 
                                            key={user.id} 
                                            onClick={() => setSelectedUserId(user.id)}
                                            className={`
                                                border-b border-slate-100 dark:border-slate-800 last:border-0 transition-colors cursor-pointer
                                                ${isCurrentUser ? 'bg-yellow-50 dark:bg-yellow-900/20 font-bold' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}
                                            `}
                                        >
                                            <td className="p-3 whitespace-nowrap">
                                                {index + 1 === 1 ? '🥇' : index + 1 === 2 ? '🥈' : index + 1 === 3 ? '🥉' : index + 1}
                                            </td>
                                            <td className="p-3 whitespace-nowrap">
                                                {user.username || 'Anonymous'} {isCurrentUser && <span className="text-xs text-primary ml-1">(Te)</span>}
                                            </td>
                                            <td className="p-3 text-right text-success font-mono">
                                                {user.xp}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
            
            {selectedUserId && (
                <UserProfileModal 
                    userId={selectedUserId} 
                    session={session} 
                    onClose={() => setSelectedUserId(null)} 
                />
            )}
        </div>
    );
};

export default Leaderboard;
