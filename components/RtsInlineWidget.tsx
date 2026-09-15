import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import { useCalculator } from '../contexts/CalculatorContext';
import { RTS_PRESET_IDS, RTS_PRESETS } from '../data/rtsPresets';
import { Info } from 'lucide-react';

interface RtsInlineWidgetProps {
    roomId: string;
}

const RtsInlineWidget: React.FC<RtsInlineWidgetProps> = ({ roomId }) => {
    const { state, theme } = useCalculator();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const [gainType, setGainType] = useState<'solar' | 'non_solar'>('solar');

    const room = state.rooms.find(r => r.id === roomId);
    const floorType = room?.accumulation?.floorType || 'carpet';
    const glassPercentage = room?.accumulation?.glassPercentage || 50;
    const rtsPreset = room?.accumulation?.rtsPreset || 'heavy';

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

        const datasets = RTS_PRESET_IDS.map(presetId => {
            const dataKey = gainType === 'non_solar' ? 'nonsolar' : 'solar';
            const data = state.allData?.rts?.[presetId]?.[floorType]?.[selectedGlassP]?.[dataKey] || [];
            const isSelected = rtsPreset === presetId;
            const color = RTS_PRESETS[presetId].color;
            return {
                type: 'bar' as const,
                label: RTS_PRESETS[presetId].label,
                data: data,
                borderColor: color,
                backgroundColor: isSelected ? color : `${color}2e`,
                hoverBackgroundColor: color,
                borderWidth: isSelected ? 1 : 0,
                hoverBorderWidth: 1,
                barPercentage: 0.98,
                categoryPercentage: 0.92,
                borderRadius: 0,
                order: isSelected ? 0 : 1,
            };
        });

        if (chartInstanceRef.current) {
            const chart = chartInstanceRef.current;
            chart.data.datasets = datasets as any;
            
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
                type: 'bar',
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
                            suggestedMax: 0.7,
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
                            labels: { color: textColor, font: { size: 10 }, usePointStyle: true, boxWidth: 6 }
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

    }, [theme, state.allData, gainType, floorType, selectedGlassP, rtsPreset, roomId]);

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
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800 dark:text-white leading-tight">Podgląd współczynników RTF</h3>
                    <div className="relative group cursor-help">
                        <Info className="w-5 h-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300" />
                        <div className="absolute hidden group-hover:block z-50 w-72 p-3 bg-slate-800 text-white text-xs rounded-lg shadow-xl -left-2 top-8 tooltip-triangle font-normal">
                            RTF - Radiant Time Factors, czyli współczynniki opisujące, jak wybrany typ budynku lub pomieszczenia opóźnia zyski radiacyjne w metodzie Radiant Time Series.
                        </div>
                    </div>
                </div>
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
