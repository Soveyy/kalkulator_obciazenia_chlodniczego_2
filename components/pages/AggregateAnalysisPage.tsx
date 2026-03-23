import React, { useMemo, useEffect, useRef, useState } from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import Card from '../ui/Card';
import Chart from 'chart.js/auto';
import { MONTH_NAMES } from '../../constants';
import { generateAggregatePdfReport } from '../../services/aggregateReportGenerator';

const AggregateAnalysisPage: React.FC = () => {
    const { state, theme, dispatch, handleCalculate, isCalculating } = useCalculator();
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);
    const [deselectedRoomIds, setDeselectedRoomIds] = React.useState<Set<string>>(new Set());
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

    const currentMonth = state.rooms[0]?.currentMonth || '7';
    const resultMessage = state.rooms[0]?.resultMessage || '';

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'RECALCULATE_ALL_ROOMS', payload: e.target.value });
    };

    const handleGenerateReport = async () => {
        if (!aggregateData) return;
        setIsGeneratingPdf(true);
        try {
            await generateAggregatePdfReport(state, aggregateData, currentMonth);
        } catch (error) {
            console.error('Błąd podczas generowania raportu:', error);
            alert('Wystąpił błąd podczas generowania raportu PDF.');
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const toggleRoom = (roomId: string) => {
        setDeselectedRoomIds(prev => {
            const next = new Set(prev);
            if (next.has(roomId)) {
                next.delete(roomId);
            } else {
                next.add(roomId);
            }
            return next;
        });
    };

    const aggregateData = useMemo(() => {
        const allRoomsWithResults = state.rooms.filter(r => r.activeResults?.finalGains?.clearSky?.total);
        if (allRoomsWithResults.length === 0) return null;

        const roomsWithResults = allRoomsWithResults.filter(r => !deselectedRoomIds.has(r.id));

        const hourlyTotal = Array(24).fill(0);
        let sumOfPeaks = 0;
        
        const roomProfiles = roomsWithResults.map(room => {
            const profile = room.activeResults!.finalGains.clearSky.total;
            const peak = Math.max(...profile);
            sumOfPeaks += peak;
            
            for (let i = 0; i < 24; i++) {
                hourlyTotal[i] += profile[i];
            }
            
            return {
                id: room.id,
                name: room.name,
                area: room.input.roomArea,
                profile,
                peak
            };
        });

        const aggregatePeak = roomsWithResults.length > 0 ? Math.max(...hourlyTotal) : 0;
        const peakHour = roomsWithResults.length > 0 ? hourlyTotal.indexOf(aggregatePeak) : 0;
        const diversityFactor = sumOfPeaks > 0 ? aggregatePeak / sumOfPeaks : 1;

        return {
            allRoomsWithResults,
            hourlyTotal,
            aggregatePeak,
            peakHour,
            sumOfPeaks,
            diversityFactor,
            roomProfiles
        };
    }, [state.rooms, deselectedRoomIds]);

    useEffect(() => {
        if (!chartRef.current || !aggregateData) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
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

        chartInstanceRef.current = new Chart(ctx, {
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
                            label: function(context) {
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
                            callback: function(value) {
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
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [aggregateData, theme, state.rooms]);

    if (!aggregateData) {
        return (
            <div className="space-y-6 animate-fade-in">
                <Card className="p-8 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">📊</span>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Brak danych do analizy zbiorczej</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8">
                        Aby zobaczyć analizę zbiorczą dla całego budynku, musisz najpierw uruchomić obliczenia. 
                        Kalkulator znajdzie najbardziej niekorzystny miesiąc dla wszystkich pomieszczeń razem.
                    </p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Opcja 1: Automatyczna</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 flex-grow">
                                Kalkulator przeanalizuje wszystkie miesiące i wybierze ten, w którym suma zysków ciepła ze wszystkich pomieszczeń jest największa.
                            </p>
                            <button
                                onClick={handleCalculate}
                                disabled={isCalculating}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isCalculating ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Obliczanie...
                                    </>
                                ) : 'Znajdź najgorszy miesiąc'}
                            </button>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col">
                            <h3 className="font-bold text-slate-800 dark:text-white mb-2">Opcja 2: Ręczna</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                                Wybierz konkretny miesiąc, dla którego chcesz przeprowadzić analizę wszystkich pomieszczeń.
                            </p>
                            <div className="mb-4">
                                <select
                                    id="initial-month-select"
                                    value={currentMonth}
                                    onChange={handleMonthChange}
                                    className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                                >
                                    {MONTH_NAMES.map((name, index) => {
                                        const monthNum = index + 1;
                                        if (monthNum < 5 || monthNum > 9) return null;
                                        return (
                                            <option key={monthNum} value={monthNum.toString()}>
                                                {name}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>
                            <button
                                onClick={() => dispatch({ type: 'RECALCULATE_ALL_ROOMS', payload: currentMonth })}
                                disabled={isCalculating}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50"
                            >
                                Oblicz dla {MONTH_NAMES[parseInt(currentMonth, 10) - 1]}
                            </button>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    const month = parseInt(currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;
    const localPeakHour = (aggregateData.peakHour + offset) % 24;

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Month Selector and Info */}
            <Card className="p-3 border-l-4 border-l-blue-500 bg-blue-50/30 dark:bg-blue-900/10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1">
                        <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-0.5">Wybrany miesiąc obliczeń</h3>
                        <div 
                            className="text-slate-600 dark:text-slate-400 text-sm"
                            dangerouslySetInnerHTML={{ __html: resultMessage }}
                        />
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
                                if (monthNum < 5 || monthNum > 9) return null;
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

            {/* Room Selection */}
            <Card className="p-3">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-sm font-semibold text-slate-800 dark:text-white whitespace-nowrap">Uwzględnione pomieszczenia:</h3>
                        <div className="flex flex-wrap gap-2">
                            {aggregateData.allRoomsWithResults.map(room => (
                                <label key={room.id} className={`flex items-center gap-2 cursor-pointer px-3 py-1.5 rounded-lg border transition-colors ${!deselectedRoomIds.has(room.id) ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' : 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700 opacity-60 hover:opacity-100'}`}>
                                    <input 
                                        type="checkbox" 
                                        checked={!deselectedRoomIds.has(room.id)}
                                        onChange={() => toggleRoom(room.id)}
                                        className="rounded text-blue-600 focus:ring-blue-500 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600"
                                    />
                                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{room.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    
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
            </Card>

            {aggregateData.roomProfiles.length === 0 ? (
                <Card className="p-6 text-center">
                    <p className="text-sm text-slate-500 dark:text-slate-400">Wybierz co najmniej jedno pomieszczenie, aby zobaczyć wyniki analizy zbiorczej.</p>
                </Card>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-100 dark:border-blue-800/30">
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Całkowite obciążenie (Peak)</h3>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {(aggregateData.aggregatePeak / 1000).toFixed(2)} <span className="text-lg font-normal">kW</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Godzina {String(localPeakHour).padStart(2, '0')}:00
                            </p>
                        </Card>

                        <Card className="p-3">
                            <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Suma szczytów (niejednoczesna)</h3>
                            <div className="text-3xl font-bold text-slate-700 dark:text-slate-300">
                                {(aggregateData.sumOfPeaks / 1000).toFixed(2)} <span className="text-lg font-normal">kW</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                                Suma maksymalnych obciążeń wyznaczonych indywidualnie dla każdego pomieszczenia
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
                                            Szczytowe obciążenie
                                        </th>
                                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Udział w sumie szczytów
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                                    {aggregateData.roomProfiles.map((room, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {room.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                                {(room.peak / 1000).toFixed(2)} kW
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">
                                                {aggregateData.sumOfPeaks > 0 
                                                    ? ((room.peak / aggregateData.sumOfPeaks) * 100).toFixed(1) 
                                                    : 0}%
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
};

export default AggregateAnalysisPage;
