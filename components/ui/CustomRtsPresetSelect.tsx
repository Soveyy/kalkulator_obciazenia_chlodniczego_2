import React, { useEffect, useRef, useState } from 'react';
import { RTS_PRESET_IDS, RTS_PRESETS } from '../../data/rtsPresets';
import type { RtsPresetId } from '../../types';

interface CustomRtsPresetSelectProps {
    value: RtsPresetId;
    onChange: (value: RtsPresetId) => void;
}

const CustomRtsPresetSelect: React.FC<CustomRtsPresetSelectProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = RTS_PRESETS[value] || RTS_PRESETS.heavy;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                className="w-full box-border px-3 py-2 pr-9 text-sm border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 text-left"
                onClick={() => setIsOpen(current => !current)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                title={selectedOption.label}
            >
                <span className="block font-semibold leading-5 whitespace-normal">{selectedOption.label}</span>
                <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                    <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div
                    className="absolute z-50 mt-1 w-full xl:w-[28rem] max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 shadow-2xl max-h-96 rounded-lg py-1 ring-1 ring-black/5 overflow-auto border border-slate-200 dark:border-slate-700"
                    role="listbox"
                >
                    {RTS_PRESET_IDS.map(id => {
                        const option = RTS_PRESETS[id];
                        const selected = value === id;
                        return (
                            <button
                                key={id}
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className={`block w-full text-left px-3 py-2.5 border-l-4 transition-colors ${selected ? 'border-orange-500 bg-orange-50 dark:bg-slate-700' : 'border-transparent hover:bg-slate-50 dark:hover:bg-slate-700/70'}`}
                                onClick={() => {
                                    onChange(id);
                                    setIsOpen(false);
                                }}
                            >
                                <span className="flex items-center justify-between gap-3">
                                    <span className={`text-sm ${selected ? 'font-bold text-orange-900 dark:text-orange-100' : 'font-semibold text-slate-900 dark:text-slate-100'}`}>{option.label}</span>
                                    <span className="shrink-0 text-[9px] uppercase tracking-wide text-slate-400">{option.category}</span>
                                </span>
                                <span className="block mt-0.5 text-xs leading-4 text-slate-500 dark:text-slate-400">{option.menuDescription}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default CustomRtsPresetSelect;
