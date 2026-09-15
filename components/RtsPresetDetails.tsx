import React from 'react';
import { FLOOR_TYPE_LABELS, RTS_PRESETS } from '../data/rtsPresets';
import type { AccumulationSettings } from '../types';
import Card from './ui/Card';

interface RtsPresetDetailsProps {
    accumulation: AccumulationSettings;
}

const DetailRow: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-1 sm:gap-3 py-2 border-b border-slate-100 dark:border-slate-700/70 last:border-0">
        <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="text-sm leading-5 text-slate-700 dark:text-slate-200">{children}</dd>
    </div>
);

const RtsPresetDetails: React.FC<RtsPresetDetailsProps> = ({ accumulation }) => {
    const preset = RTS_PRESETS[accumulation.rtsPreset] || RTS_PRESETS.heavy;

    return (
        <Card className="p-6 border border-orange-100 dark:border-orange-900/30 animate-fade-in">
            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0" aria-hidden="true">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.color }} />
                    </div>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-800 dark:text-white">{preset.label}</h3>
                            <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                                {preset.category}
                            </span>
                        </div>
                        <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600 dark:text-slate-300">{preset.summary}</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 shrink-0">
                    <span className="px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-300">
                        Podłoga: {FLOOR_TYPE_LABELS[accumulation.floorType]}
                    </span>
                    <span className="px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                        Przeszklenie: {accumulation.glassPercentage}%
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
                <section className="rounded-xl bg-slate-50 dark:bg-slate-900/30 p-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-2">Kiedy wybrać</h4>
                    <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">{preset.recommendedFor}</p>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <h5 className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1">Geometria modelu RTF</h5>
                        <p className="text-sm leading-5 text-slate-700 dark:text-slate-200">{preset.geometry}</p>
                    </div>
                </section>

                <section className="rounded-xl bg-slate-50 dark:bg-slate-900/30 p-4 xl:col-span-1">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200 mb-1">Założone przegrody</h4>
                    <dl>
                        <DetailRow label="Ściana zewnętrzna">{preset.externalWall}</DetailRow>
                        <DetailRow label="Ściany wewnętrzne">{preset.internalWalls}</DetailRow>
                        <DetailRow label="Podłoga">{preset.floor}</DetailRow>
                        <DetailRow label="Sufit / dach">{preset.ceiling}</DetailRow>
                    </dl>
                </section>

                <section className="rounded-xl bg-orange-50/70 dark:bg-orange-950/20 p-4 border border-orange-100 dark:border-orange-900/40">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-orange-800 dark:text-orange-300 mb-2">Wpływ na akumulację ciepła</h4>
                    <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">{preset.thermalEffect}</p>
                    {preset.note && (
                        <div className="mt-4 rounded-lg bg-white/80 dark:bg-slate-800/70 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:text-slate-300">
                            <strong className="text-slate-700 dark:text-slate-200">Ważne:</strong> {preset.note}
                        </div>
                    )}
                    <p className="mt-4 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                        Jest to reprezentatywny model do doboru współczynników RTF. Wybierz wariant najbardziej podobny do elementów widocznych od strony pomieszczenia.
                    </p>
                </section>
            </div>
        </Card>
    );
};

export default RtsPresetDetails;
