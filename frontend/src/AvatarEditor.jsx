import React, { useState, useEffect, useRef } from 'react';
import { Smile, Eye, User, Sparkles, ChevronLeft, ChevronRight, RefreshCw, Star } from 'lucide-react';
import Avatar from './Avatar';
import { useTheme } from './ThemeContext';
import { INITIAL_AVATAR_CONFIG } from './utils/avatarDefaults';

// --- KONFIGURÁCIÓ ÉS ADATOK (PIXEL-ART v9 STÍLUS) ---
const OPTIONS = {
  skinColor: ['ffe4c0', 'f5d0a9', 'e8b88d', 'd49d7b', 'b67b5e', '8d5441', '5d3428'],
  hairColor: ['000000', '4a4a4a', 'ffffff', 'b8b8b8', '8d2a2a', 'c54b29', 'e2ba4f', '6a4e23', '3b6e85'],
  backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'ffffff', '65c9ff', '58cc02', '1a1a1a', 'transparent'],
  
  // v9 Pixel Art valid components
  hair: ['short01', 'short02', 'short03', 'short04', 'short05', 'short06', 'short07', 'short08', 'short09', 'short10', 'short11', 'short12', 'short13', 'short14', 'short15', 'short16', 'short17', 'short18', 'short19', 'short20', 'short21', 'short22', 'short23', 'short24', 'long01', 'long02', 'long03', 'long04', 'long05', 'long06', 'long07', 'long08', 'long09', 'long10', 'long11', 'long12', 'long13', 'long14', 'long15', 'long16', 'long17', 'long18', 'long19', 'long20', 'long21'],
  eyes: ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07', 'variant08', 'variant09', 'variant10', 'variant11', 'variant12', 'variant13', 'variant14', 'variant15', 'variant16', 'variant17', 'variant18', 'variant19', 'variant20', 'variant21', 'variant22', 'variant23', 'variant24', 'variant25', 'variant26', 'variant27', 'variant28', 'variant29', 'variant30'],
  mouth: ['happy01', 'happy02', 'happy03', 'happy04', 'happy05', 'happy06', 'happy07', 'happy08', 'happy09', 'happy10', 'smile01', 'smile02', 'smile03', 'smile04', 'smile05', 'smile06', 'neutral01', 'neutral02', 'neutral03', 'sad01', 'sad02', 'sad03', 'sad04', 'sad05', 'sad06', 'sad07', 'sad08', 'sad09', 'sad10'],
};

const DEFAULTS = {
    clothing: 'variant01',
    hat: null,
    glasses: null,
    accessories: null,
    background: 'transparent',
    frame: null
};

const CATEGORIES = [
  { id: 'hair', label: 'Haj', icon: <Sparkles size={20} />, swipeParam: 'hair', colorParam: 'hairColor' },
  { id: 'eyes', label: 'Szem', icon: <Eye size={20} />, swipeParam: 'eyes', colorParam: null },
  { id: 'mouth', label: 'Száj', icon: <Smile size={20} />, swipeParam: 'mouth', colorParam: null },
  { id: 'skin', label: 'Bőr', icon: <User size={20} />, swipeParam: null, colorParam: 'skinColor' },
  { id: 'bg', label: 'Háttér', icon: <RefreshCw size={20} />, swipeParam: null, colorParam: 'backgroundColor' },
  { id: 'extras', label: 'Extrák', icon: <Star size={20} />, swipeParam: null, colorParam: null },
];

