import React, { useMemo } from 'react';

// Mapping for overlay assets (Paid/Status items)
const OVERLAYS = {
    hat: {
        'Wizard Hat': '🧙‍♂️',
        'Crown': '👑',
        'Space Helmet': '👨‍🚀',
        'Cap': '🧢'
    },
    accessory: {
        'Sunglasses': '🕶️',
        'Mask': '😷',
        'Monocle': '🧐'
    },
    pet: {
        'Cat': '🐱',
        'Dog': '🐶',
        'Dragon': '🐉',
        'Robot': '🤖'
    },
    frame: {
        'Gold': 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]',
        'Neon': 'border-cyan-400 shadow-[0_0_10px_#22d3ee,inset_0_0_10px_#22d3ee]',
        'Pixel': 'border-dashed border-slate-900',
        'Wood': 'border-[#8b4513]'
    }
};

export default function Avatar({ config, size = 100 }) {
    const avatarUrl = useMemo(() => {
        // Enforce pixel-art style
        const style = 'pixel-art'; 
        const seed = config?.seed || 'user';
        
        const params = new URLSearchParams();
        params.append('seed', seed);
        
        // Pass generic DiceBear options
        // We filter out our custom overlay keys
        if (config) {
            Object.keys(config).forEach(key => {
                if (!['style', 'seed', 'hat', 'accessory', 'pet', 'frame'].includes(key)) {
                    params.append(key, config[key]);
                }
            });
        }

        return `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;
    }, [config]);

    const frameClass = config?.frame ? OVERLAYS.frame[config.frame] || '' : '';

    return (
        <div 
            className={`relative flex justify-center items-center overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800 ${frameClass}`}
            style={{ 
                width: size, 
                height: size, 
                borderWidth: config?.frame ? '4px' : '0'
            }}
        >
            {/* DiceBear Base Layer (Identity) */}
            <img 
                src={avatarUrl} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
                loading="lazy"
            />

            {/* Overlay Layers (Status) */}
            
            {/* Hat - Positioned roughly on top center */}
            {config?.hat && (
                <div 
                    className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/4 text-4xl filter drop-shadow-lg"
                    style={{ fontSize: size * 0.4 }}
                >
                    {OVERLAYS.hat[config.hat] || config.hat}
                </div>
            )}

            {/* Accessory - Positioned roughly on eyes/face */}
            {config?.accessory && (
                <div 
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 text-4xl filter drop-shadow-md"
                    style={{ fontSize: size * 0.3 }}
                >
                    {OVERLAYS.accessory[config.accessory] || config.accessory}
                </div>
            )}

            {/* Pet - Positioned bottom right */}
            {config?.pet && (
                <div 
                    className="absolute bottom-0 right-0 text-3xl filter drop-shadow-md transform translate-x-1/4 translate-y-1/4"
                    style={{ fontSize: size * 0.35 }}
                >
                    {OVERLAYS.pet[config.pet] || config.pet}
                </div>
            )}
        </div>
    );
}
