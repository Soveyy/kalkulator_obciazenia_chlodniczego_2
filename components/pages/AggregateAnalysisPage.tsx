import { aggregateResults } from '../../services/aggregateResults';
import { isRoomResultCurrent, validateRoom } from '../../services/validationService';
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import Card from '../ui/Card';
import { LayoutDashboard, SlidersHorizontal } from 'lucide-react';
import Tooltip from '../ui/Tooltip';
import Chart from 'chart.js/auto';
import { MONTH_NAMES, ANALYSIS_MONTHS } from '../../constants';
import { generateAggregatePdfReport } from '../../services/aggregateReportGenerator';
import HVACSystemsManager from '../HVACSystemsManager';
import SankeyChart from '../SankeyChart';
import SolarHeatMap from '../SolarHeatMap';
import { exportRoomsToExcel } from '../../lib/exportUtils';
import ProjectPresentation from '../ProjectPresentation';

const AggregateAnalysisPage: React.FC = () => {
    const { state, theme, dispatch, handleCalculate, isCalculating } = useCalculator();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [view, setView] = useState<'analysis' | 'presentation'>('analysis');
    const presentationToggleRef = useRef<HTMLButtonElement>(null);

    const currentMonth = state.rooms[0]?.currentMonth || '7';
    const resultMessage = state.rooms[0]?.resultMessage || '';

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'RECALCULATE_ALL_ROOMS', payload: e.target.value });
    };

    const handleExportExcel = () => {
        if (!state.rooms || state.rooms.length === 0) return;
        exportRoomsToExcel(state.rooms, state.projectName);
    };

    const handleGenerateReport = async () => {
        if (!aggregateData) return;
        setIsGeneratingPdf(true);
        try {
            await generateAggregatePdfReport(state, aggregateData, currentMonth);
        } catch (error) {
            console.error('Błąd podczas generowania raportu:', error);
            dispatch({ type: 'ADD_TOAST', payload: { message: error instanceof Error ? error.message : 'Błąd generowania raportu PDF.', type: 'danger' } });
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const aggregateData = useMemo(() => aggregateResults(state), [state.rooms]);


    useEffect(() => {
        if (!chartRef.current || !aggregateData || view !== 'analysis' || isCalculating) {
            chartInstanceRef.current?.destroy();
            chartInstanceRef.current = null;
            return;
        }

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }

        const isDarkMode = theme === 'dark';
        const textColor = isDarkMode ? '#ecf0f1' : '#333';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

        const month = parseInt(state.rooms[0]?.currentMonth || '7', 10);
        const isSummerTime = (month >= 4 && month <= 10);
        const offset = isSummerTime ? 2 : 1;

        const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

        const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
            if (!data) return Array(24).fill(0);
            return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
        };

        const datasets = [
            {
                label: 'Całkowite obciążenie (Suma)',
                data: reorderDataForLocalTime(aggregateData.hourlyTotal, offset),
                borderColor: isDarkMode ? '#60a5fa' : '#3b82f6', // blue-400 / blue-500
                backgroundColor: isDarkMode ? 'rgba(96, 165, 250, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                order: 1,
            },
            ...aggregateData.roomProfiles.map((room, index) => {
                const colors = [
                    '#f87171', // red-400
                    '#34d399', // emerald-400
                    '#fbbf24', // amber-400
                    '#a78bfa', // violet-400
                    '#06b6d4', // cyan-400
                    '#f97316', // orange-400
                    '#ec4899', // pink-400
                    '#14b8a6', // teal-400
                    '#6366f1', // indigo-400
                    '#d946ef', // fuchsia-400
                ];
                const color = colors[index % colors.length];
                return {
                    label: room.name,
                    data: reorderDataForLocalTime(room.profile, offset),
                    borderColor: color,
                    backgroundColor: 'transparent',
                    borderWidth: 2,
                    borderDash: [5, 5],
                    tension: 0.4,
                    order: 2,
                };
            })
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
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: textColor,
                            usePointStyle: true,
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                        titleColor: isDarkMode ? '#f1f5f9' : '#0f172a',
                        bodyColor: isDarkMode ? '#cbd5e1' : '#334155',
                        borderColor: isDarkMode ? '#334155' : '#e2e8f0',
                        borderWidth: 1,
                        padding: 12,
                        boxPadding: 6,
                        usePointStyle: true,
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
                    }
                },
                scales: {
                    x: {
                        border: {
                            display: false,
                        },
                        grid: {
                            color: gridColor,
                        },
                        ticks: {
                            color: textColor,
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                                family: "'Inter', sans-serif"
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        border: {
                            display: false,
                        },
                        grid: {
                            color: gridColor,
                        },
                        ticks: {
                            color: textColor,
                            callback: function(value: any) {
                                return (Number(value) / 1000).toFixed(2) + ' kW';
                            },
                            font: {
                                family: "'Inter', sans-serif"
                            }
                        },
                        title: {
                            display: true,
                            text: 'Obciążenie chłodnicze [kW]',
                            color: textColor,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                                weight: 'bold'
                            }
                        }
                    }
                }
            }
        };

        if (chartInstanceRef.current && chartInstanceRef.current.config.type === chartConfig.type) {
            chartInstanceRef.current.data = chartConfig.data;
            chartInstanceRef.current.options = chartConfig.options as any;
            chartInstanceRef.current.update();
        } else {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
            chartInstanceRef.current = new Chart(ctx, chartConfig);
        }

    }, [aggregateData, theme, state.rooms, view, isCalculating]);

    useEffect(() => {
        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
                chartInstanceRef.current = null;
            }
        };
    }, []);

    const viewSwitcher = <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div role="group" aria-label="Widok analizy zbiorczej" className="inline-flex rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1 gap-1">
            <button type="button" aria-pressed={view === 'analysis'} onClick={() => setView('analysis')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === 'analysis' ? 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'}`}><SlidersHorizontal size={16} aria-hidden="true" />Analiza i dobór</button>
            <button ref={presentationToggleRef} type="button" aria-pressed={view === 'presentation'} onClick={() => setView('presentation')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${view === 'presentation' ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-950'}`}><LayoutDashboard size={16} aria-hidden="true" />Prezentacja projektu</button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">{view === 'presentation' ? 'Cały projekt na jednym ekranie' : 'Przegląd projektu i konfiguracja układów'}</p>
    </div>;

    if (view === 'presentation') return <div>{viewSwitcher}<ProjectPresentation aggregate={aggregateData} onClose={() => {
        setView('analysis');
        requestAnimationFrame(() => presentationToggleRef.current?.focus({ preventScroll: true }));
    }} /></div>;

    if (isCalculating) {
        return (
            <div>{viewSwitcher}
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
                <svg className="animate-spin h-10 w-10 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-slate-600 dark:text-slate-300 font-medium animate-pulse">Obliczanie zysków dla całego budynku...</p>
            </div>
            </div>
        );
    }

    if (!aggregateData) {
        return (
            <div>{viewSwitcher}<Card className="text-center !p-10">
                <h3 className="text-lg font-bold mb-2">Przygotuj wyniki wszystkich pomieszczeń</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-5">Uzupełnij dane i przelicz projekt, aby przejść do analizy zbiorczej.</p>
                <div className="flex flex-wrap justify-center gap-3">{state.rooms.filter(room => !isRoomResultCurrent(room)).map(room => <button key={room.id} className="text-sm text-blue-600 dark:text-blue-300 underline underline-offset-4" onClick={() => {
                    dispatch({ type: 'SWITCH_ROOM', payload: room.id });
                    dispatch({ type: 'SET_ACTIVE_TAB', payload: 'input' });
                }}>{room.name}</button>)}</div>
                <button disabled={!state.allData || state.rooms.some(room => validateRoom(room).some(issue => issue.severity === 'error'))} className="mt-5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" onClick={handleCalculate}>Przelicz cały projekt</button>
            </Card></div>
        );
    }

    const month = parseInt(currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;
    const localPeakHour = (aggregateData.peakHour + offset) % 24;

    return (
        <div className="space-y-4 animate-fade-in">
            {viewSwitcher}
            {/* Month Selector and Info */}
            <Card className="p-3 border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-0.5">Wybrany miesiąc obliczeń</h3>
                        <div className="text-slate-600 dark:text-slate-400 text-sm inline-flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
                            <span>{resultMessage}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Automatyczny miesiąc wymiarujący jest celowo wybierany tylko z okresu kwiecień–wrzesień.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="global-month-select" className="text-sm font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            Zmień miesiąc:
                        </label>
                        <select
                            id="global-month-select"
                            value={currentMonth}
                            onChange={handleMonthChange}
                            className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2"
                        >
                            {MONTH_NAMES.map((name, index) => {
                                const monthNum = index + 1;
                                if (monthNum < ANALYSIS_MONTHS.START || monthNum > ANALYSIS_MONTHS.END) return null;
                                return (
                                    <option key={monthNum} value={monthNum.toString()}>
                                        {name}
                                    </option>
                                );
                            })}
                        </select>
                    </div>
                </div>
            </Card>

            <Card className="p-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white whitespace-nowrap">Podsumowanie instalacji:</h3>
                        <p className="text-sm text-slate-500">Miesiąc wymiarujący, analiza układów oraz wyniki dla wszystkich pomieszczeń analizowanych w projekcie.</p>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handleExportExcel}
                            disabled={aggregateData.roomProfiles.length === 0}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                            title="Eksportuj zestawienie obciążeń chłodniczych wszystkich pomieszczeń do pliku Excel (.xls)"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            Eksportuj do Excela
                        </button>

                        <button
                            onClick={handleGenerateReport}
                            disabled={isGeneratingPdf || aggregateData.roomProfiles.length === 0}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
                        >
                            {isGeneratingPdf ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Generowanie...
                                </>
                            ) : (
                                <>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    Wygeneruj raport zbiorczy PDF
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Card>

            {aggregateData.roomProfiles.length === 0 ? (
                <Card className="p-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Wybierz co najmniej jedno pomieszczenie, aby zobaczyć wyniki analizy zbiorczej.</p>
                </Card>
            ) : (
                <>
                    <div className={`grid grid-cols-1 ${aggregateData.roomProfiles.length > 1 ? 'md:grid-cols-3' : ''} gap-4`}>
                        <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800/30">
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Całkowite obciążenie (Peak)</h3>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {(aggregateData.aggregatePeak / 1000).toFixed(2)} <span className="text-lg font-normal">kW</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Godzina {String(localPeakHour).padStart(2, '0')}:00
                            </p>
                        </Card>

                        {aggregateData.roomProfiles.length > 1 && (
                            <>
                                <Card className="p-3">
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Suma szczytów (niejednoczesna)</h3>
                                    <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                                        {(aggregateData.sumOfPeaks / 1000).toFixed(2)} <span className="text-lg font-normal">kW</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Suma maksymalnych obciążeń wyznaczonych dla każdego pomieszczenia z jego własnego najgorszego miesiąca
                                    </p>
                                </Card>

                                <Card className="p-3">
                                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Współczynnik jednoczesności</h3>
                                    <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                                        {(aggregateData.diversityFactor * 100).toFixed(1)} <span className="text-lg font-normal">%</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Stosunek szczytowego obciążenia całego obiektu do sumy szczytów niejednoczesnych
                                    </p>
                                </Card>
                            </>
                        )}
                    </div>

                    <Card className="p-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Sumaryczny profil obciążenia chłodniczego</h3>
                        <div className="h-[480px] w-full relative">
                            <canvas ref={chartRef}></canvas>
                        </div>
                    </Card>

                    <Card className="p-4">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Zestawienie pomieszczeń</h3>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800/50">
                                    <tr>
                                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Pomieszczenie
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <div className="inline-flex items-center justify-end gap-1 w-full">
                                                <span>Obciążenie maksymalne [kW]</span>
                                                <Tooltip text="Najwyższe możliwe obciążenie dla tego pomieszczenia w jego własnym najgorszym miesiącu i godzinie" position="bottom" />
                                            </div>
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            <div className="inline-flex items-center justify-end gap-1 w-full">
                                                <span>Obciążenie jednoczesne [kW]</span>
                                                <Tooltip text="Obciążenie chłodnicze pomieszczenia dla globalnej godziny szczytu całego budynku" position="bottom" />
                                            </div>
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Udział w sumie [%]
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                    {(() => {
                                        const profiles = aggregateData.roomProfiles;
                                        const peakHour = aggregateData.peakHour;
                                        const totalPeakRounded = Number((aggregateData.aggregatePeak / 1000).toFixed(2));
                                        
                                        const roundedValues = profiles.map(p => Number((p.profile[peakHour] / 1000).toFixed(2)));

                                        return profiles.map((room, idx) => {
                                            const baseVal = roundedValues[idx];
                                            const displayVal = baseVal.toFixed(2);
                                            const share = aggregateData.aggregatePeak > 0 
                                                ? ((room.profile[peakHour] / aggregateData.aggregatePeak) * 100).toFixed(1) 
                                                : "0.0";

                                            return (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                        {room.name}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                                        {(room.worstPeak / 1000).toFixed(2)} kW
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900 dark:text-white font-medium">
                                                        {displayVal} kW
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                                        {share}%
                                                    </td>
                                                </tr>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    </Card>

                        <HVACSystemsManager />

                    <div className="flex flex-col space-y-6">
                        <div className="text-center mb-0 mt-4">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Zbiorcza Mapa Ciepła</h2>
                            <p className="text-slate-500 dark:text-slate-400">Całoroczny rozkład obciążeń i zysków słonecznych dla wybranych pomieszczeń</p>
                        </div>

                        <SolarHeatMap 
                            key={`solarHeat-${currentMonth}`}
                            customYearlyMatrix={aggregateData.aggregateYearlyMatrix}
                            customSolarMatrix={aggregateData.aggregateSolarMatrix}
                            customSolarInstantMatrix={aggregateData.aggregateSolarInstantMatrix}
                            defaultDataType="total"
                        />
                    </div>

                    <div className="flex flex-col space-y-6">
                        <div className="text-center mb-0 mt-4">
                            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Struktura Obciążenia Zbiorczego</h2>
                            <p className="text-slate-500 dark:text-slate-400">Całkowity przepływ ciepła od źródeł dla wybranych pomieszczeń</p>
                        </div>
                        
                        <Card className="p-6 border-t-4 border-indigo-500 hover:shadow-md transition-shadow">
                            <SankeyChart customResults={{ finalGains: aggregateData.aggregateFinalGains } as any} />
                        </Card>
                    </div>
                </>
            )}
        </div>
    );
};

export default AggregateAnalysisPage;
