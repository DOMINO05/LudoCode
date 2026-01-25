import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';

const ProgressChart = ({ session }) => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const { data, error } = await supabase.rpc('get_user_stats');
                
                if (error) throw error;
                if (data) {
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch stats", err);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, [session]);

    if (loading) return <div className="text-center p-4 text-slate-500">Loading stats...</div>;

    if (!stats || (stats.activity.every(d => d.count === 0))) {
        return (
            <div className="p-8 text-center text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl">
                <p>Oldj meg több feladatot a statisztikákhoz!</p>
            </div>
        );
    }

    // Recharts doesn't fully support Tailwind classes in all sub-components, so we use some inline styles for colors
    // But we try to map them to our design system
    const chartTheme = {
        grid: '#94a3b8', // slate-400
        text: '#64748b', // slate-500
        tooltipBg: '#ffffff',
        tooltipBorder: '#e2e8f0',
        tooltipColor: '#1e293b'
    };

    return (
        <div className="flex flex-col gap-6 w-full">
            {/* Proficiency Chart */}
            <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6">
                <h4 className="text-center text-primary mb-4 font-bold text-lg">📈 Proficiency (Theta)</h4>
                <div className="h-64 w-full">
                    <ResponsiveContainer>
                        <LineChart data={stats.proficiencyHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} opacity={0.3} />
                            <XAxis 
                                dataKey="date" 
                                stroke={chartTheme.text} 
                                tickFormatter={date => date.substring(5)} 
                                fontSize={12} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                stroke={chartTheme.text} 
                                domain={['auto', 'auto']} 
                                fontSize={12} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: chartTheme.tooltipBg, 
                                    borderColor: chartTheme.tooltipBorder, 
                                    color: chartTheme.tooltipColor,
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }} 
                            />
                            <Line 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#0070f3" 
                                strokeWidth={3} 
                                dot={{ r: 4, fill: '#0070f3', strokeWidth: 2, stroke: '#fff' }} 
                                activeDot={{ r: 6 }} 
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Activity Chart */}
            <div className="bg-surface-light dark:bg-surface-dark border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm p-6">
                <h4 className="text-center text-success mb-4 font-bold text-lg">📊 Napi Aktivitás</h4>
                <div className="h-64 w-full">
                    <ResponsiveContainer>
                        <BarChart data={stats.activity}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.grid} vertical={false} opacity={0.3} />
                            <XAxis 
                                dataKey="date" 
                                stroke={chartTheme.text} 
                                tickFormatter={date => date.substring(5)} 
                                fontSize={12} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis 
                                stroke={chartTheme.text} 
                                allowDecimals={false} 
                                fontSize={12} 
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip 
                                contentStyle={{ 
                                    backgroundColor: chartTheme.tooltipBg, 
                                    borderColor: chartTheme.tooltipBorder, 
                                    color: chartTheme.tooltipColor,
                                    borderRadius: '8px',
                                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                                }} 
                                cursor={{fill: '#f1f5f9'}} 
                            />
                            <Bar dataKey="count" fill="#4caf50" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ProgressChart;
