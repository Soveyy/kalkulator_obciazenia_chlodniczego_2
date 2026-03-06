
import React, { useRef } from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import RtsChart from '../RtsChart';
import Card from '../ui/Card';
import { ClockIcon, TrendingDownIcon, LightningBoltIcon, InformationCircleIcon, ArrowDownIcon } from '../Icons';
import SankeyChart from '../SankeyChart';
import BreakdownCharts from '../BreakdownCharts';

const RtsAnalysisPage: React.FC = () => {
    const { state } = useCalculator();
    const segment2Ref = useRef<HTMLDivElement>(null);
    const segment3Ref = useRef<HTMLDivElement>(null);

    const scrollToSegment = (ref: React.RefObject<HTMLDivElement | null>) => {
        if (ref.current) {
            ref.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    if (!state.activeResults) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <TrendingDownIcon className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Brak danych do analizy</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                    Wykonaj obliczenia w zakładce "Podsumowanie", aby zobaczyć zaawansowaną analizę wyników.
                </p>
            </div>
        );
    }

    const { finalGains, instantaneousGains } = state.activeResults;
    
    // Calculate metrics
    const totalGains = instantaneousGains?.clearSky?.total || [];
    const totalLoads = finalGains?.clearSky?.total || [];
    
    const maxGain = totalGains.length > 0 ? Math.max(...totalGains) : 0;
    const hourMaxGain = totalGains.indexOf(maxGain);
    
    const maxLoad = totalLoads.length > 0 ? Math.max(...totalLoads) : 0;
    const hourMaxLoad = totalLoads.indexOf(maxLoad);

    if (hourMaxGain === -1 || hourMaxLoad === -1 || totalLoads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-4">
                    <TrendingDownIcon className="w-8 h-8 text-blue-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Brak danych do analizy</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                    Wprowadź dane i wykonaj obliczenia w zakładce "Podsumowanie", aby zobaczyć zaawansowaną analizę wyników.
                </p>
            </div>
        );
    }
    
    const month = parseInt(state.currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;
    
    const localHourMaxGain = (hourMaxGain + offset) % 24;
    const localHourMaxLoad = (hourMaxLoad + offset) % 24;
    
    const lagHours = (hourMaxLoad - hourMaxGain + 24) % 24;
    const peakReduction = ((maxGain - maxLoad) / maxGain) * 100;

    return (
        <div className="space-y-16 pb-16">
            {/* Segment 1: Dynamika Cieplna */}
            <div className="min-h-[80vh] flex flex-col justify-center space-y-6 relative">
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dynamika Cieplna (Analiza RTS)</h2>
                    <p className="text-slate-500 dark:text-slate-400">Wpływ bezwładności budynku na szczytowe zapotrzebowanie na chłód</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Bento Grid Cards */}
                    <Card className="flex flex-col justify-between p-5 border-l-4 border-blue-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Opóźnienie szczytu</span>
                            <ClockIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800 dark:text-white">{lagHours} h</div>
                            <p className="text-xs text-slate-500 mt-1">Przesunięcie fali upału przez strukturę</p>
                        </div>
                    </Card>

                    <Card className="flex flex-col justify-between p-5 border-l-4 border-emerald-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Redukcja szczytu</span>
                            <TrendingDownIcon className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-slate-800 dark:text-white">{peakReduction.toFixed(1)}%</div>
                            <p className="text-xs text-slate-500 mt-1">Tłumienie zysków przez masę termiczną</p>
                        </div>
                    </Card>

                    <Card className="flex flex-col justify-between p-5 border-l-4 border-orange-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Szczyt Zysków</span>
                            <LightningBoltIcon className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                            <div className="text-xl font-bold text-slate-800 dark:text-white">{Math.round(maxGain)} W</div>
                            <p className="text-xs text-slate-500 mt-1">Godzina: {String(localHourMaxGain).padStart(2, '0')}:00</p>
                        </div>
                    </Card>

                    <Card className="flex flex-col justify-between p-5 border-l-4 border-red-500 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Szczyt Obciążenia</span>
                            <LightningBoltIcon className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                            <div className="text-xl font-bold text-slate-800 dark:text-white">{Math.round(maxLoad)} W</div>
                            <p className="text-xs text-slate-500 mt-1">Godzina: {String(localHourMaxLoad).padStart(2, '0')}:00</p>
                        </div>
                    </Card>
                </div>

                <RtsChart />

                <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800">
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <InformationCircleIcon className="w-6 h-6 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold text-blue-800 dark:text-blue-300 mb-1">Czym jest Analiza RTS?</h4>
                            <p className="text-sm text-blue-700 dark:text-blue-400 leading-relaxed">
                                Metoda <strong>Radiant Time Series (RTS)</strong> uwzględnia fakt, że zyski ciepła (szczególnie promieniowanie słoneczne) nie stają się natychmiast obciążeniem chłodniczym. 
                                Energia ta jest najpierw pochłaniana przez ściany, podłogi i meble, a następnie powoli oddawana do powietrza. 
                                Powoduje to dwa kluczowe zjawiska: <strong>tłumienie</strong> (niższa moc szczytowa) oraz <strong>opóźnienie</strong> (szczyt zapotrzebowania występuje później niż szczyt nasłonecznienia).
                            </p>
                        </div>
                    </div>
                </Card>

                <div className="flex justify-center mt-8">
                    <button 
                        onClick={() => scrollToSegment(segment2Ref)}
                        className="flex flex-col items-center text-slate-400 hover:text-blue-500 transition-colors animate-bounce"
                    >
                        <span className="text-sm font-medium mb-2">Poznaj strukturę zysków</span>
                        <ArrowDownIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Segment 2: Struktura Obciążenia (Sankey) */}
            <div ref={segment2Ref} className="min-h-[80vh] flex flex-col justify-center space-y-6 pt-12 relative">
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Struktura Obciążenia</h2>
                    <p className="text-slate-500 dark:text-slate-400">Przepływ ciepła od źródeł do całkowitego obciążenia chłodniczego</p>
                </div>
                
                <Card className="p-6 border-t-4 border-indigo-500 hover:shadow-md transition-shadow">
                    <SankeyChart />
                </Card>

                <div className="flex justify-center mt-8">
                    <button 
                        onClick={() => scrollToSegment(segment3Ref)}
                        className="flex flex-col items-center text-slate-400 hover:text-blue-500 transition-colors animate-bounce"
                    >
                        <span className="text-sm font-medium mb-2">Szczegółowy podział procentowy</span>
                        <ArrowDownIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {/* Segment 3: Udziały Procentowe */}
            <div ref={segment3Ref} className="min-h-[80vh] flex flex-col justify-center space-y-6 pt-12">
                <div className="text-center mb-4">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Udziały Procentowe</h2>
                    <p className="text-slate-500 dark:text-slate-400">Szczegółowy podział obciążenia w godzinie szczytowej</p>
                </div>

                <BreakdownCharts />
            </div>
        </div>
    );
};

export default RtsAnalysisPage;
