
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import { ArrowsExpandIcon, ArrowsShrinkIcon } from './Icons';

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

const InternalGainsChart: React.FC = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const { state, theme } = useCalculator();
    const [isFullscreen, setIsFullscreen] = useState(false);

    const handleFullscreenChange = useCallback(() => {
        setIsFullscreen(!!document.fullscreenElement);
    }, []);

    useEffect(() => {
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, [handleFullscreenChange]);

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

        const { internalGainsLoad } = state.activeResults;
        
        const datasets = [
            { label: 'Obciążenie jawne', data: reorderDataForLocalTime(internalGainsLoad.sensible, offset), backgroundColor: 'rgba(231, 76, 60, 0.7)', stack: 'a' },
            { label: 'Obciążenie utajone', data: reorderDataForLocalTime(internalGainsLoad.latent, offset), backgroundColor: 'rgba(52, 152, 219, 0.7)', stack: 'a' }
        ];

        const chartConfig: any = {
            type: 'bar',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                scales: {
                    x: { title: { display: true, text: `Godzina (czas lokalny)`, color: textColor }, ticks: { color: textColor }, grid: { color: gridColor }, stacked: true },
                    y: { title: { display: true, text: 'Obciążenie chłodnicze (W)', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor }, stacked: true, beginAtZero: true }
                },
                plugins: {
                    title: { display: true, text: 'Godzinowe obciążenie chłodnicze od zysków wewnętrznych', color: textColor, font: { size: 16 } },
                    legend: { labels: { color: textColor } },
                    tooltip: { 
                        mode: 'index',
                        callbacks: {
                            footer: (tooltipItems: any[]) => {
                                let sum = 0;
                                tooltipItems.forEach(tooltipItem => {
                                    sum += tooltipItem.parsed.y;
                                });
                                return 'Suma: ' + sum.toFixed(0) + ' W';
                            },
                        },
                     },
                }
            }
        };

        if (chartInstanceRef.current) {
            chartInstanceRef.current.data.labels = labels;
            
            const currentDatasets = chartInstanceRef.current.data.datasets;
            if (currentDatasets.length === datasets.length) {
                 datasets.forEach((newDs, i) => {
                    currentDatasets[i].data = newDs.data;
                    currentDatasets[i].label = newDs.label;
                    currentDatasets[i].backgroundColor = newDs.backgroundColor;
                });
            } else {
                chartInstanceRef.current.data.datasets = datasets;
            }
            
             // Update scales colors
            if (chartInstanceRef.current.options.scales) {
                 if (chartInstanceRef.current.options.scales.x) {
                    const xScale = chartInstanceRef.current.options.scales.x as any;
                    xScale.ticks.color = textColor;
                    xScale.grid.color = gridColor;
                    xScale.title.color = textColor;
                 }
                 if (chartInstanceRef.current.options.scales.y) {
                    const yScale = chartInstanceRef.current.options.scales.y as any;
                    yScale.ticks.color = textColor;
                    yScale.grid.color = gridColor;
                    yScale.title.color = textColor;
                 }
            }
             if (chartInstanceRef.current.options.plugins) {
                 if (chartInstanceRef.current.options.plugins.title) {
                     chartInstanceRef.current.options.plugins.title.color = textColor;
                 }
                 if (chartInstanceRef.current.options.plugins.legend && chartInstanceRef.current.options.plugins.legend.labels) {
                     chartInstanceRef.current.options.plugins.legend.labels.color = textColor;
                 }
            }

            chartInstanceRef.current.update();
        } else {
            chartInstanceRef.current = new Chart(ctx, chartConfig);
        }
    }, [state.activeResults, theme, state.currentMonth, isFullscreen]);
    
    if (!state.results) {
        return (
            <Card className="flex items-center justify-center h-full min-h-[400px]">
                <p className="text-slate-500 text-center px-4">Przejdź do zakładki "Podsumowanie" i uruchom obliczenia, aby zobaczyć wykres obciążenia chłodniczego.</p>
            </Card>
        );
    }

    return (
        <Card className="h-full min-h-[400px] flex flex-col" >
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
        </Card>
    );
};

export default InternalGainsChart;
