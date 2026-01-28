import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * A reusable BackButton component that follows the app's Duolingo-like aesthetic.
 * 
 * @param {string|number} to - The destination path or navigation delta (default: -1)
 * @param {string} className - Optional additional CSS classes
 * @param {string} label - Optional label text (default: "Vissza")
 */
export default function BackButton({ to = -1, className = "", label = "Vissza" }) {
    const navigate = useNavigate();

    return (
        <button
            onClick={() => navigate(to)}
            className={`flex items-center gap-3 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all group ${className}`}
        >
            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 border-b-4 group-active:border-b-2 group-active:translate-y-[2px] shadow-sm transition-all">
                <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
            </div>
            {label && (
                <span className="uppercase tracking-widest text-xs font-black hidden sm:inline">
                    {label}
                </span>
            )}
        </button>
    );
}
