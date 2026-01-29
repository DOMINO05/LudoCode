import React, { useMemo } from 'react';

export default function Avatar({ config, size = 100 }) {
    const { avatarUrl, containerStyle } = useMemo(() => {
        const style = 'pixel-art'; 
        
        // IMPORTANT: In v9, seed affects EVERYTHING. 
        // If we want consistent base features, we must use a consistent seed.
        const seed = config?.seed || 'user';
        
        const params = new URLSearchParams();
        params.append('seed', seed);
        
        // 1. Probabilities (Force 0 if not equipped, else 100)
        params.append('hatProbability', config?.hat ? '100' : '0');
        params.append('glassesProbability', config?.glasses ? '100' : '0');
        params.append('accessoriesProbability', config?.accessories ? '100' : '0');

        // 2. Identity (Colors must not have #)
        if (config?.skinColor) params.append('skinColor', config.skinColor.replace('#', ''));
        if (config?.hairColor) params.append('hairColor', config.hairColor.replace('#', ''));
        if (config?.clothingColor) params.append('clothingColor', config.clothingColor.replace('#', ''));
        if (config?.hatColor) params.append('hatColor', config.hatColor.replace('#', ''));
        if (config?.glassesColor) params.append('glassesColor', config.glassesColor.replace('#', ''));
        if (config?.accessoriesColor) params.append('accessoriesColor', config.accessoriesColor.replace('#', ''));

        // 3. Components (v9 Pixel Art valid values)
        if (config?.hair) params.append('hair', config.hair);
        if (config?.eyes) params.append('eyes', config.eyes);
        if (config?.mouth) params.append('mouth', config.mouth);
        if (config?.clothing) params.append('clothing', config.clothing);
        if (config?.hat) params.append('hat', config.hat);
        if (config?.glasses) params.append('glasses', config.glasses);
        if (config?.accessories) params.append('accessories', config.accessories);

        const url = `https://api.dicebear.com/9.x/${style}/svg?${params.toString()}`;

        // Background handling
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
                onError={(e) => {}}
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
