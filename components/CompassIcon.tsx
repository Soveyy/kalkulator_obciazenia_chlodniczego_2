
import React from 'react';
import { WINDOW_DIRECTIONS } from '../constants';

interface CompassIconProps {
  className?: string;
  selectedDirection?: string | null;
  hoveredDirection?: string | null;
  onDirectionClick?: (direction: string) => void;
  onDirectionHover?: (direction: string | null) => void;
}

const DIRECTIONS_META = {
    'N':   { angle: 0,    size: 180, type: 'cardinal' },
    'NNE': { angle: 22.5,  size: 140, type: 'secondary' },
    'NE':  { angle: 45,    size: 160, type: 'intercardinal' },
    'ENE': { angle: 67.5,  size: 140, type: 'secondary' },
    'E':   { angle: 90,    size: 180, type: 'cardinal' },
    'ESE': { angle: 112.5, size: 140, type: 'secondary' },
    'SE':  { angle: 135,   size: 160, type: 'intercardinal' },
    'SSE': { angle: 157.5, size: 140, type: 'secondary' },
    'S':   { angle: 180,   size: 180, type: 'cardinal' },
    'SSW': { angle: 202.5, size: 140, type: 'secondary' },
    'SW':  { angle: 225,   size: 160, type: 'intercardinal' },
    'WSW': { angle: 247.5, size: 140, type: 'secondary' },
    'W':   { angle: 270,   size: 180, type: 'cardinal' },
    'WNW': { angle: 292.5, size: 140, type: 'secondary' },
    'NW':  { angle: 315,   size: 160, type: 'intercardinal' },
    'NNW': { angle: 337.5, size: 140, type: 'secondary' },
};

const LABEL_POSITIONS: { [key: string]: { x: number, y: number, dx?: number, dy?: number, fs: number, fsw: number, fss: number } } = {
    'N':   { x: 200, y: 28,  dy: 18, fs: 28, fsw: 28, fss: 12 },
    'NNE': { x: 268, y: 52,  dy: 14, fs: 14, fsw: 14, fss: 10 },
    'NE':  { x: 318, y: 80,  dy: 16, fs: 20, fsw: 20, fss: 10 },
    'ENE': { x: 345, y: 132, dy: 14, fs: 14, fsw: 14, fss: 10 },
    'E':   { x: 375, y: 206, dy: 18, fs: 28, fsw: 28, fss: 12 },
    'ESE': { x: 345, y: 268, dy: 14, fs: 14, fsw: 14, fss: 10 },
    'SE':  { x: 318, y: 318, dy: 16, fs: 20, fsw: 20, fss: 10 },
    'SSE': { x: 268, y: 348, dy: 14, fs: 14, fsw: 14, fss: 10 },
    'S':   { x: 200, y: 382, dy: 18, fs: 28, fsw: 28, fss: 12 },
    'SSW': { x: 132, y: 348, dy: 14, fs: 14, fsw: 14, fss: 10 },
    'SW':  { x: 82,  y: 318, dy: 16, fs: 20, fsw: 20, fss: 10 },
    'WSW': { x: 55,  y: 268, dy: 14, fs: 14, fsw: 14, fss: 10 },
    'W':   { x: 25,  y: 206, dy: 18, fs: 28, fsw: 28, fss: 12 },
    'WNW': { x: 55,  y: 132, dy: 14, fs: 14, fsw: 14, fss: 10 },
    'NW':  { x: 82,  y: 80,  dy: 16, fs: 20, fsw: 20, fss: 10 },
    'NNW': { x: 132, y: 52,  dy: 14, fs: 14, fsw: 14, fss: 10 },
};


