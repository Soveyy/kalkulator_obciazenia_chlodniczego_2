import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import { ArrowsExpandIcon, ArrowsShrinkIcon } from './Icons';
import { CHART_COLORS } from '../lib/chartUtils';

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

const WallGainsChart: React.FC = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const { state, theme } = useCalculator();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [chartType, setChartType] = useState<'line' | 'bar'>('line');

    const handleFullscreenChange = useCallback(() => {
        setIsFullscreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

    useEffect(() => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.resize();
        }
    }, [isFullscreen]);

    const toggleFullscreen = async () => {
        const element = chartContainerRef.current;
        if (!element) return;
        try {
            if (!document.fullscreenElement) {
                await element.requestFullscreen();
                if (window.screen.orientation && window.innerWidth < 1024) {
                    await (window.screen.orientation as any).lock('landscape').catch((e: any) => console.warn("Screen orientation lock failed:", e));
                }
            } else {
                if (document.exitFullscreen) {
                    if (window.screen.orientation && window.screen.orientation.type.startsWith('landscape')) {
                        window.screen.orientation.unlock();
                    }
                    await document.exitFullscreen();
                }
            }
        } catch (err) {
            console.error(`Error with fullscreen API: ${(err as Error).message}`, err);
        }
    };

    useEffect(() => {
        if (!chartRef.current || !state.activeResults) {
             if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
            return;
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        const month = parseInt(state.currentMonth, 10);
        const isSummerTime = (month >= 4 && month <= 10);
        const offset = isSummerTime ? 2 : 1;

        const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
        const isDarkMode = theme === 'dark';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#ecf0f1' : '#333';
        
        const { wallGainsLoad } = state.activeResults;
        
        const wallsCS = Array.isArray(wallGainsLoad) 
            ? { total: wallGainsLoad, individualWalls: [] } 
            : wallGainsLoad?.clearSky || { total: Array(24).fill(0), individualWalls: [] };

        const datasets: any[] = [];

        if (chartType === 'line') {
             datasets.push({ 
                 type: 'line',
                 label: 'Obciążenie chłodnicze - Ściany', 
                 data: reorderDataForLocalTime(wallsCS.total, offset), 
                 borderColor: CHART_COLORS.conduction, 
                 backgroundColor: CHART_COLORS.conduction.replace(/[\d\.]+\)$/g, '0.2)'), // Convert opacity
                 fill: true, 
                 borderWidth: 2.5, 
                 yAxisID: 'yLoad',
                 tension: 0.3
            });
        } else {
            const indWalls = wallsCS.individualWalls || [];
            
            if (indWalls.length === 0) {
                 datasets.push({
                    type: 'bar',
                    label: 'Suma (wymaga przeliczenia w ukrytej zakładce "Podsumowanie")',
                    data: reorderDataForLocalTime(wallsCS.total, offset),
                    backgroundColor: CHART_COLORS.conduction,
                    stack: 'walls',
                    yAxisID: 'yLoad'
                });
            } else {
                const palette = [
                    CHART_COLORS.conduction,
                    CHART_COLORS.solar,
                    CHART_COLORS.people,
                    CHART_COLORS.equipment,
                    CHART_COLORS.ventilation,
                    CHART_COLORS.infiltration,
                    CHART_COLORS.lighting,
                    CHART_COLORS.totalSensible
                ];
                
                indWalls.forEach((wall: any, idx: number) => {
                    const color = palette[idx % palette.length];
                    datasets.push({
                        type: 'bar',
                        label: wall.title,
                        data: reorderDataForLocalTime(wall.sensible, offset),
                        backgroundColor: color,
                        stack: 'walls',
                        yAxisID: 'yLoad'
                    });
                });
            }
        }

        const chartConfig: any = {
            type: chartType === 'line' ? 'line' : 'bar',
            data: {
                labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                scales: {
                    x: { 
                        title: { display: true, text: `Godzina (czas lokalny)`, color: textColor }, 
                        ticks: { color: textColor }, 
                        grid: { color: gridColor },
                        stacked: chartType === 'bar'
                    },
                    yLoad: { 
                        position: 'left', 
                        title: { display: true, text: 'Obciążenie chłodnicze od ścian (kW)', color: textColor }, 
                        ticks: { color: textColor, callback: function(value: any) { return (Number(value) / 1000).toFixed(2); } }, 
                        grid: { color: gridColor }, 
                        beginAtZero: true,
                        stacked: chartType === 'bar'
                    }
                },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: { display: true, text: 'Obciążenie chłodnicze od ścian', color: textColor, font: { size: 16 } },
                    legend: { labels: { color: textColor } },
                    tooltip: { 
                        mode: 'index',
                        callbacks: {
                            label: function(context: any) {
                                let label = context.dataset.label || '';
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed.y !== null) {
                                    label += (context.parsed.y / 1000).toFixed(2) + ' kW';
                                }
                                return label;
                            }
                        }
                    },
                }
            }
        };

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
        chartInstanceRef.current = new Chart(ctx, chartConfig);

    }, [state.activeResults, theme, state.currentMonth, chartType]);
    
    if (!state.results) {
        return (
            <Card className="flex items-center justify-center h-full min-h-[500px]">
                <p className="text-slate-500 text-center px-4">Przejdź do zakładki "Podsumowanie" i uruchom obliczenia, aby zobaczyć wykres obciążenia od ścian.</p>
            </Card>
        );
    }

    if (state.walls.length === 0) {
        return (
            <Card className="flex items-center justify-center h-full min-h-[500px]">
                <div className="text-center px-4">
                    <p className="text-slate-500 mb-2">Brak zdefiniowanych ścian w projekcie.</p>
                    <p className="text-xs text-slate-400">Dodaj ściany/stropodachy w zakładce "Ściany", aby zobaczyć analizę zysków.</p>
                </div>
            </Card>
        );
    }

    return (
        <Card className="h-full min-h-[500px] flex flex-col">
            <div className="relative flex-grow chart-container" ref={chartContainerRef}>
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-full bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                        title={isFullscreen ? 'Wyjdź z trybu pełnoekranowego' : 'Pełny ekran'}
                    >
                        {isFullscreen ? <ArrowsShrinkIcon className="w-5 h-5" /> : <ArrowsExpandIcon className="w-5 h-5" />}
                    </button>
                </div>
                <canvas ref={chartRef}></canvas>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-md border border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={() => setChartType('line')}
                        className={`px-3 py-1 text-sm font-medium rounded ${chartType === 'line' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        Suma (Liniowy)
                    </button>
                    <button 
                        onClick={() => setChartType('bar')}
                        className={`px-3 py-1 text-sm font-medium rounded ${chartType === 'bar' ? 'bg-white dark:bg-slate-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        Rozbicie na ściany (Słupkowy)
                    </button>
                </div>
            </div>
        </Card>
    );
};

export default WallGainsChart;
