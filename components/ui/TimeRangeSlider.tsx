
import React, { useState, useEffect, useRef } from 'react';

interface TimeRangeSliderProps {
    startHour: number;
    endHour: number;
    onChange: (start: number, end: number) => void;
    label?: string;
    colorClass?: string;
}

const TimeRangeSlider: React.FC<TimeRangeSliderProps> = ({ startHour, endHour, onChange, label, colorClass = "bg-blue-500" }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState<'start' | 'end' | null>(null);

    // Helper to normalize hours to 0-24 range for calculations
    // Note: endHour can be 24, startHour 0-23.
    
    const getHourFromClientX = (clientX: number) => {
        if (!containerRef.current) return 0;
        const rect = containerRef.current.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const hour = Math.round(percentage * 24);
        return hour;
    };

    const handleMouseDown = (type: 'start' | 'end') => (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(type);
    };

    const handleTrackClick = (e: React.MouseEvent) => {
        const hour = getHourFromClientX(e.clientX);
        
        // Determine which handle is closer
        // We need to handle the circular nature/wrapping visually, but logic is linear 0-24
        // Distance to start
        let distStart = Math.abs(hour - startHour);
        if (distStart > 12) distStart = 24 - distStart; // Wrap distance check roughly
        
        // Distance to end
        let distEnd = Math.abs(hour - endHour);
        if (distEnd > 12) distEnd = 24 - distEnd;

        if (distStart <= distEnd) {
            onChange(hour === 24 ? 0 : hour, endHour);
        } else {
            onChange(startHour, hour);
        }
    };

    useEffect(() => {
        const handleMove = (clientX: number) => {
            if (!isDragging) return;
            
            let hour = getHourFromClientX(clientX);

            if (isDragging === 'start') {
                if (hour === 24) hour = 0; // Normalize 24 to 0 for start
                onChange(hour, endHour);
            } else if (isDragging === 'end') {
                // Allow 24 for end hour, but map 0 to 24 if dragging right edge
                // It's a bit tricky. Let's standard: if hour is 0, treat as 24 for end handle visual consistency?
                // No, our data model supports 0-24.
                onChange(startHour, hour);
            }
        };

        const onMouseMove = (e: MouseEvent) => handleMove(e.clientX);
        const onTouchMove = (e: TouchEvent) => handleMove(e.touches[0].clientX);

        const onEnd = () => setIsDragging(null);

        if (isDragging) {
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchmove', onTouchMove);
            window.addEventListener('touchend', onEnd);
        }

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onEnd);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onEnd);
        };
    }, [isDragging, startHour, endHour, onChange]);

    // Determine active segments for rendering
    const isWrapping = startHour > endHour;
    
    // Handle positions in %
    const startPos = (startHour / 24) * 100;
    const endPos = (endHour / 24) * 100;

    return (
        <div className="w-full select-none pt-2 pb-1">
            {label && (
                <div className="text-xs font-semibold mb-2 text-slate-600 dark:text-slate-400 flex justify-between items-center">
                    <span>{label}</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-[10px]">
                        {startHour === 0 && endHour === 24 
                            ? "24h (Całą dobę)" 
                            : `${String(startHour).padStart(2,'0')}:00 - ${String(endHour).padStart(2,'0')}:00`}
                    </span>
                </div>
            )}
            
            <div 
                ref={containerRef}
                className="relative h-10 mt-1 cursor-pointer group"
                onMouseDown={handleTrackClick}
            >
                {/* Track Background (Grid) */}
                <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-300 dark:border-slate-600 overflow-hidden flex">
                    {Array.from({ length: 24 }, (_, i) => {
                         const isActive = isWrapping 
                            ? (i >= startHour || i < endHour)
                            : (i >= startHour && i < endHour);
                         
                         // Special case for full 24h
                         const isFullDay = startHour === 0 && endHour === 24;
                         const effectiveActive = isFullDay ? true : isActive;

                         return (
                            <div 
                                key={i} 
                                className={`flex-1 border-r border-slate-200 dark:border-slate-600/50 last:border-r-0 flex items-center justify-center text-[9px] transition-colors duration-150
                                    ${effectiveActive ? `${colorClass} text-white font-bold` : 'text-slate-400 dark:text-slate-500'}
                                `}
                            >
                                {i}
                            </div>
                        );
                    })}
                </div>

                {/* Drag Handles */}
                {/* Start Handle */}
                <div 
                    className="absolute top-0 bottom-0 w-4 -ml-2 z-10 cursor-ew-resize flex items-center justify-center group-hover:opacity-100 transition-opacity"
                    style={{ left: `${startPos}%` }}
                    onMouseDown={handleMouseDown('start')}
                    onTouchStart={handleMouseDown('start')}
                >
                    <div className={`w-1 h-full ${isDragging === 'start' ? 'bg-blue-600 scale-y-110' : 'bg-slate-400 dark:bg-slate-500'} rounded-full shadow-md transition-all hover:bg-blue-500 hover:w-1.5`}></div>
                    <div className="absolute -top-5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1 rounded shadow border border-slate-200 dark:border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Start
                    </div>
                </div>

                {/* End Handle */}
                <div 
                    className="absolute top-0 bottom-0 w-4 -ml-2 z-10 cursor-ew-resize flex items-center justify-center group-hover:opacity-100 transition-opacity"
                    style={{ left: `${endPos}%` }}
                    onMouseDown={handleMouseDown('end')}
                    onTouchStart={handleMouseDown('end')}
                >
                    <div className={`w-1 h-full ${isDragging === 'end' ? 'bg-blue-600 scale-y-110' : 'bg-slate-400 dark:bg-slate-500'} rounded-full shadow-md transition-all hover:bg-blue-500 hover:w-1.5`}></div>
                    <div className="absolute -bottom-5 text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-1 rounded shadow border border-slate-200 dark:border-slate-600 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        Stop
                    </div>
                </div>
            </div>
            <div className="text-[10px] text-slate-400 text-center mt-1 italic opacity-0 group-hover:opacity-100 transition-opacity">
                Przesuń pionowe paski, aby zmienić zakres
            </div>
        </div>
    );
};

export default TimeRangeSlider;
