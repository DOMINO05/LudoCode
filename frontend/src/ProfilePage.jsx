import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import { User, FileText, Award, LogOut, Save, X } from 'lucide-react';
import AvatarEditor from './AvatarEditor';

const Button = ({ children, variant = 'primary', className = '', onClick, disabled, loading }) => {
    const baseStyle = "font-bold py-3 px-6 rounded-2xl transition-all active:translate-y-[4px] active:border-b-0 border-b-4 uppercase tracking-wider text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
    
    const variants = {
      primary: "bg-blue-500 hover:bg-blue-400 text-white border-blue-700",
      secondary: "bg-green-500 hover:bg-green-400 text-white border-green-700",
      danger: "bg-red-500 hover:bg-red-400 text-white border-red-700",
      outline: "bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700",
    };
  
    return (
      <button 
        onClick={onClick}
        disabled={disabled || loading}
        className={`${baseStyle} ${variants[variant]} ${className}`}
      >
        {loading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : children}
      </button>
    );
};

const Card = ({ children, className = '', title, icon }) => (
    <div className={`bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-3xl p-6 ${className}`}>
        {title && (
            <div className="flex items-center gap-3 mb-6 border-b-2 border-slate-100 dark:border-slate-800 pb-4">
                <div className="p-2 bg-blue-500/10 text-blue-500 rounded-xl">
                    {icon}
                </div>
                <h2 className="text-xl font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">{title}</h2>
            </div>
        )}
        {children}
    </div>
);

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
            const { data, error } = await supabase
                .from('user_inventory')
                .select('*, item:shop_items(*)')
                .eq('user_id', session.user.id);
                
            if (error) throw error;
            setInventory(data);
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
                    const { data, error } = await supabase.rpc('check_easter_egg', {
                        p_code: newSeq.includes('ludo') ? 'ludo' : 'konami'
                    });
                    
                    if (error) throw error;

                    if (data && data.success) {
                        setMessage({ type: 'success', text: `Easter Egg Found! ${data.message}` });
                        setKeySequence(''); // Reset
                        refreshProfile();
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
            const { error } = await supabase
                .from('profiles')
                .update({
                    username: username,
                    bio: bio,
                    avatar_config: avatarConfig
                })
                .eq('id', session.user.id);

            if (error) throw error;

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

    if (!profile) return (
        <div className="min-h-screen flex items-center justify-center text-slate-500 animate-pulse font-bold uppercase tracking-widest">
            Betöltés...
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-8 pb-32 space-y-8 animate-in slide-in-from-bottom-4 fade-in duration-500">
            
            {/* Header Area */}
            <div className="text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tighter italic">Profil Szerkesztése</h1>
                    <p className="text-slate-500 dark:text-slate-400 font-bold">Alakítsd saját képedre a fiókodat!</p>
                </div>
                {/* Desktop Buttons */}
                <div className="hidden md:flex gap-3">
                    <Button variant="outline" onClick={() => navigate('/dashboard')}>
                        <X size={20} />
                        Mégsem
                    </Button>
                    <Button variant="secondary" onClick={handleSave} loading={loading}>
                        <Save size={20} />
                        Mentés
                    </Button>
                </div>
            </div>

            {/* Sticky Mobile Footer for Actions (Hidden on desktop) */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t-2 border-slate-200 dark:border-slate-700 p-4 z-50 md:hidden flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => navigate('/dashboard')}>
                    Mégsem
                </Button>
                <Button variant="secondary" className="flex-1" onClick={handleSave} loading={loading}>
                    Mentés
                </Button>
            </div>

            {message && (
                <div className={`
                    p-4 rounded-2xl border-2 font-bold text-center animate-in zoom-in duration-300
                    ${message.type === 'success' 
                        ? 'bg-green-100 border-green-200 text-green-600 dark:bg-green-900/30 dark:border-green-800' 
                        : 'bg-red-100 border-red-200 text-red-600 dark:bg-red-900/30 dark:border-red-800'}
                `}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* Left Column: Editor */}
                <div className="space-y-8">
                    <Card title="Alapvető adatok" icon={<User size={24} />}>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Felhasználónév</label>
                                <input 
                                    type="text" 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500 outline-none transition-colors shadow-inner"
                                    placeholder="Add meg a neved..."
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                                    <span>Bemutatkozás</span>
                                    <span className={bio.length > 160 ? 'text-red-500' : ''}>{bio.length}/160</span>
                                </label>
                                <textarea 
                                    value={bio} 
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Mesélj magadról a többieknek..."
                                    rows={4}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 font-bold text-slate-700 dark:text-slate-200 focus:border-blue-500 outline-none transition-colors shadow-inner resize-none"
                                />
                            </div>
                        </div>
                    </Card>

                    {profile.userBadges && profile.userBadges.length > 0 && (
                        <Card title="Jelvények" icon={<Award size={24} />}>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                                {profile.userBadges.map((ub) => (
                                    <div 
                                        key={ub.badgeId} 
                                        title={ub.badge.description} 
                                        className="group relative flex flex-col items-center p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-all cursor-help"
                                    >
                                        <div className="text-4xl mb-2 transform group-hover:scale-110 transition-transform">{ub.badge.iconPath}</div>
                                        <span className="text-[10px] font-black text-center text-slate-600 dark:text-slate-300 uppercase tracking-tighter leading-none">{ub.badge.name}</span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Right Column: Avatar Editor */}
                <div className="lg:sticky lg:top-8">
                    <Card title="Avatar testreszabása" icon={<FileText size={24} />}>
                        <AvatarEditor 
                            config={avatarConfig} 
                            onChange={setAvatarConfig} 
                            inventory={inventory}
                        />
                    </Card>
                </div>

            </div>

            {/* Logout at the very bottom */}
            <div className="pt-12 border-t-2 border-slate-100 dark:border-slate-800 flex justify-center">
                <Button 
                    variant="danger" 
                    onClick={handleLogout}
                    className="w-full md:w-auto min-w-[200px]"
                >
                    <LogOut size={20} />
                    Kijelentkezés
                </Button>
            </div>
        </div>
    );
}
