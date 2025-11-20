
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
                { type: 'line', label: 'Obciążenie chłodnicze projektowe', data: reorderDataForLocalTime(finalGains.clearSky.total, offset), borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.2)', fill: true, tension: 0.3, yAxisID: 'yLoad' },
                { type: 'line', label: 'Obciążenie chłodnicze typowe', data: reorderDataForLocalTime(finalGains.global.total, offset), borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.2)', fill: true, tension: 0.3, yAxisID: 'yLoad' }
            ];
        } else { // bar chart
             datasets = [
                { type: 'bar', label: 'Słoneczne', data: reorderDataForLocalTime(loadComponents.solar, offset), backgroundColor: 'rgba(241, 196, 15, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Przewodzenie', data: reorderDataForLocalTime(loadComponents.conduction, offset), backgroundColor: 'rgba(230, 126, 34, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Wewn. Jawne', data: reorderDataForLocalTime(loadComponents.internalSensible, offset), backgroundColor: 'rgba(231, 76, 60, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Wentylacja Jawna', data: reorderDataForLocalTime(loadComponents.ventilationSensible, offset), backgroundColor: 'rgba(142, 68, 173, 0.7)', stack: 'a', yAxisID: 'yLoad' },
                { type: 'bar', label: 'Utajone (wewn. + went.)', data: reorderDataForLocalTime(finalGains.clearSky.latent, offset), backgroundColor: 'rgba(52, 152, 219, 0.7)', stack: 'a', yAxisID: 'yLoad' }
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
                        title: { display: true, text: 'Obciążenie chłodnicze (W)', color: textColor }, 
                        ticks: { color: textColor }, 
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
                            footer: (tooltipItems: any[]) => {
                                if (chartType === 'bar') {
                                    let sum = 0;
                                    tooltipItems.forEach(tooltipItem => {
                                        if (tooltipItem.dataset.stack === 'a') {
                                            sum += tooltipItem.parsed.y;
                                        }
                                    });
                                    return 'Suma: ' + sum.toFixed(0) + ' W';
                                }
                                return '';
                            },
                        },
                    },
                }
            }
        };

        if (chartInstanceRef.current) {
             // If chart type changed, destroy and recreate
            if ((chartInstanceRef.current.config as any).type !== chartType) {
                 chartInstanceRef.current.destroy();
                 chartInstanceRef.current = new Chart(ctx, chartConfig);
            } else {
                // Update existing chart
                chartInstanceRef.current.data.labels = labels;
                
                const currentDatasets = chartInstanceRef.current.data.datasets;
                
                // Check if dataset structure is same (count and types match loosely)
                if (currentDatasets.length === datasets.length) {
                     datasets.forEach((newDs, i) => {
                        // Update data in place to allow animation
                        currentDatasets[i].data = newDs.data;
                        // Update other properties that might change but are not animating (colors, labels)
                        currentDatasets[i].label = newDs.label;
                        currentDatasets[i].backgroundColor = newDs.backgroundColor;
                        currentDatasets[i].borderColor = newDs.borderColor;
                     });
                } else {
                     // Structure changed completely (e.g. temp profile added/removed), full replacement
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
                     if (chartInstanceRef.current.options.scales.yLoad) {
                        const yLoadScale = chartInstanceRef.current.options.scales.yLoad as any;
                        yLoadScale.ticks.color = textColor;
                        yLoadScale.grid.color = gridColor;
                        yLoadScale.title.color = textColor;
                     }
                     if (chartInstanceRef.current.options.scales.yTemp) {
                        const yTempScale = chartInstanceRef.current.options.scales.yTemp as any;
                        yTempScale.ticks.color = textColor;
                        yTempScale.title.color = textColor;
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
            }
        } else {
            chartInstanceRef.current = new Chart(ctx, chartConfig);
        }

    }, [state.activeResults, state.chartType, theme, state.tExtProfile, state.currentMonth, isFullscreen]);

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
