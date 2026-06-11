import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import { Activity, Sunrise, Sun, Sunset, CloudSun } from 'lucide-react';

interface DailyProfileProps {
    profileData: number[];
}

const DailyProfile: React.FC<DailyProfileProps> = ({ profileData }) => {
    const { state } = useCalculator();
    const [hoveredHour, setHoveredHour] = React.useState<number | null>(null);

    const currentMonth = state.rooms[0]?.currentMonth || '7';
    const month = parseInt(currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;

    const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
        if (!data) return Array(24).fill(0);
        // data to array UTC. Chcemy dane lokalne: index i to czas lokalny.
        // czas lokalny = czas UTC + offset.
        // czas UTC = czas lokalny - offset.
        // Więc dla indexu 'i' bierzemy dane z 'i - offset'.
        return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
    };

    const localProfileData = React.useMemo(() => {
        return reorderDataForLocalTime(profileData, offset);
    }, [profileData, offset]);

    const peakValue = Math.max(...localProfileData, 0);
    const peakHour = peakValue > 0 ? localProfileData.indexOf(peakValue) : 12;

    let peakPeriod: 'rano' | 'poludnie' | 'popoludnie' | 'wieczor' = 'poludnie';
    if (peakHour >= 5 && peakHour <= 10) peakPeriod = 'rano';
    else if (peakHour >= 11 && peakHour <= 13) peakPeriod = 'poludnie';
    else if (peakHour >= 14 && peakHour <= 17) peakPeriod = 'popoludnie';
    else peakPeriod = 'wieczor';

    const periods = [
        { id: 'rano', label: 'Rano', icon: Sunrise, color: 'text-amber-500 hover:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-500/20', border: 'border-amber-400/40' },
        { id: 'poludnie', label: 'Południe', icon: Sun, color: 'text-orange-500 hover:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-500/20', border: 'border-orange-400/40' },
        { id: 'popoludnie', label: 'Popołudnie', icon: CloudSun, color: 'text-amber-600 dark:text-amber-400 hover:text-amber-500', bg: 'bg-amber-600/10 dark:bg-amber-600/20', border: 'border-amber-500/40' },
        { id: 'wieczor', label: 'Wieczór', icon: Sunset, color: 'text-rose-400 dark:text-rose-300 hover:text-rose-300', bg: 'bg-rose-500/10 dark:bg-rose-500/20', border: 'border-rose-450/40' }
    ];

    return (
        <div className="mt-4 pt-4 border-t border-sky-100/80 dark:border-sky-800/40">
            <div className="flex justify-between items-center mb-2 px-0.5">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-wider">Dobowy profil</span>
                {hoveredHour !== null ? (
                    <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 animate-fade-in whitespace-nowrap">
                        {hoveredHour.toString().padStart(2, '0')}:00 → <span className="font-mono">{(localProfileData[hoveredHour] / 1000).toFixed(2)}</span> kW
                    </span>
                ) : (
                    <span className="text-[11px] font-extrabold text-sky-700 dark:text-sky-400 whitespace-nowrap tracking-wider">
                         MAKS: {peakHour.toString().padStart(2, '0')}:00
                    </span>
                )}
            </div>

            {/* Micro daily bar-chart */}
            <div className="flex items-end gap-[1.5px] h-16 bg-slate-50/85 dark:bg-slate-900/45 p-1.5 rounded-lg border border-slate-200/90 dark:border-sky-950/50 group select-none shadow-inner">
                {localProfileData.map((val, hour) => {
                    const percent = peakValue > 0 ? (val / peakValue) * 100 : 0;
                    const isPeak = hour === peakHour && val > 0;
                    return (
                        <div
                            key={hour}
                            onMouseEnter={() => setHoveredHour(hour)}
                            onMouseLeave={() => setHoveredHour(null)}
                            style={{ height: `${Math.max(8, percent)}%` }}
                            className={`flex-1 rounded-sm transition-all duration-300 cursor-pointer ${
                                isPeak 
                                    ? 'bg-amber-500 dark:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.65)]' 
                                    : 'bg-sky-400/40 dark:bg-sky-400/20 hover:bg-sky-500/80 dark:hover:bg-sky-400/60'
                            }`}
                            title={`${hour}:00 - ${(val / 1000).toFixed(2)} kW`}
                        />
                    );
                })}
            </div>

            {/* Time of day periods indicators */}
            <div className="grid grid-cols-4 gap-1.5 mt-4">
                {periods.map(p => {
                    const isActive = peakPeriod === p.id && peakValue > 0;
                    const Icon = p.icon;
                    // Dynamically decrease font size for 'Popołudnie' to fit without spilling out
                    const labelStyle = p.label.length > 8 
                        ? 'text-[7.5px] sm:text-[8px]' 
                        : 'text-[9px] sm:text-[9.5px]';

                    return (
                        <div 
                            key={p.id} 
                            className={`flex flex-col items-center justify-center py-2 px-1 rounded-xl border transition-all duration-300 ${
                                isActive 
                                    ? `${p.bg} ${p.border} scale-105 shadow-[0_2px_8px_rgba(0,0,0,0.05)] ring-1 ring-amber-500/20 dark:ring-amber-400/15` 
                                    : 'border-transparent opacity-35 dark:opacity-20 hover:opacity-50'
                            }`}
                            title={
                                p.id === 'rano' ? 'Rano (05:00 - 10:00)' :
                                p.id === 'poludnie' ? 'Południe (11:00 - 13:00)' :
                                p.id === 'popoludnie' ? 'Popołudnie (14:00 - 17:00)' :
                                'Wieczór (18:00 - 22:00)'
                            }
                        >
                            <Icon size={19} className={isActive ? p.color : 'text-slate-500'} />
                            <span className={`font-black mt-1 tracking-tighter text-center leading-none uppercase ${labelStyle} ${isActive ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>
                                {p.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const KPIDashboard: React.FC = () => {
    const { state } = useCalculator();
    const { activeResults, input, activeRoomId, rooms } = state;

    if (activeRoomId === 'aggregate') {
        const roomsWithResults = rooms.filter(r => r.activeResults?.finalGains?.clearSky?.total);
        if (roomsWithResults.length === 0) return null;

        const hourlyTotal = Array(24).fill(0);
        let totalArea = 0;

        roomsWithResults.forEach(room => {
            const profile = room.activeResults!.finalGains.clearSky.total;
            for (let i = 0; i < 24; i++) {
                hourlyTotal[i] += profile[i];
            }
            totalArea += parseFloat(room.input.roomArea) || 0;
        });

        const maxLoad = Math.max(...hourlyTotal);
        const loadDensity = totalArea > 0 ? maxLoad / totalArea : 0;

        return (
            <Card className="!p-4 bg-white dark:bg-slate-900 border border-indigo-150/80 dark:border-indigo-800/50 shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-350">
                <div className="flex items-center gap-2 mb-3 text-indigo-700 dark:text-indigo-400">
                    <Activity size={18} />
                    <h3 className="font-bold text-sm tracking-wide">WYNIKI OGÓLNE</h3>
                </div>
                <div className="space-y-3">
                    <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-lg border border-indigo-100/65 dark:border-indigo-800/30">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1">Szczytowe Obciążenie (Całk.)</span>
                        <div className="text-xl font-black text-slate-800 dark:text-white">
                            {(maxLoad / 1000).toFixed(2)} <span className="text-sm font-medium text-slate-500">kW</span>
                        </div>
                    </div>
                    <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-lg border border-indigo-100/65 dark:border-indigo-800/30">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1 font-mono">Śr. Wskaźnik Powierzchniowy</span>
                        <div className="text-xl font-black text-slate-800 dark:text-white">
                            {loadDensity.toFixed(1)} <span className="text-sm font-medium text-slate-500">W/m²</span>
                        </div>
                    </div>

                    {/* Integrated daily profile */}
                    <DailyProfile profileData={hourlyTotal} />
                </div>
            </Card>
        );
    }

    if (!activeResults) return null;

    const { finalGains } = activeResults;
    const maxLoad = Math.max(...finalGains.clearSky.total);
    const roomArea = parseFloat(input.roomArea) || 1;
    const loadDensity = maxLoad / roomArea;

    const activeRoom = rooms.find(r => r.id === activeRoomId);

    return (
        <Card className="!p-4 bg-white dark:bg-slate-900 border border-sky-150/70 dark:border-sky-800/50 shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-350">
            <div className="flex items-center gap-2 mb-3 text-sky-700 dark:text-sky-400">
                <Activity size={18} />
                <h3 className="font-bold text-sm tracking-wide uppercase">{activeRoom?.name || 'Wyniki pokoju'}</h3>
            </div>
            <div className="space-y-3">
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-lg border border-sky-100/70 dark:border-sky-800/30">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1 font-mono">Szczytowe Obciążenie</span>
                    <div className="text-xl font-black text-slate-800 dark:text-white">
                        {(maxLoad / 1000).toFixed(2)} <span className="text-sm font-medium text-slate-500">kW</span>
                    </div>
                </div>
                <div className="bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-lg border border-sky-100/70 dark:border-sky-800/30">
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider block mb-1 font-mono">Wskaźnik Powierzchniowy</span>
                    <div className="text-xl font-black text-slate-800 dark:text-white">
                        {loadDensity.toFixed(1)} <span className="text-sm font-medium text-slate-500">W/m²</span>
                    </div>
                </div>

                {/* Integrated daily profile */}
                <DailyProfile profileData={finalGains.clearSky.total} />
            </div>
        </Card>
    );
};

export default KPIDashboard;
