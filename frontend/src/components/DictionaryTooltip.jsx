import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';

const DictionaryTooltip = ({ word, definition }) => {
    const [show, setShow] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, placement: 'top' });
    const spanRef = useRef(null);

    const handleMouseEnter = () => {
        if (spanRef.current) {
            const rect = spanRef.current.getBoundingClientRect();
            // Calculate center position
            const left = rect.left + rect.width / 2;
            
            // Check space above (safe buffer ~150px)
            // If < 150px from viewport top, show BELOW.
            const TOOLTIP_HEIGHT = 150; 
            let placement = 'top';
            let top = rect.top; // Default anchor

            if (rect.top < TOOLTIP_HEIGHT) { 
                placement = 'bottom';
                top = rect.bottom;
            } else {
                placement = 'top';
                top = rect.top;
            }

            setCoords({ top, left, placement });
        }
        setShow(true);
    };

    return (
        <>
            <span 
                ref={spanRef}
                className="relative inline-block cursor-help border-b-2 border-dotted border-blue-500 hover:border-blue-600 dark:border-blue-400 dark:hover:border-blue-300 transition-colors"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setShow(false)}
            >
                {word}
            </span>
            {show && createPortal(
                <div 
                    className={`fixed z-[9999] w-64 p-3 rounded-lg shadow-xl text-sm animate-in fade-in 
                        bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 pointer-events-none
                        ${coords.placement === 'top' 
                            ? 'slide-in-from-bottom-1 mb-2' 
                            : 'slide-in-from-top-1 mt-2'}
                    `}
                    style={{
                        left: coords.left,
                        top: coords.top,
                        transform: `translateX(-50%) ${coords.placement === 'top' ? 'translateY(-100%)' : ''}`,
                    }}
                >
                    <div className="font-bold mb-1 text-blue-600 dark:text-blue-400 capitalize">{word}</div>
                    <div className="leading-snug text-xs opacity-90">{definition}</div>
                    
                    {/* Arrow */}
                    <div className={`absolute left-1/2 transform -translate-x-1/2 border-4 border-transparent 
                        ${coords.placement === 'top' 
                            ? 'top-full -mt-1 border-t-white dark:border-t-slate-800' 
                            : 'bottom-full -mb-1 border-b-white dark:border-b-slate-800'}
                    `}></div>
                </div>,
                document.body
            )}
        </>
    );
};

export default DictionaryTooltip;
