import React, { useState, useEffect, useRef } from 'react';
import { Download, Moon, Sun, Palette, Smile, Eye, User, Sparkles, ChevronLeft, ChevronRight, RefreshCw, Star } from 'lucide-react';
import Avatar from './Avatar';

// --- KONFIGURÁCIÓ ÉS ADATOK (PIXEL-ART STÍLUS) ---

const OPTIONS = {
  // Színek (Pixel Art kompatibilis hex kódok)
  skinColor: ['ffe4c0', 'f5d0a9', 'e8b88d', 'd49d7b', 'b67b5e', '8d5441', '5d3428'],
  hairColor: ['000000', '4a4a4a', 'ffffff', 'b8b8b8', '8d2a2a', 'c54b29', 'e2ba4f', '6a4e23', '3b6e85'],
  // Glasses/Accessories colors usually fixed or specific, but we keep structure
  glassesColor: ['000000'], 
  mouthColor: [], 
  backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9', 'ffd5dc', 'ffdfbf', 'ffffff', '65c9ff', '58cc02', '1a1a1a', 'transparent'],
  
  // Pixel Art specifikus értékek
  hair: ['short01', 'short02', 'short03', 'short04', 'short05', 'short06', 'short07', 'short08', 'short09', 'short10', 'short11', 'short12', 'short13', 'short14', 'short15', 'short16', 'short17', 'short18', 'short19', 'short20', 'short21', 'short22', 'short23', 'short24', 'long01', 'long02', 'long03', 'long04', 'long05', 'long06', 'long07', 'long08', 'long09', 'long10', 'long11', 'long12', 'long13', 'long14', 'long15', 'long16', 'long17', 'long18', 'long19', 'long20', 'long21'],
  eyes: ['variant01', 'variant02', 'variant03', 'variant04', 'variant05', 'variant06', 'variant07', 'variant08', 'variant09', 'variant10', 'variant11', 'variant12'],
  mouth: ['happy01', 'happy02', 'happy03', 'happy04', 'happy05', 'happy06', 'happy07', 'happy08', 'happy09', 'happy10', 'happy11', 'happy12', 'happy13',  'sad01', 'sad02', 'sad03', 'sad04', 'sad05', 'sad06', 'sad07', 'sad08', 'sad09', 'sad10'],
};

// Defaults for unequipped state
const DEFAULTS = {
    clothing: 'variant01',
    hat: null,
    glasses: null,
    accessories: null,
    background: 'transparent', // Default if no bg selected
    frame: null
};

// Kategória definíciók
const CATEGORIES = [
  { id: 'hair', label: 'Haj', icon: <Sparkles size={20} />, swipeParam: 'hair', colorParam: 'hairColor' },
  { id: 'eyes', label: 'Szem', icon: <Eye size={20} />, swipeParam: 'eyes', colorParam: null },
  { id: 'mouth', label: 'Száj', icon: <Smile size={20} />, swipeParam: 'mouth', colorParam: null },
  { id: 'skin', label: 'Bőr', icon: <User size={20} />, swipeParam: null, colorParam: 'skinColor' },
  { id: 'bg', label: 'Háttér', icon: <RefreshCw size={20} />, swipeParam: null, colorParam: 'backgroundColor' },
  { id: 'extras', label: 'Extrák', icon: <Star size={20} />, swipeParam: null, colorParam: null }, // Inventory items
];

