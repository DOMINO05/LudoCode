import React, { useMemo } from 'react';

export default function Avatar({ config, size = 100 }) {
    const { avatarUrl, containerStyle } = useMemo(() => {
        const style = 'pixel-art'; 
        const seed = config?.seed || 'user';
        
        const params = new URLSearchParams();
        params.append('seed', seed);
        
        // 1. Disable random paid items by default if NOT equipped
        if (!config?.hat) params.append('hatProbability', '0');
        if (!config?.glasses) params.append('glassesProbability', '0');
        if (!config?.accessories) params.append('accessoriesProbability', '0');

        // 2. Identity (Free)
        if (config?.skinColor) params.append('skinColor', config.skinColor.replace('#', ''));
        if (config?.hair) params.append('hair', config.hair);
        if (config?.hairColor) params.append('hairColor', config.hairColor.replace('#', ''));
        if (config?.eyes) params.append('eyes', config.eyes);
        if (config?.mouth) params.append('mouth', config.mouth);

        // 3. Status (Paid/Inventory)
        
        // Clothing
        if (config?.clothing) {
            params.append('clothing', config.clothing);
            if (config.clothingColor) params.append('clothingColor', config.clothingColor);
        } else {
            params.append('clothing', 'variant01');
        }

        // Hat (Paid)
        if (config?.hat) {
            params.append('hat', config.hat);
            params.append('hatProbability', '100');
            if (config.hatColor) params.append('hatColor', config.hatColor);
        }

        // Glasses (Paid)
        if (config?.glasses) {
            params.append('glasses', config.glasses);
            params.append('glassesProbability', '100');
            if (config.glassesColor) {
                params.append('glassesColor', config.glassesColor);
            } else {
                params.append('glassesColor', '000000'); // Default black
            }
        }

        // Accessories / Earrings (Paid)
        if (config?.accessories) {
            params.append('accessories', config.accessories); 
            params.append('accessoriesProbability', '100');
            
            if (config.accessoriesColor) {
                params.append('accessoriesColor', config.accessoriesColor);
            } else {
                // Default random metal
                const seedSum = seed.split('').reduce((a,b) => a + b.charCodeAt(0), 0);
                const metalColor = seedSum % 2 === 0 ? 'ffd700' : 'c0c0c0';
                params.append('accessoriesColor', metalColor);
            }
        }

        const url = `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;

        // Background
        let bgStyle = {};
        if (config?.background === 'gradient') {
            bgStyle = { background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)' };
        } else if (config?.backgroundColor) {
            const color = config.backgroundColor === 'transparent' || config.backgroundColor.startsWith('#')
                ? config.backgroundColor 
                : '#' + config.backgroundColor;
            bgStyle = { backgroundColor: color };
        } else {
            bgStyle = { backgroundColor: 'transparent' };
        }

        return { avatarUrl: url, containerStyle: bgStyle };
    }, [config]);

    const frameClass = config?.frame ? getFrameStyle(config.frame) : '';

    return (
        <div 
            className={`relative flex justify-center items-center overflow-hidden rounded-xl ${frameClass}`}
            style={{ 
                width: size, 
                height: size, 
                borderWidth: config?.frame ? '4px' : '0',
                ...containerStyle
            }}
        >
            <img 
                src={avatarUrl} 
                alt="User Avatar" 
                className="w-full h-full object-cover"
                loading="lazy"
                style={{ imageRendering: 'pixelated' }}
                onError={(e) => {
                    // console.error("Avatar failed to load:", avatarUrl);
                }}
            />
        </div>
    );
}

function getFrameStyle(frameName) {
    const styles = {
        'Gold': 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.5)]',
        'Neon': 'border-cyan-400 shadow-[0_0_10px_#22d3ee,inset_0_0_10px_#22d3ee]',
        'Pixel': 'border-dashed border-slate-900',
        'Wood': 'border-[#8b4513]'
    };
    return styles[frameName] || '';
}
