import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { useCalculator } from '../contexts/CalculatorContext';
import { THERMAL_MASS_OPTIONS } from './ui/CustomThermalMassSelect';

interface RtsInlineWidgetProps {
    roomId: string;
}

const COLORS: Record<string, string> = {
    light: '#3b82f6', // blue-500
    medium: '#10b981', // emerald-500
    heavy: '#f59e0b', // amber-500
    very_heavy: '#8b5cf6', // violet-500
};

const RtsInlineWidget: React.FC<RtsInlineWidgetProps> = ({ roomId }) => {
    const { state, theme } = useCalculator();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const [gainType, setGainType] = useState<'solar' | 'non_solar'>('solar');

    const room = state.rooms.find(r => r.id === roomId);
    const floorType = room?.accumulation?.floorType || 'carpet';
    const glassPercentage = room?.accumulation?.glassPercentage || 50;
    const thermalMass = room?.accumulation?.thermalMass || 'medium';

    let selectedGlassP: 10 | 50 | 90 = 50;
    if (glassPercentage <= 30) selectedGlassP = 10;
    else if (glassPercentage <= 70) selectedGlassP = 50;
    else selectedGlassP = 90;

    useEffect(() => {
        if (!room || !chartRef.current || !state.allData) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        const isDarkMode = theme === 'dark';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#ecf0f1' : '#333';

        const datasets = Object.keys(THERMAL_MASS_OPTIONS).map(massType => {
            const dataKey = gainType === 'non_solar' ? 'nonsolar' : 'solar';
            const data = state.allData?.rts?.[massType]?.[floorType]?.[selectedGlassP]?.[dataKey] || [];
            const isSelected = thermalMass === massType;
            return {
                label: THERMAL_MASS_OPTIONS[massType].label,
                data: data,
                borderColor: COLORS[massType],
                backgroundColor: COLORS[massType],
                fill: false,
                tension: 0.3,
                borderWidth: isSelected ? 3 : 1.5,
                borderDash: isSelected ? [] : [5, 5],
                pointRadius: 3,
                pointHoverRadius: 6,
                zIndex: isSelected ? 10 : 0,
            };
        });

        if (chartInstanceRef.current) {
            const chart = chartInstanceRef.current;
            // Update individual datasets in-place to trigger smooth value transitions
            datasets.forEach((newD, i) => {
                if (chart.data.datasets[i]) {
                    chart.data.datasets[i].data = [...newD.data];
                    chart.data.datasets[i].borderColor = newD.borderColor;
                    chart.data.datasets[i].backgroundColor = newD.backgroundColor;
                    chart.data.datasets[i].borderWidth = newD.borderWidth;
                    chart.data.datasets[i].borderDash = newD.borderDash;
                    chart.data.datasets[i].zIndex = newD.zIndex;
                }
            });
            
            if (chart.options.scales?.x) {
                if (chart.options.scales.x.title) {
                    chart.options.scales.x.title.color = textColor;
                }
                if (chart.options.scales.x.ticks) {
                    chart.options.scales.x.ticks.color = textColor;
                }
            }
            if (chart.options.scales?.y) {
                if (chart.options.scales.y.title) {
                    chart.options.scales.y.title.color = textColor;
                }
                if (chart.options.scales.y.ticks) {
                    chart.options.scales.y.ticks.color = textColor;
                }
                if (chart.options.scales.y.grid) {
                    chart.options.scales.y.grid.color = gridColor;
                }
            }
            if (chart.options.plugins?.legend?.labels) {
                chart.options.plugins.legend.labels.color = textColor;
            }
            
            chart.update();
        } else {
            const labels = Array.from({ length: 24 }, (_, i) => `${i}`);
            chartInstanceRef.current = new Chart(ctx, {
                type: 'line',
                data: { labels, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false,
                    },
                    scales: {
                        x: {
                            title: { display: true, text: 'Godzina', color: textColor, font: { size: 11 } },
                            ticks: { color: textColor, font: { size: 10 }, maxTicksLimit: 24 },
                            grid: { display: false }
                        },
                        y: {
                            title: { display: true, text: 'Współczynnik RTS (%)', color: textColor, font: { size: 11 } },
                            min: 0,
                            max: 0.6,
                            ticks: { 
                                color: textColor, 
                                font: { size: 10 }, 
                                maxTicksLimit: 6,
                                callback: (value) => `${(Number(value) * 100).toFixed(0)}%`
                            },
                            grid: { color: gridColor },
                            beginAtZero: true
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { color: textColor, font: { size: 11 }, usePointStyle: true, boxWidth: 6 }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context: any) => {
                                    return `${context.dataset.label}: ${(context.parsed.y * 100).toFixed(1)}%`;
                                }
                            }
                        }
                    }
                }
            });
        }

    }, [theme, state.allData, gainType, floorType, selectedGlassP, thermalMass, roomId]);

    useEffect(() => {
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, []);

    if (!room) return null;

    return (
        <div className="flex flex-col h-full pl-2">
            <div className="flex justify-end mb-2">
                <div className="bg-slate-100 dark:bg-slate-800 p-1 rounded-lg inline-flex">
                    <button
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${gainType === 'solar' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        onClick={() => setGainType('solar')}
                    >
                        Radiacja (Solar)
                    </button>
                    <button
                        className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${gainType === 'non_solar' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                        onClick={() => setGainType('non_solar')}
                    >
                        Zyski Wew. (Non-Solar)
                    </button>
                </div>
            </div>
            <div className="w-full flex-1 min-h-[260px] opacity-95 transition-opacity">
                <canvas ref={chartRef}></canvas>
            </div>
        </div>
    );
};

export default RtsInlineWidget;