export default function AvatarEditor({ config, onChange, inventory = [] }) {
  const [activeTab, setActiveTab] = useState('hair');
  const [darkMode, setDarkMode] = useState(false);
  
  // Local state for immediate feedback, synced with parent via useEffect
  const [localConfig, setLocalConfig] = useState(config || {
    skinColor: 'f5d0a9',
    hair: 'short01',
    hairColor: '6a4e23',
    eyes: 'variant01',
    mouth: 'variant01',
    clothing: 'variant01',
    backgroundColor: 'b6e3f4',
    seed: 'user'
  });

  useEffect(() => {
    if (config) {
        setLocalConfig(prev => ({ ...prev, ...config }));
    }
  }, [config]);

  // Update parent on change
  const updateConfig = (newConfig) => {
      setLocalConfig(newConfig);
      onChange(newConfig);
  };

  // Érték váltása (Next/Prev)
  const changeValue = (param, direction) => {
    if (!param || !OPTIONS[param]) return;
    
    const optionsList = OPTIONS[param];
    const currentIndex = optionsList.indexOf(localConfig[param]);
    let newIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    
    // Körkörös lista logika
    if (newIndex >= optionsList.length) newIndex = 0;
    if (newIndex < 0) newIndex = optionsList.length - 1;
    
    updateConfig({ ...localConfig, [param]: optionsList[newIndex] });
  };

  // Randomize
  const handleRandomize = () => {
      const newSeed = Math.random().toString(36).substring(7);
      updateConfig({ ...localConfig, seed: newSeed });
  };

  // Swipe kezelés
  const touchStartX = useRef(null);
  
  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    const currentCategory = CATEGORIES.find(c => c.id === activeTab);

    if (currentCategory && currentCategory.swipeParam) {
        // Minimum 30px húzás kell
        if (Math.abs(diff) > 30) {
        if (diff > 0) {
            // Swipe Left -> Next item
            changeValue(currentCategory.swipeParam, 'next');
        } else {
            // Swipe Right -> Prev item
            changeValue(currentCategory.swipeParam, 'prev');
        }
        }
    }
    touchStartX.current = null;
  };

  const toggleItem = (invItem) => {
      const dicebear = invItem.item.metadata?.dicebear || {};
      
      // Check if equipped (all DiceBear keys must match)
      const isEquipped = Object.keys(dicebear).length > 0 && Object.keys(dicebear).every(key => localConfig[key] === dicebear[key]);

      if (isEquipped) {
          // Unequip: Restore defaults
          const newConfig = { ...localConfig };
          Object.keys(dicebear).forEach(key => {
              newConfig[key] = DEFAULTS[key] !== undefined ? DEFAULTS[key] : null;
          });
          updateConfig(newConfig);
      } else {
          // Equip: Merge DiceBear values
          updateConfig({ ...localConfig, ...dicebear });
      }
  };

  const currentCategory = CATEGORIES.find(c => c.id === activeTab);

  return (
    <div className={`font-sans flex justify-center transition-colors duration-300 ${darkMode ? 'bg-slate-900 text-white' : 'bg-gray-100 text-slate-700'}`}>
      
      <div className={`w-full max-w-md flex flex-col shadow-2xl relative overflow-hidden transition-colors duration-300 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white'}`} style={{ minHeight: '600px', borderRadius: '20px' }}>
        
        {/* Fejléc eltávolítva */}

        {/* Fő Tartalom */}
        <main className="flex-1 flex flex-col">
          
          {/* Avatar Megjelenítő + Swipe Zóna */}
          <div 
            className={`flex-1 relative flex items-center justify-center overflow-hidden select-none ${darkMode ? 'bg-slate-900/50' : 'bg-gray-50'}`}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            style={{ minHeight: '300px' }}
          >
            
            {/* Navigációs Nyilak */}
            {currentCategory?.swipeParam && (
              <>
                <button 
                   onClick={() => changeValue(currentCategory.swipeParam, 'prev')}
                   className="absolute left-2 z-30 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-all"
                >
                  <ChevronLeft size={24} />
                </button>
                <button 
                   onClick={() => changeValue(currentCategory.swipeParam, 'next')}
                   className="absolute right-2 z-30 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-all"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            {/* Középső (Aktuális) Avatar */}
            <div className="relative z-10 w-64 h-64 sm:w-80 sm:h-80 transition-all duration-300 transform hover:scale-105">
               <Avatar config={localConfig} size="100%" />
            </div>
            
            {/* Instrukció overlay */}
            {currentCategory?.swipeParam && (
               <div className={`absolute bottom-4 text-xs font-bold uppercase tracking-widest opacity-60 ${darkMode ? 'text-white' : 'text-slate-400'}`}>
                 Húzz balra/jobbra
               </div>
            )}
          </div>

          {/* Alsó Vezérlőpanel */}
          <div className={`pb-8 pt-4 px-4 rounded-t-3xl -mt-6 z-20 border-t-2 ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]'}`}>
             
             {/* Kategória Tabok */}
             <div className="flex justify-between mb-6 overflow-x-auto no-scrollbar">
               {CATEGORIES.map((cat) => (
                 <button
                   key={cat.id}
                   onClick={() => setActiveTab(cat.id)}
                   className={`
                     flex flex-col items-center gap-1 p-2 min-w-[60px] rounded-xl transition-all
                     ${activeTab === cat.id 
                       ? (darkMode ? 'text-[#58cc02]' : 'text-[#58cc02] scale-110 font-bold') 
                       : (darkMode ? 'text-slate-500 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600')}
                   `}
                 >
                   <div className={`p-3 rounded-2xl ${activeTab === cat.id ? 'bg-[#58cc02]/20' : 'bg-transparent'}`}>
                     {cat.icon}
                   </div>
                   <span className="text-xs">{cat.label}</span>
                 </button>
               ))}
             </div>

             {/* Tartalom: Színválasztó vagy Extrák */}
             <div className="min-h-[100px]">
                {activeTab === 'extras' ? (
                    <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                        {inventory.filter(i => ['hat', 'accessory', 'theme', 'avatar_frame'].includes(i.item.category)).length === 0 && (
                            <p className="col-span-3 text-center text-sm text-gray-500">Nincsenek megvásárolt, viselhető tárgyaid.</p>
                        )}
                        {inventory.filter(i => ['hat', 'accessory', 'theme', 'avatar_frame'].includes(i.item.category)).map(invItem => {
                            const dicebear = invItem.item.metadata?.dicebear || {};
                            // Determine if active
                            const isActive = Object.keys(dicebear).length > 0 && Object.keys(dicebear).every(key => localConfig[key] === dicebear[key]);
                            
                            return (
                                <button
                                    key={invItem.id}
                                    onClick={() => toggleItem(invItem)}
                                    className={`p-2 rounded-lg border-2 text-xs font-bold truncate ${isActive ? 'border-[#58cc02] bg-[#58cc02]/10' : 'border-gray-200'}`}
                                >
                                    {invItem.item.name}
                                </button>
                            );
                        })}
                    </div>
                ) : currentCategory?.colorParam ? (
                  <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <h3 className={`text-xs font-bold uppercase tracking-widest mb-1 ${darkMode ? 'text-slate-400' : 'text-slate-400'}`}>
                      {currentCategory.label} Színe
                    </h3>
                    <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar px-1">
                      {OPTIONS[currentCategory.colorParam].map((color) => (
                        <button
                          key={color}
                          onClick={() => updateConfig({ ...localConfig, [currentCategory.colorParam]: color })}
                          className={`
                            flex-shrink-0 w-12 h-12 rounded-full border-4 transition-transform active:scale-90
                            ${localConfig[currentCategory.colorParam] === color 
                              ? 'border-[#58cc02] scale-110 shadow-lg' 
                              : `border-transparent hover:scale-105 ${darkMode ? 'shadow-none' : 'shadow-sm'}`}
                          `}
                          style={{ backgroundColor: color === 'transparent' ? '#fff' : `#${color}`, backgroundImage: color === 'transparent' ? 'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)' : 'none' }}
                          aria-label={`Színválasztás: #${color}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className={`text-center py-4 text-sm ${darkMode ? 'text-slate-500' : 'text-slate-400'}`}>
                    Ennél az opciónál nincs választható szín.<br/>Használd a fenti területet a formák váltásához!
                  </div>
                )}
             </div>
          </div>
        </main>

      </div>
      
      <style>{`
        .pixelated {
          image-rendering: pixelated;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
