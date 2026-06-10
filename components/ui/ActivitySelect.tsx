import React, { useState, useRef, useEffect } from 'react';
import { PEOPLE_ACTIVITY_LEVELS } from '../../constants';

interface ActivitySelectProps {
    value: string;
    onChange: (value: string) => void;
}

const ActivitySelect: React.FC<ActivitySelectProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedActivity = PEOPLE_ACTIVITY_LEVELS[value] || PEOPLE_ACTIVITY_LEVELS.seated_very_light;

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                className="w-full box-border px-2 py-1.5 lg:px-3 lg:py-2 text-sm lg:text-base border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200 text-left flex items-center justify-between"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span>{selectedActivity.label}, <strong>{selectedActivity.power} W</strong></span>
                <span className="pointer-events-none absolute inset-y-0 right-0 ml-3 flex items-center pr-2">
                    <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M10 3a.75.75 0 01.55.24l3.25 3.5a.75.75 0 11-1.1 1.02L10 4.852 7.3 7.76a.75.75 0 01-1.1-1.02l3.25-3.5A.75.75 0 0110 3zm-3.76 9.2a.75.75 0 011.06.04l2.7 2.908 2.7-2.908a.75.75 0 111.1 1.02l-3.25 3.5a.75.75 0 01-1.1 0l-3.25-3.5a.75.75 0 01.04-1.06z" clipRule="evenodd" />
                    </svg>
                </span>
            </button>

            {isOpen && (
                <div className="absolute z-50 mt-1 w-full min-w-[280px] bg-white dark:bg-slate-800 shadow-2xl max-h-80 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm border border-slate-200 dark:border-slate-700">
                    {Object.entries(PEOPLE_ACTIVITY_LEVELS).map(([key, data]) => (
                        <div
                            key={key}
                            className={`cursor-pointer select-none relative py-2 pl-3 pr-3 hover:bg-blue-50 dark:hover:bg-slate-700 ${value === key ? 'bg-blue-100 dark:bg-slate-700 text-blue-900 dark:text-blue-100' : 'text-slate-900 dark:text-slate-100'}`}
                            onClick={() => {
                                onChange(key);
                                setIsOpen(false);
                            }}
                        >
                            <span className={`block whitespace-normal break-words ${value === key ? 'font-semibold' : 'font-normal'}`}>
                                {data.label} <i className="text-slate-500 dark:text-slate-400">({data.examples})</i>, <strong>{data.power} W</strong>
                            </span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ActivitySelect;
