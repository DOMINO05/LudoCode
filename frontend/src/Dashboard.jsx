import React, { useEffect, useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Zap, 
  Gem, 
  Flame, 
  ChevronDown,
  Heart, 
  Star,
  CheckCircle2,
  Play
} from 'lucide-react';
import BonusModal from './components/BonusModal';
import ProgressChart from './components/ProgressChart';
import SanityWarningModal from './components/SanityWarningModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// --- Új Segédkomponensek (Duolingo Style) ---

const Button = ({ children, variant = 'primary', className = '', onClick, fullWidth, disabled }) => {
  const baseStyle = "font-bold py-3 px-6 rounded-2xl transition-all active:translate-y-[4px] active:border-b-0 border-b-4 uppercase tracking-wider text-sm md:text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:border-b-4";
  
  const variants = {
    primary: "bg-blue-500 hover:bg-blue-400 text-white border-blue-700",
    secondary: "bg-green-500 hover:bg-green-400 text-white border-green-700",
    accent: "bg-purple-500 hover:bg-purple-400 text-white border-purple-700",
    orange: "bg-orange-500 hover:bg-orange-400 text-white border-orange-700",
    outline: "bg-white dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700",
    ghost: "bg-transparent text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800 active:translate-y-0 active:border-b-0",
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const Card = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 ${className}`}>
    {children}
  </div>
);

const ProgressBar = ({ value, max, color = "bg-yellow-400", height = "h-4" }) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={`${height} w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden`}>
      <div 
        className={`h-full ${color} transition-all duration-500 ease-out`} 
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};

const ActionCard = ({ title, desc, icon, color, buttonText, onClick }) => {
    const colorMap = {
      green: "bg-green-500 border-green-700",
      yellow: "bg-yellow-500 border-yellow-700",
      purple: "bg-purple-500 border-purple-700",
      indigo: "bg-indigo-500 border-indigo-700",
      blue: "bg-blue-500 border-blue-700",
    };
  
    return (
      <div 
        onClick={onClick}
        className="bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-6 flex flex-col items-center text-center hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer group"
      >
        <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-200">{icon}</div>
        <h3 className="font-extrabold text-lg text-slate-700 dark:text-slate-200 mb-1">{title}</h3>
        <p className="text-slate-500 text-sm mb-6">{desc}</p>
        <button className={`w-full py-2 rounded-xl font-bold text-white uppercase tracking-wider text-sm border-b-4 active:border-b-0 active:translate-y-[4px] transition-all ${colorMap[color] || colorMap.green}`}>
          {buttonText}
        </button>
      </div>
    );
  };

export default function Dashboard() {
  const { session, profile, refreshProfile, languages, currentLanguage, changeLanguage } = useOutletContext();
  const navigate = useNavigate();
  const [showBonus, setShowBonus] = useState(false);
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showWarning, setShowWarning] = useState(false);
  const [bonusData, setBonusData] = useState({ message: '', bonus: 0, quote: null });

  useEffect(() => {
    const claimDailyBonus = async () => {
      try {
        const res = await fetch(`${API_URL}/users/daily-claim`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.claimed) {
            setBonusData({ message: data.message, bonus: data.bonus, quote: data.quote });
            setShowBonus(true);
            refreshProfile(); // Update XP in TopBar and Dashboard
          }
        }
      } catch (error) {
        console.error('Error claiming daily bonus:', error);
      }
    };

    claimDailyBonus();
  }, []);

  if (!profile) return <div className="p-8 text-center text-slate-500 animate-pulse">Loading dashboard...</div>;

  const checkSanityAndNavigate = (path) => {
    if (profile.sanityPoints === 0) {
        setShowWarning(true);
        return;
    }
    navigate(path);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-in slide-in-from-bottom-2 fade-in duration-500">
      
      {/* 🟢 TOP BAR: Language Selector & Stats */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 rounded-2xl p-4 sticky top-4 z-30 shadow-sm">
        
        {/* Custom Language Dropdown */}
        <div className="relative w-full md:w-auto">
           <button 
             onClick={() => setIsLangOpen(!isLangOpen)}
             className="flex items-center justify-between gap-3 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-all w-full md:min-w-[160px] border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[2px]"
           >
              <div className="flex items-center gap-2">
                <span className="text-2xl">
                    {currentLanguage?.name?.toLowerCase().includes('python') ? '🐍' : 
                     currentLanguage?.name?.toLowerCase().includes('java') ? '☕' : '📜'}
                </span>
                <span className="font-black text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                    {currentLanguage?.displayName || currentLanguage?.name || 'Válassz'}
                </span>
              </div>
              <ChevronDown size={18} className={`text-slate-500 transition-transform duration-300 ${isLangOpen ? 'rotate-180' : ''}`} />
           </button>

           {/* Dropdown Menu */}
           {isLangOpen && (
             <>
               <div className="fixed inset-0 z-40" onClick={() => setIsLangOpen(false)} />
               <div className="absolute top-full left-0 mt-2 w-full min-w-[200px] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in duration-200">
                  <div className="p-2 space-y-1">
                    {languages.map(lang => {
                        const isSelected = lang.id === currentLanguage?.id;
                        const icon = lang.name?.toLowerCase().includes('python') ? '🐍' : 
                                     lang.name?.toLowerCase().includes('java') ? '☕' : '📜';
                        return (
                          <button
                            key={lang.id}
                            onClick={() => {
                                changeLanguage(lang.id);
                                setIsLangOpen(false);
                            }}
                            className={`flex items-center gap-3 w-full p-3 rounded-xl font-bold transition-colors ${isSelected ? 'bg-blue-500 text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                          >
                            <span className="text-xl">{icon}</span>
                            <span className="uppercase tracking-wide">{lang.displayName || lang.name}</span>
                            {isSelected && <CheckCircle2 size={18} className="ml-auto" />}
                          </button>
                        );
                    })}
                  </div>
               </div>
             </>
           )}
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 md:gap-8 w-full md:w-auto justify-around md:justify-end">
           {/* Sanity / HP */}
           <div 
             className="flex items-center gap-2 cursor-pointer group" 
             title="Sanity / HP Szint - Kattints a javításhoz!"
             onClick={() => setShowRecovery(true)}
           >
              <Heart className={`text-red-500 ${profile.sanityPoints < 100 ? 'animate-pulse' : 'fill-current'}`} size={24} /> 
              <span className="font-extrabold text-red-500 text-lg">{profile.sanityPoints}%</span>
           </div>
           
           {/* Streak */}
           <div className="flex items-center gap-2" title="Streak">
              <Flame className="text-orange-500 fill-current" size={24} /> 
              <span className="font-extrabold text-orange-500 text-lg">{profile.currentStreak || 0}</span>
           </div>

           {/* XP */}
           <div className="flex items-center gap-2" title="Összes XP">
              <Star className="text-yellow-400 fill-current" size={24} /> 
              <span className="font-extrabold text-yellow-400 text-lg">{profile.xp}</span>
           </div>

           {/* Gems */}
           <div className="flex items-center gap-2" title="Gems">
              <Gem className="text-blue-500 fill-current" size={24} /> 
              <span className="font-extrabold text-blue-500 text-lg">{profile.gems}</span>
           </div>
        </div>
      </div>

      {/* Hero / Quick Practice */}
      <div className="relative group cursor-pointer" onClick={() => checkSanityAndNavigate('/solve')}>
         <div className="absolute inset-0 bg-blue-500 rounded-3xl transform rotate-1 group-hover:rotate-2 transition-transform opacity-20 dark:opacity-40"></div>
         <Card className="relative bg-gradient-to-br from-blue-500 to-blue-600 border-none p-6 md:p-8 text-white overflow-hidden shadow-xl">
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
               <div className="text-6xl md:text-8xl animate-bounce">⚡</div>
               <div className="flex-1">
                 <h2 className="text-2xl md:text-3xl font-extrabold mb-2 uppercase tracking-wide">Gyors Gyakorlás</h2>
                 <p className="text-blue-100 mb-6 font-medium">Adaptív feladatok a szintednek megfelelően, azonnali visszajelzéssel.</p>
                 <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 w-full md:w-auto">
                   Indítás (+10 XP)
                 </Button>
               </div>
            </div>
         </Card>
      </div>

      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <ActionCard 
            title="Gyakorlás" 
            desc="Válassz típust" 
            icon="🧩" 
            color="green"
            buttonText="Választás"
            onClick={() => checkSanityAndNavigate('/courses')}
          />
          <ActionCard 
            title="Kvízek" 
            desc="Saját feladatok" 
            icon="📝" 
            color="yellow"
            buttonText="Kezelés"
            onClick={() => navigate('/quizzes')}
          />
          <ActionCard 
            title="Közösség" 
            desc="Böngészés" 
            icon="🌍" 
            color="purple"
            buttonText="Felfedezés"
            onClick={() => navigate('/community')}
          />
          <ActionCard 
            title="Playground" 
            desc="Szabad kódolás" 
            icon="🧪" 
            color="indigo"
            buttonText="Indítás"
            onClick={() => navigate('/playground')}
          />
      </div>

      {/* Lower Section: Inspiration */}
      <div className="w-full">
          {/* Napi Inspiráció */}
          {profile.lastQuote && (
            <Card className="flex flex-col justify-center text-center relative overflow-hidden group border-none bg-slate-50 dark:bg-slate-800/50 py-10">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary opacity-50"></div>
                <div className="text-4xl opacity-20 mb-2 group-hover:scale-125 transition-transform duration-500 italic">“</div>
                <p className="text-xl font-medium italic text-slate-700 dark:text-slate-200 mb-4 px-4 leading-relaxed max-w-2xl mx-auto">
                    {profile.lastQuote.text}
                </p>
                <cite className="not-italic font-bold text-primary tracking-wide uppercase text-sm">
                    - {profile.lastQuote.author}
                </cite>
            </Card>
          )}
      </div>
      
      {showBonus && (
        <BonusModal 
          onClose={() => setShowBonus(false)} 
          message={bonusData.message} 
          bonus={bonusData.bonus} 
          quote={bonusData.quote}
        />
      )}

      {showRecovery && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-surface-light dark:bg-surface-dark p-8 rounded-3xl shadow-2xl max-w-md w-full text-center border border-slate-200 dark:border-slate-700 animate-in fade-in zoom-in duration-300">
                <div className="text-6xl mb-6">🧠</div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2">Sanity Helyreállítása</h2>
                
                {profile.sanityPoints >= 100 ? (
                    <>
                         <p className="text-slate-600 dark:text-slate-400 mb-8">
                            A Sanity-d teljesen fel van töltve! Nincs szükség javításra.
                        </p>
                        <button 
                            onClick={() => setShowRecovery(false)}
                            className="w-full py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 font-bold rounded-xl transition-colors"
                        >
                            RENDBEN
                        </button>
                    </>
                ) : (
                    <>
                        <p className="text-slate-600 dark:text-slate-400 mb-8">
                            A teljes gyógyuláshoz <strong className="text-primary">{Math.ceil((100 - profile.sanityPoints) / 10)} feladatot</strong> kell sikeresen megoldanod a korábbi hibáidból.
                        </p>
                        <div className="flex gap-4">
                            <button 
                                onClick={() => setShowRecovery(false)}
                                className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                            >
                                MÉGSEM
                            </button>
                            <button 
                                onClick={() => {
                                    setShowRecovery(false);
                                    navigate('/mistake-recovery');
                                }}
                                className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl shadow-lg transition-all"
                            >
                                INDÍTÁS
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
      )}

      {showWarning && (
          <SanityWarningModal 
            onClose={() => setShowWarning(false)}
            onRecover={() => {
                setShowWarning(false);
                setShowRecovery(true);
            }}
          />
      )}
    </div>
  );
}
