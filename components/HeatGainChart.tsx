
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import { ArrowsExpandIcon, ArrowsShrinkIcon } from './Icons';

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

const HeatGainChart: React.FC = () => {
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
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
        };
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
                { type: 'line', label: 'Obciążenie chłodnicze projektowe', data: reorderDataForLocalTime(finalGains.clearSky.total, offset), borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.2)', fill: true, tension: 0.3, yAxisID: 'yLoad' }
            ];
        } else { // bar chart
             datasets = [
                { type: 'bar', label: 'Słoneczne', data: reorderDataForLocalTime(loadComponents.solar, offset), backgroundColor: 'rgba(241, 196, 15, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Przewodzenie', data: reorderDataForLocalTime(loadComponents.conduction, offset), backgroundColor: 'rgba(230, 126, 34, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Wewn. Jawne', data: reorderDataForLocalTime(loadComponents.internalSensible, offset), backgroundColor: 'rgba(231, 76, 60, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Wentylacja Jawna', data: reorderDataForLocalTime(loadComponents.ventilationSensible, offset), backgroundColor: 'rgba(142, 68, 173, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Infiltracja Jawna', data: reorderDataForLocalTime(loadComponents.infiltrationSensible, offset), backgroundColor: 'rgba(16, 185, 129, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Utajone (wewn. + went. + inf.)', data: reorderDataForLocalTime(finalGains.clearSky.latent, offset), backgroundColor: 'rgba(52, 152, 219, 0.7)', stack: 'a', yAxisID: 'yLoad' }
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

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
        chartInstanceRef.current = new Chart(ctx, chartConfig);

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, [state.activeResults, state.chartType, theme, state.tExtProfile, state.currentMonth]);

    return (
        <Card className="h-[450px] flex flex-col">
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

export default HeatGainChart;
