
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { useCalculator } from '../contexts/CalculatorContext';
import { MONTH_NAMES } from '../constants';

const MonthlyLoadChart: React.FC = () => {
    const { state, theme } = useCalculator();
    const { monthlyPeaks } = state;

    if (!monthlyPeaks || monthlyPeaks.length === 0) {
        return null;
    }

    const data = monthlyPeaks.map(item => ({
        name: MONTH_NAMES[parseInt(item.month, 10) - 1],
        peak: Math.round(item.peak),
        month: item.month
    }));

    const maxPeak = Math.max(...data.map(d => d.peak));
    const labelColor = theme === 'dark' ? '#f8fafc' : '#0f172a';

    return (
        <div className="h-[350px] w-full max-w-xl mx-auto mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={data}
                    margin={{ top: 30, right: 30, left: 20, bottom: 20 }}
                    barCategoryGap="5%"
                >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                        dataKey="name" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                    />
                    <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        unit=" kW"
                        tickFormatter={(value) => (value / 1000).toFixed(2)}
                    />
                    <Tooltip
                        cursor={false}
                        contentStyle={{ 
                            borderRadius: '12px', 
                            border: 'none', 
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                            padding: '12px'
                        }}
                        formatter={(value: number) => [`${(value / 1000).toFixed(2)} kW`, 'Szczytowe obciążenie']}
                    />
                    <Bar 
                        dataKey="peak" 
                        radius={[6, 6, 0, 0]}
                        activeBar={{ fillOpacity: 1, stroke: '#fff', strokeWidth: 1 }}
                    >
                        {data.map((entry, index) => (
                            <Cell 
                                key={`cell-${index}`} 
                                fill={entry.peak === maxPeak ? '#ef4444' : '#3b82f6'} 
                                fillOpacity={entry.peak === maxPeak ? 0.9 : 0.7}
                            />
                        ))}
                        <LabelList 
                            dataKey="peak" 
                            position="top" 
                            style={{ fill: labelColor, fontSize: 13, fontWeight: 800 }}
                            formatter={(val: number) => `${(val / 1000).toFixed(2)} kW`}
                        />
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default MonthlyLoadChart;