export default function AvatarEditor({ config, onChange, inventory = [] }) {
  const [activeTab, setActiveTab] = useState('hair');
  const { isDark: darkMode } = useTheme();

  const [localConfig, setLocalConfig] = useState(() => ({
    ...INITIAL_AVATAR_CONFIG,
    ...config
  }));

  useEffect(() => {
    // Sanitization: fix old/invalid mouth values to happy01
    const sanitizedConfig = { ...config };
    if (sanitizedConfig.mouth && sanitizedConfig.mouth.startsWith('variant')) {
        sanitizedConfig.mouth = 'happy01';
    }
    
    const merged = { ...INITIAL_AVATAR_CONFIG, ...sanitizedConfig };
    if (JSON.stringify(localConfig) !== JSON.stringify(merged)) {
        setLocalConfig(merged);
    }
  }, [config]);

  const updateConfig = (newConfig) => {
      setLocalConfig(newConfig);
      onChange(newConfig);
  };

  const changeValue = (param, direction) => {
    if (!param || !OPTIONS[param]) return;
    
    const optionsList = OPTIONS[param];
    let currentIndex = optionsList.indexOf(localConfig[param]);
    if (currentIndex === -1) currentIndex = 0;

    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= optionsList.length) newIndex = 0;
    if (newIndex < 0) newIndex = optionsList.length - 1;
    
    updateConfig({ ...localConfig, [param]: optionsList[newIndex] });
  };

  const touchStartX = useRef(null);
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const currentCategory = CATEGORIES.find(c => c.id === activeTab);
    if (currentCategory && currentCategory.swipeParam && Math.abs(diff) > 30) {
        changeValue(currentCategory.swipeParam, diff > 0 ? 'next' : 'prev');
    }
    touchStartX.current = null;
  };

  const toggleItem = (invItem) => {
      const dicebear = invItem.item.metadata?.dicebear || {};
      const isEquipped = Object.keys(dicebear).length > 0 && Object.keys(dicebear).every(key => localConfig[key] === dicebear[key]);
      if (isEquipped) {
          const newConfig = { ...localConfig };
          Object.keys(dicebear).forEach(key => {
              newConfig[key] = DEFAULTS[key] !== undefined ? DEFAULTS[key] : null;
          });
          updateConfig(newConfig);
      } else {
          updateConfig({ ...localConfig, ...dicebear });
      }
  };

  const currentCategory = CATEGORIES.find(c => c.id === activeTab);

  return (
    <div className={`font-sans transition-colors duration-300 ${darkMode ? 'text-white' : 'text-slate-700'}`}>
      <div className={`w-full flex flex-col relative overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-slate-900' : 'bg-white'}`} style={{ minHeight: '500px' }}>
        <main className="flex-1 flex flex-col">
          <div className={`relative flex items-center justify-center overflow-hidden select-none rounded-3xl border-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-slate-50 border-slate-200'}`} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd} style={{ minHeight: '280px' }}>
            {currentCategory?.swipeParam && (
              <>
                <button onClick={() => changeValue(currentCategory.swipeParam, 'prev')} className="absolute left-4 z-30 p-3 bg-white dark:bg-slate-700 border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[2px] text-slate-500 dark:text-slate-200 rounded-2xl shadow-sm transition-all">
                  <ChevronLeft size={24} />
                </button>
                <button onClick={() => changeValue(currentCategory.swipeParam, 'next')} className="absolute right-4 z-30 p-3 bg-white dark:bg-slate-700 border-b-4 border-slate-200 dark:border-slate-900 active:border-b-0 active:translate-y-[2px] text-slate-500 dark:text-slate-200 rounded-2xl shadow-sm transition-all">
                  <ChevronRight size={24} />
                </button>
              </>
            )}
            <div className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 transition-all duration-300 transform hover:scale-105 filter drop-shadow-xl">
               <Avatar config={localConfig} size="100%" />
            </div>
            {currentCategory?.swipeParam && (
               <div className={`absolute bottom-4 px-4 py-1 rounded-full bg-black/5 dark:bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400`}>
                 Húzz balra vagy jobbra
               </div>
            )}
          </div>
          <div className="py-6 space-y-6">
             <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
               {CATEGORIES.map((cat) => (
                 <button key={cat.id} onClick={() => setActiveTab(cat.id)} className={`flex flex-col items-center gap-1 p-2 min-w-[70px] rounded-2xl border-2 transition-all active:translate-y-[2px] ${activeTab === cat.id ? 'bg-blue-500 border-blue-600 text-white' : (darkMode ? 'bg-slate-800 border-slate-700 text-slate-400' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50')}`}>
                   <div className="mb-1">{React.cloneElement(cat.icon, { size: 24 })}</div>
                   <span className="text-[10px] font-black uppercase tracking-tighter">{cat.label}</span>
                 </button>
               ))}
             </div>
             <div className={`p-4 rounded-3xl border-2 ${darkMode ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                {activeTab === 'extras' ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
                        {inventory.filter(i => ['hat', 'accessory', 'theme', 'avatar_frame'].includes(i.item.category)).length === 0 && ( <p className="col-span-full text-center py-8 text-sm font-bold text-slate-400 uppercase tracking-widest">Nincsenek viselhető tárgyaid</p> )}
                        {inventory.filter(i => ['hat', 'accessory', 'theme', 'avatar_frame'].includes(i.item.category)).map(invItem => {
                            const dicebear = invItem.item.metadata?.dicebear || {};
                            const isActive = Object.keys(dicebear).length > 0 && Object.keys(dicebear).every(key => localConfig[key] === dicebear[key]);
                            return ( <button key={invItem.id} onClick={() => toggleItem(invItem)} className={`p-3 rounded-2xl border-2 text-[10px] font-black uppercase tracking-tighter transition-all active:translate-y-[2px] ${isActive ? 'bg-green-500 border-green-600 text-white shadow-lg' : (darkMode ? 'bg-slate-700 border-slate-600 text-slate-300' : 'bg-white border-slate-200 text-slate-600')}`}> {invItem.item.name} </button> );
                        })}
                    </div>
                ) : currentCategory?.colorParam ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex gap-3 overflow-x-auto py-2 no-scrollbar px-1">
                      {OPTIONS[currentCategory.colorParam].map((color) => (
                        <button key={color} onClick={() => updateConfig({ ...localConfig, [currentCategory.colorParam]: color })} className={`flex-shrink-0 w-12 h-12 rounded-2xl border-4 transition-all active:scale-95 active:translate-y-[2px] ${localConfig[currentCategory.colorParam] === color ? 'border-blue-500 scale-110 shadow-lg' : `border-white dark:border-slate-700 hover:scale-105 shadow-sm`}`} style={{ backgroundColor: color === 'transparent' ? '#fff' : `#${color}`, backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #eee 25%, transparent 25%), linear-gradient(-45deg, #eee 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #eee 75%), linear-gradient(-45deg, transparent 75%, #eee 75%)' : 'none', backgroundSize: color === 'transparent' ? '10px 10px' : 'auto' }} aria-label={`Színválasztás: #${color}`} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-relaxed"> Ennél az opciónál nincs választható szín.<br/> <span className="text-blue-500">Húzz az avataron az alakításhoz!</span> </p>
                  </div>
                )}
             </div>
          </div>
        </main>
      </div>
      <style>{` .pixelated { image-rendering: pixelated; } .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}</style>
    </div>
  );
}
