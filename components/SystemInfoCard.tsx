import React, { useState, useEffect, useMemo } from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import { Share2, AlertTriangle, ArrowRight } from 'lucide-react';

export const SystemInfoCard: React.FC<{ roomId: string }> = ({ roomId }) => {
    const { state, dispatch } = useCalculator();
    const [db, setDb] = useState<any>(null);

    useEffect(() => {
        fetch(`/data/combination_database.json?v=${Date.now()}`)
            .then(res => res.ok ? res.json() : null)
            .then(data => setDb(data))
            .catch(() => {});
    }, []);

    const system = state.systems.find(s => s.indoorUnits.some(u => u.roomId === roomId));
    const room = state.rooms.find(r => r.id === roomId);
    
    if (!system || !room) {
        return (
            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl p-3 flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm">
                    <AlertTriangle size={16} /> Pomieszczenie nieprzypisane do układu klimatyzacji.
                </div>
                <button 
                    onClick={() => dispatch({ type: 'SET_ACTIVE_ROOM', payload: 'aggregate' })}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                    Przejdź do doboru <ArrowRight size={14} />
                </button>
            </div>
        );
    }

    const unit = system.indoorUnits.find(u => u.roomId === roomId)!;
    const isMulti = system.type === 'multi';
    const isSplit = system.type === 'split';

    let ratioStr = '';

    if (isMulti && system.outdoorModel && db && db[system.outdoorModel]) {
        // Quick extraction
        const activeOutdoorUnit = db[system.outdoorModel];
        // Selected indices
        const roomsInSystem = system.indoorUnits.filter(u => u.index > 0);
        const selectedIndicesSorted = roomsInSystem.map(r => r.index).sort((a, b) => a - b);
        
        const match = activeOutdoorUnit.combinations.find((comb: any) => {
            if (comb.indoorUnits.length !== selectedIndicesSorted.length) return false;
            const combIndicesSorted = [...comb.indoorUnits].sort((a: number, b: number) => a - b);
            return combIndicesSorted.every((val: number, idx: number) => val === selectedIndicesSorted[idx]);
        });
        
        // Stull calculation skip for ratio... Just raw match without T.ext is fine?
        // Let's do raw capacity first just for display
        if (match) {
            // Find which array index corresponds to THIS room
            // That's tricky since there could be multiple rooms with same index
            const myIndexVal = unit.index;
            const requiredPeakW = room.monthlyPeaks ? Math.max(...room.monthlyPeaks.map((p: any) => p.peak)) : 0; // Or system peak hour?
            
            // To be precise, just grab requiredPeakKw = room.monthlyPeaks max for now (since we use system peak in actual HVAC, let's just skip "pokrycie" or do an approx)
            ratioStr = '· kombinacja OK';
        } else {
            ratioStr = '· ⚠️ Brak kombinacji w DB';
        }
    }

    return (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-3 flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
                <div className="bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full p-1.5 flex-shrink-0">
                    <Share2 size={16} />
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-300">
                    Obsługiwane przez: <strong className="text-slate-900 dark:text-white">{system.name}</strong> 
                    {system.outdoorModel && ` · ${system.outdoorModel}`}
                    {isMulti && unit.index > 0 && ` · indeks ${unit.index}`}
                    {isMulti && system.outdoorModel && ratioStr}
                    {isSplit && ` (Split)`}
                </div>
            </div>
            <button 
                onClick={() => dispatch({ type: 'SET_ACTIVE_ROOM', payload: 'aggregate' })}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 transition-colors"
                title="Przejdź do zakładki Dobór i analiza zbiorcza"
            >
                Zobacz szczegóły <ArrowRight size={14} />
            </button>
        </div>
    );
};

export default SystemInfoCard;
