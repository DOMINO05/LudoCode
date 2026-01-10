import React, { useState, useEffect } from 'react';
import Avatar from './Avatar';
import { useNavigate } from 'react-router-dom';

export default function AvatarEditor({ config, onChange, inventory = [] }) {
    const navigate = useNavigate();
    const [localConfig, setLocalConfig] = useState(config || {
        style: 'pixel-art',
        seed: 'user-' + Math.random().toString(36).substring(7),
        backgroundColor: 'transparent'
    });

    useEffect(() => {
        if (config) {
            setLocalConfig(prev => ({ ...prev, ...config }));
        }
    }, [config]);

    const handleChange = (key, value) => {
        const newConfig = { ...localConfig, [key]: value };
        setLocalConfig(newConfig);
        onChange(newConfig);
    };

    const handleRandomize = () => {
        const newSeed = Math.random().toString(36).substring(7);
        handleChange('seed', newSeed);
    };

    // Filter inventory by category
    const frames = inventory.filter(i => i.item.category === 'avatar_frame');
    const hats = inventory.filter(i => i.item.category === 'hat');
    const accessories = inventory.filter(i => i.item.category === 'accessory');
    const pets = inventory.filter(i => i.item.category === 'pet');

    return (
        <div className="flex flex-col md:flex-row gap-8 items-start justify-center p-4">
            
            {/* Left Column: Preview */}
            <div className="flex flex-col items-center gap-4 sticky top-4">
                <div className="border-4 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden shadow-2xl bg-white dark:bg-slate-800 transition-all duration-300 hover:scale-105">
                    <Avatar config={localConfig} size={280} />
                </div>
                <button 
                    onClick={handleRandomize}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
                >
                    <span className="text-xl">🎲</span> Randomize Identity
                </button>
            </div>

            {/* Right Column: Controls */}
            <div className="flex-1 w-full max-w-md flex flex-col gap-6">
                
                {/* 1. Identity (Free) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-bold mb-4 text-slate-800 dark:text-white border-b pb-2 border-slate-100 dark:border-slate-700">
                        👤 Identity (Free)
                    </h3>
                    
                    <div className="space-y-4">
                        {/* Style is locked to Pixel Art */}
                        
                        <div className="grid grid-cols-2 gap-4">
                            <ControlGroup label="Skin / Primary">
                                <input 
                                    type="color" 
                                    value={localConfig.skinColor || '#f0c75e'} 
                                    onChange={(e) => handleChange('skinColor', e.target.value)}
                                    className="color-input"
                                />
                            </ControlGroup>
                            <ControlGroup label="Hair / Secondary">
                                <input 
                                    type="color" 
                                    value={localConfig.hairColor || '#4e342e'} 
                                    onChange={(e) => handleChange('hairColor', e.target.value)}
                                    className="color-input"
                                />
                            </ControlGroup>
                        </div>

                        <ControlGroup label="Background">
                            <div className="flex items-center gap-2">
                                <input 
                                    type="color" 
                                    value={localConfig.backgroundColor?.startsWith('#') ? localConfig.backgroundColor : '#ffffff'} 
                                    onChange={(e) => handleChange('backgroundColor', e.target.value)}
                                    className="color-input flex-1"
                                />
                                <button 
                                    onClick={() => handleChange('backgroundColor', 'transparent')}
                                    className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    Clear
                                </button>
                            </div>
                        </ControlGroup>
                    </div>
                </div>

                {/* 2. Status (Paid/Inventory) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 text-6xl">💎</div>
                    <div className="flex justify-between items-center mb-4 border-b pb-2 border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white">
                            🏆 Status (Inventory)
                        </h3>
                        <button onClick={() => navigate('/shop')} className="text-sm text-blue-500 hover:underline font-semibold">
                            Visit Shop →
                        </button>
                    </div>

                    <div className="space-y-4">
                        <InventorySelect 
                            label="🖼️ Frame" 
                            value={localConfig.frame} 
                            items={frames} 
                            onChange={(val) => handleChange('frame', val)} 
                        />
                        <InventorySelect 
                            label="🎩 Hat" 
                            value={localConfig.hat} 
                            items={hats} 
                            onChange={(val) => handleChange('hat', val)} 
                        />
                        <InventorySelect 
                            label="🕶️ Accessory" 
                            value={localConfig.accessory} 
                            items={accessories} 
                            onChange={(val) => handleChange('accessory', val)} 
                        />
                         <InventorySelect 
                            label="🐾 Pet" 
                            value={localConfig.pet} 
                            items={pets} 
                            onChange={(val) => handleChange('pet', val)} 
                        />
                    </div>
                </div>

            </div>

            <style>{`
                .input-field {
                    width: 100%;
                    padding: 0.5rem;
                    border-radius: 0.5rem;
                    border: 1px solid #e2e8f0;
                    background-color: #f8fafc;
                    color: #334155;
                    transition: all 0.2s;
                }
                .dark .input-field {
                    border-color: #475569;
                    background-color: #1e293b;
                    color: #f1f5f9;
                }
                .input-field:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
                }
                .color-input {
                    width: 100%;
                    height: 40px;
                    border-radius: 0.5rem;
                    cursor: pointer;
                    border: 1px solid #e2e8f0;
                }
                .dark .color-input {
                    border-color: #475569;
                }
            `}</style>
        </div>
    );
}

function ControlGroup({ label, children }) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">{label}</label>
            {children}
        </div>
    );
}

function InventorySelect({ label, value, items, onChange }) {
    return (
        <ControlGroup label={label}>
            <select 
                value={value || ''} 
                onChange={(e) => onChange(e.target.value || null)}
                className="input-field"
                disabled={items.length === 0}
            >
                <option value="">None</option>
                {items.map(i => (
                    <option key={i.id} value={i.item.name}>{i.item.name}</option>
                ))}
            </select>
            {items.length === 0 && (
                <p className="text-xs text-slate-400 italic mt-1">No items owned</p>
            )}
        </ControlGroup>
    );
}