const CompassIcon: React.FC<CompassIconProps> = ({ 
    className, 
    selectedDirection, 
    hoveredDirection, 
    onDirectionClick, 
    onDirectionHover 
}) => {
    
    const getLineAttributes = (dir: string, type: string) => {
        const isSelected = selectedDirection === dir;
        const isHovered = hoveredDirection === dir;
        
        let className = "transition-all duration-200 ease-in-out pointer-events-none ";
        let strokeWidth = "2";

        if (isHovered) {
            className += "stroke-blue-500 dark:stroke-blue-400";
            strokeWidth = "10";
        } else if (isSelected) {
            className += "stroke-blue-600 dark:stroke-blue-500";
            strokeWidth = "8";
        } else {
             switch (type) {
                case 'cardinal':
                    className += "stroke-slate-900 dark:stroke-slate-100";
                    strokeWidth = "8";
                    break;
                case 'intercardinal':
                    className += "stroke-slate-500 dark:stroke-slate-400";
                    strokeWidth = "5";
                    break;
                case 'secondary':
                    className += "stroke-slate-300 dark:stroke-slate-600";
                    strokeWidth = "3";
                    break;
            }
        }
        return { className, strokeWidth };
    };
    
    const getTextAttributes = (dir: string, type: string) => {
        const isSelected = selectedDirection === dir;
        const isHovered = hoveredDirection === dir;
        
        let className = "transition-all duration-200 ease-in-out pointer-events-none ";

        if (isHovered) {
             className += "fill-blue-500 dark:fill-blue-400 font-bold";
        } else if (isSelected) {
            className += "fill-blue-600 dark:fill-blue-500 font-bold";
        } else {
             switch (type) {
                case 'cardinal':
                    className += "fill-slate-900 dark:fill-slate-100 font-bold";
                    break;
                case 'intercardinal':
                    className += "fill-slate-600 dark:fill-slate-300 font-semibold";
                    break;
                case 'secondary':
                    className += "fill-slate-400 dark:fill-slate-500 font-normal";
                    break;
            }
        }
        return className;
    }

    return (
        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg" className={className}>
             <defs>
                 <filter id="label-bg" x="-0.1" y="-0.1" width="1.2" height="1.2">
                    <feFlood floodColor="white" floodOpacity="0.85" result="bg" />
                    <feMerge>
                        <feMergeNode in="bg"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            
            <g transform="translate(200 200)">
                <g strokeLinecap="round">
                    {Object.entries(DIRECTIONS_META).map(([key, { angle, size, type }]) => {
                        const { className: lineClass, strokeWidth } = getLineAttributes(key, type);
                        return (
                        <g 
                            key={key} 
                            onClick={() => onDirectionClick && onDirectionClick(key)}
                            onMouseEnter={() => onDirectionHover && onDirectionHover(key)}
                            onMouseLeave={() => onDirectionHover && onDirectionHover(null)}
                            className="group cursor-pointer"
                        >
                             {/* Invisible hit area for easier clicking of lines */}
                            <line 
                                x1="0" y1="0" x2="0" y2={-size} 
                                transform={`rotate(${angle})`}
                                stroke="transparent"
                                strokeWidth="24"
                            />
                            <line 
                                x1="0" y1="0" x2="0" y2={-size} 
                                transform={`rotate(${angle})`}
                                className={lineClass}
                                strokeWidth={strokeWidth}
                            />
                        </g>
                    )})}
                </g>
            </g>
            
            <circle cx="200" cy="200" r="12" className="fill-slate-700 dark:fill-slate-200" />
            
            <g fontFamily="Arial, sans-serif" textAnchor="middle" filter="url(#label-bg)">
                {WINDOW_DIRECTIONS.map(({ value, label }) => {
                    const pos = LABEL_POSITIONS[value];
                    const meta = DIRECTIONS_META[value as keyof typeof DIRECTIONS_META];
                    const angle = parseFloat(label.match(/\((.*?)\°\)/)?.[1] || '0');
                    const textClass = getTextAttributes(value, meta.type);

                     return (
                        <g 
                            key={value} 
                            className="cursor-pointer group"
                            onClick={() => onDirectionClick && onDirectionClick(value)}
                            onMouseEnter={() => onDirectionHover && onDirectionHover(value)}
                            onMouseLeave={() => onDirectionHover && onDirectionHover(null)}
                        >
                             {/* Invisible rect behind text for easier clicking */}
                            <rect 
                                x={pos.x - 35} 
                                y={pos.y - 25} 
                                width="70" 
                                height="50" 
                                fill="transparent" 
                            />
                            <text x={pos.x} y={pos.y} fontSize={pos.fsw} className={textClass}>{value}</text>
                            <text x={pos.x} y={pos.y + pos.dy} fontSize={pos.fss} className={textClass}>({angle.toFixed(1)}°)</text>
                        </g>
                    )
                })}
            </g>
        </svg>
    );
};

export default CompassIcon;
