
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import { ArrowsExpandIcon, ArrowsShrinkIcon, ChartBarIcon, ChartLineIcon } from './Icons';
import { ANALYSIS_MONTHS } from '../constants';

import { getChartColor, CHART_COLORS, updateChartSmoothly } from '../lib/chartUtils';

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

const HeatGainChart: React.FC = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const { state, dispatch, theme } = useCalculator();
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreenChange = useCallback(() => {
        setIsFullscreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
    }, [handleFullscreenChange]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.resize();
            }
        }, 100);
        return () => clearTimeout(timer);
    }, [isFullscreen]);

    const toggleFullscreen = async () => {
        const element = chartContainerRef.current;
        if (!element) return;
        try {
            if (!document.fullscreenElement) {
                if (element.requestFullscreen) {
                    await element.requestFullscreen();
                } else if ((element as any).webkitRequestFullscreen) {
                    await (element as any).webkitRequestFullscreen();
                }
                
                // Try to lock orientation to landscape on mobile
                if (window.screen.orientation && window.innerWidth < 1024) {
                    try {
                        await (window.screen.orientation as any).lock('landscape');
                    } catch (e) {
                        console.warn("Screen orientation lock failed:", e);
                    }
                }
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
                } else if ((document as any).webkitExitFullscreen) {
                    await (document as any).webkitExitFullscreen();
                }
                
                if (window.screen.orientation && window.screen.orientation.unlock) {
                    window.screen.orientation.unlock();
                }
            }
        } catch (err) {
            console.error(`Error with fullscreen API: ${(err as Error).message}`, err);
        }
    };

    useEffect(() => {
        if (!chartRef.current || !state.activeResults) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;
        
        const month = parseInt(state.currentMonth, 10);
        const isSummerTime = (month >= 4 && month <= 10);
        const offset = isSummerTime ? 2 : 1;

        const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        const isDarkMode = theme === 'dark';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#ecf0f1' : '#333';
        
        const { finalGains, loadComponents } = state.activeResults;
        const hasTempData = state.tExtProfile && state.tExtProfile.length === 24;
        const chartType = state.chartType;

        let datasets: any[];

        if (chartType === 'line') {
            datasets = [
                { type: 'line', label: 'Obciążenie chłodnicze projektowe', data: reorderDataForLocalTime(finalGains.clearSky.total, offset), borderColor: getChartColor('totalSensible'), backgroundColor: 'rgba(231, 76, 60, 0.2)', fill: true, tension: 0.3, yAxisID: 'yLoad' }
            ];
        } else { // bar chart
             datasets = [
                { type: 'bar', label: 'Słoneczne', data: reorderDataForLocalTime(loadComponents.solar, offset), backgroundColor: getChartColor('solar'), stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Przewodzenie', data: reorderDataForLocalTime(loadComponents.conduction, offset), backgroundColor: getChartColor('conduction'), stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Wewn. Jawne', data: reorderDataForLocalTime(loadComponents.internalSensible, offset), backgroundColor: getChartColor('internal', false), stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Wentylacja Jawna', data: reorderDataForLocalTime(loadComponents.ventilationSensible, offset), backgroundColor: getChartColor('ventilation', false), stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Infiltracja Jawna', data: reorderDataForLocalTime(loadComponents.infiltrationSensible, offset), backgroundColor: getChartColor('infiltration', false), stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Utajone (wewn. + went. + inf.)', data: reorderDataForLocalTime(finalGains.clearSky.latent, offset), backgroundColor: getChartColor('totalLatent', true), borderColor: CHART_COLORS.totalLatent, borderWidth: 1, stack: 'a', yAxisID: 'yLoad' }
            ];
        }

        if (hasTempData) {
            datasets.push({
                type: 'line',
                label: 'Temperatura zewnętrzna',
                data: reorderDataForLocalTime(state.tExtProfile, offset),
                borderColor: isDarkMode ? '#94a3b8' : '#64748b',
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                yAxisID: 'yTemp',
                tension: 0.3,
                order: -1
            });
        }

        const chartConfig: any = {
            type: chartType,
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 500 // Enable animations
                },
                scales: {
                    x: { title: { display: true, text: `Godzina (czas lokalny)`, color: textColor }, ticks: { color: textColor }, grid: { color: gridColor }, stacked: chartType === 'bar' },
                    yLoad: { 
                        type: 'linear',
                        display: true,
                        position: 'left',
                        title: { display: true, text: 'Obciążenie chłodnicze (kW)', color: textColor }, 
                        ticks: { 
                            color: textColor,
                            callback: function(value) {
                                return (Number(value) / 1000).toFixed(2);
                            }
                        }, 
                        grid: { color: gridColor }, 
                        stacked: chartType === 'bar'
                    },
                    yTemp: {
                         type: 'linear',
                         display: hasTempData,
                         position: 'right',
                         title: { display: true, text: 'Temperatura (°C)', color: textColor },
                         ticks: { color: textColor },
                         grid: { drawOnChartArea: false },
                    }
                },
                plugins: {
                    title: { display: true, text: 'Godzinowe obciążenie chłodnicze', color: textColor, font: { size: 16 } },
                    legend: { labels: { color: textColor } },
                    tooltip: { 
                        mode: 'index',
                        callbacks: {
                            label: (context: any) => {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    if (context.dataset.yAxisID === 'yTemp') {
                                        label += context.parsed.y.toFixed(1) + ' °C';
                                    } else {
                                        label += (context.parsed.y / 1000).toFixed(2) + ' kW';
                                    }
                                }
                                return label;
                            },
                            footer: (tooltipItems: any[]) => {
                                if (chartType === 'bar') {
                                    let sum = 0;
                                    tooltipItems.forEach(tooltipItem => {
                                        if (tooltipItem.dataset.stack === 'a') {
                                            sum += tooltipItem.parsed.y;
                                        }
                                    });
                                    return 'Suma: ' + (sum / 1000).toFixed(2) + ' kW';
                                }
                                return '';
                            },
                        },
                    },
                }
            }
        };

        if (chartInstanceRef.current && chartInstanceRef.current.config.type === chartConfig.type) {
            updateChartSmoothly(chartInstanceRef.current, chartConfig);
        } else {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
            chartInstanceRef.current = new Chart(ctx, chartConfig);
        }

    }, [state.activeResults, state.chartType, theme, state.tExtProfile, state.currentMonth]);

    useEffect(() => {
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, []);

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'RECALCULATE_VIEW', payload: e.target.value });
    };

    const availableMonths = ANALYSIS_MONTHS.ARRAY;

    return (
        <Card className="flex flex-col !p-0 overflow-hidden h-full flex-grow border-slate-200 dark:border-slate-700">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-100 dark:border-slate-700 h-[73px] flex flex-row items-center justify-between gap-4 overflow-x-auto no-scrollbar">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <label htmlFor="month-selector" className="font-semibold text-slate-800 dark:text-white whitespace-nowrap">Miesiąc analizy:</label>
                        <select id="month-selector" value={state.currentMonth} onChange={handleMonthChange} className="p-2 rounded-md bg-white dark:bg-slate-700 text-slate-800 dark:text-white border border-slate-200 dark:border-slate-600 focus:ring-2 focus:ring-blue-500 cursor-pointer text-sm font-medium min-w-[120px] capitalize shadow-sm focus:outline-none">
                            {availableMonths.map((monthIndex) => (
                                <option key={monthIndex} value={monthIndex}>
                                    {new Date(0, monthIndex - 1).toLocaleString('pl-PL', { month: 'long' })}
                                </option>
                            ))}
                        </select>
                    </div>
                    
                    {state.monthlyPeaks && state.monthlyPeaks.length > 0 && (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                            Miesiąc maksymalny: <strong className="text-slate-700 dark:text-slate-300 capitalize">
                                {new Date(0, parseInt(state.monthlyPeaks.reduce((max: any, current: any) => max.peak > current.peak ? max : current, state.monthlyPeaks[0]).month, 10) - 1).toLocaleString('pl-PL', { month: 'long' })}
                            </strong>
                        </span>
                    )}
                </div>
                
                <div className="flex items-center bg-slate-200/50 dark:bg-slate-700/50 p-1 rounded-lg">
                    <button 
                        onClick={() => state.chartType !== 'line' && dispatch({type: 'TOGGLE_CHART_TYPE'})}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${state.chartType === 'line' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <ChartLineIcon className="w-4 h-4" /> Liniowy
                    </button>
                    <button 
                        onClick={() => state.chartType !== 'bar' && dispatch({type: 'TOGGLE_CHART_TYPE'})}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${state.chartType === 'bar' ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'}`}
                    >
                        <ChartBarIcon className="w-4 h-4" /> Słupkowy
                    </button>
                </div>
            </div>

            <div 
                className={`p-4 xl:p-6 relative w-full bg-white dark:bg-slate-900 flex-grow flex flex-col ${isFullscreen ? 'h-screen fixed inset-0 z-[100] rounded-none' : 'min-h-[450px]'}`} 
                ref={chartContainerRef}
            >
                <div className="absolute top-6 right-6 z-10 flex gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-full bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors backdrop-blur-md"
                        title={isFullscreen ? 'Wyjdź z trybu pełnoekranowego' : 'Pełny ekran'}
                    >
                        {isFullscreen ? <ArrowsShrinkIcon className="w-5 h-5" /> : <ArrowsExpandIcon className="w-5 h-5" />}
                    </button>
                </div>
                <div className="relative w-full flex-grow h-full min-h-0">
                    <canvas ref={chartRef}></canvas>
                </div>
            </div>
        </Card>
    );
};

export default HeatGainChart;
