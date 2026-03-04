
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import { ArrowsExpandIcon, ArrowsShrinkIcon } from './Icons';

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

const RtsChart: React.FC = () => {
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
            } else {
                if (document.exitFullscreen) {
                    await document.exitFullscreen();
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
        
        const { finalGains, instantaneousGains } = state.activeResults;

        const datasets = [
            {
                type: 'line',
                label: 'Zyski Chwilowe (Instantaneous)',
                data: reorderDataForLocalTime(instantaneousGains.clearSky.total, offset),
                borderColor: 'rgba(231, 76, 60, 0.8)',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 5
            },
            {
                type: 'line',
                label: 'Obciążenie Chłodnicze (Cooling Load)',
                data: reorderDataForLocalTime(finalGains.clearSky.total, offset),
                borderColor: 'rgba(52, 152, 219, 1)',
                backgroundColor: 'rgba(52, 152, 219, 0.2)',
                borderWidth: 3,
                fill: 0, // Fill to the first dataset (index 0)
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6
            }
        ];

        const chartConfig: any = {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: 'index',
                    intersect: false,
                },
                scales: {
                    x: { 
                        title: { display: true, text: `Godzina (czas lokalny)`, color: textColor }, 
                        ticks: { color: textColor }, 
                        grid: { color: gridColor } 
                    },
                    y: { 
                        title: { display: true, text: 'Moc (W)', color: textColor }, 
                        ticks: { color: textColor }, 
                        grid: { color: gridColor },
                        beginAtZero: true
                    }
                },
                plugins: {
                    title: { 
                        display: true, 
                        text: 'Analiza Bezwładności Cieplnej (RTS)', 
                        color: textColor, 
                        font: { size: 16, weight: 'bold' } 
                    },
                    legend: { 
                        position: 'bottom',
                        labels: { color: textColor, usePointStyle: true, padding: 20 } 
                    },
                    tooltip: {
                        callbacks: {
                            label: (context: any) => {
                                return `${context.dataset.label}: ${Math.round(context.parsed.y)} W`;
                            },
                            footer: (tooltipItems: any[]) => {
                                if (tooltipItems.length === 2) {
                                    const gain = tooltipItems[0].parsed.y;
                                    const load = tooltipItems[1].parsed.y;
                                    const diff = gain - load;
                                    if (diff > 0) {
                                        return `Magazynowanie energii: ${Math.round(diff)} W`;
                                    } else {
                                        return `Oddawanie energii: ${Math.round(Math.abs(diff))} W`;
                                    }
                                }
                                return '';
                            }
                        }
                    }
                }
            }
        };

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
        chartInstanceRef.current = new Chart(ctx, chartConfig);

    }, [state.activeResults, theme, state.currentMonth, isFullscreen]);
    
    if (!state.results) {
        return (
            <Card className="flex items-center justify-center h-[500px]">
                <p className="text-slate-500 text-center px-4">Przejdź do zakładki "Podsumowanie" i uruchom obliczenia, aby zobaczyć analizę akumulacji.</p>
            </Card>
        );
    }

    return (
        <Card className="h-[500px] flex flex-col">
            <div className="relative flex-grow chart-container" ref={chartContainerRef}>
                <div className="absolute top-2 right-2 z-10 flex gap-2">
                    <button
                        onClick={toggleFullscreen}
                        className="p-2 rounded-full bg-slate-100/50 dark:bg-slate-700/50 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                        {isFullscreen ? <ArrowsShrinkIcon className="w-5 h-5" /> : <ArrowsExpandIcon className="w-5 h-5" />}
                    </button>
                </div>
                <canvas ref={chartRef}></canvas>
            </div>
        </Card>
    );
};

export default RtsChart;
