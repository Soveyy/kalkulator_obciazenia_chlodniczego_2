
import React, { useEffect, useRef, useState, useCallback } from 'react';
import Chart from 'chart.js/auto';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import Checkbox from './ui/Checkbox';
import { ArrowsExpandIcon, ArrowsShrinkIcon } from './Icons';

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

const WindowGainsChart: React.FC = () => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const { state, theme } = useCalculator();
    const [showIncidentRadiation, setShowIncidentRadiation] = useState(false);
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
        
        const { windowGainsLoad, incidentSolarPower } = state.activeResults;

        const datasets: any[] = [
             { 
                 label: 'Obciążenie chłodnicze - Okna (Projektowe, Clear Sky)', 
                 data: reorderDataForLocalTime(windowGainsLoad.clearSky.total, offset), 
                 borderColor: '#e74c3c', 
                 backgroundColor: 'rgba(231, 76, 60, 0.2)',
                 fill: true, 
                 borderWidth: 2.5, 
                 yAxisID: 'yLoad',
                 tension: 0.3
            },
             { 
                 label: 'Obciążenie chłodnicze - Okna (Typowe, Global)', 
                 data: reorderDataForLocalTime(windowGainsLoad.global.total, offset), 
                 borderColor: '#f1c40f', 
                 fill: false, 
                 borderWidth: 2, 
                 borderDash: [5, 5], 
                 yAxisID: 'yLoad',
                 tension: 0.3
            },
        ];

        if (showIncidentRadiation) {
            datasets.push({
                label: 'Padające promieniowanie słoneczne (Clear Sky)',
                data: reorderDataForLocalTime(incidentSolarPower, offset),
                borderColor: '#95a5a6',
                borderWidth: 1.5,
                borderDash: [2, 2],
                yAxisID: 'yRadiation',
                tension: 0.3,
                fill: false
            });
        }


        const chartConfig: any = {
            type: 'line',
            data: {
                labels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                scales: {
                    x: { title: { display: true, text: `Godzina (czas lokalny)`, color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } },
                    yLoad: { position: 'left', title: { display: true, text: 'Obciążenie chłodnicze od okien (W)', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor }, beginAtZero: true },
                    yRadiation: { position: 'right', title: { display: showIncidentRadiation, text: 'Padające prom. słoneczne (W)', color: textColor }, ticks: { color: textColor }, grid: { drawOnChartArea: false }, display: showIncidentRadiation, beginAtZero: true }
                },
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: { display: true, text: 'Obciążenie chłodnicze od okien', color: textColor, font: { size: 16 } },
                    legend: { labels: { color: textColor } },
                    tooltip: { mode: 'index' },
                }
            }
        };

        if (chartInstanceRef.current) {
             // Update existing chart
            chartInstanceRef.current.data.labels = labels;
            
            const currentDatasets = chartInstanceRef.current.data.datasets;
            
            // If dataset count matches (e.g. incident radiation toggled same state), update in place
            if (currentDatasets.length === datasets.length) {
                datasets.forEach((newDs, i) => {
                    currentDatasets[i].data = newDs.data;
                    currentDatasets[i].label = newDs.label;
                    currentDatasets[i].borderColor = newDs.borderColor;
                    currentDatasets[i].backgroundColor = newDs.backgroundColor;
                });
            } else {
                 // Toggled incident radiation, replace datasets
                chartInstanceRef.current.data.datasets = datasets;
            }
            
            // Update scales and plugins colors
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
                 if (chartInstanceRef.current.options.scales.yRadiation) {
                    const yRadScale = chartInstanceRef.current.options.scales.yRadiation as any;
                    yRadScale.display = showIncidentRadiation;
                    yRadScale.ticks.color = textColor;
                    yRadScale.title.display = showIncidentRadiation;
                    yRadScale.title.color = textColor;
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

    }, [state.activeResults, theme, showIncidentRadiation, state.currentMonth, isFullscreen]);
    
    if (!state.results) {
        return (
            <Card className="flex items-center justify-center h-full min-h-[500px]">
                <p className="text-slate-500 text-center px-4">Przejdź do zakładki "Podsumowanie" i uruchom obliczenia, aby zobaczyć wykres obciążenia od okien.</p>
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
            <div className="mt-4 pt-2 border-t border-slate-200 dark:border-slate-700">
                <Checkbox 
                    id="show_incident_radiation"
                    label="Pokaż całkowite promieniowanie słoneczne padające na okna"
                    checked={showIncidentRadiation}
                    onChange={(e) => setShowIncidentRadiation(e.target.checked)}
                />
            </div>
        </Card>
    );
};

export default WindowGainsChart;
