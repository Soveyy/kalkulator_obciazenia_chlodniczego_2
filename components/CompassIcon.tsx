
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
    'N':   { x: 200, y: -25, dy: 26, fs: 28, fsw: 28, fss: 16 },
    'NNE': { x: 274, y: 15,  dy: 18, fs: 14, fsw: 14, fss: 14 },
    'NE':  { x: 348, y: 45,  dy: 22, fs: 20, fsw: 20, fss: 14 },
    'ENE': { x: 385, y: 125, dy: 18, fs: 14, fsw: 14, fss: 14 },
    'E':   { x: 430, y: 192, dy: 26, fs: 28, fsw: 28, fss: 16 },
    'ESE': { x: 385, y: 275, dy: 18, fs: 14, fsw: 14, fss: 14 },
    'SE':  { x: 348, y: 355, dy: 22, fs: 20, fsw: 20, fss: 14 },
    'SSE': { x: 274, y: 385, dy: 18, fs: 14, fsw: 14, fss: 14 },
    'S':   { x: 200, y: 430, dy: 26, fs: 28, fsw: 28, fss: 16 },
    'SSW': { x: 126, y: 385, dy: 18, fs: 14, fsw: 14, fss: 14 },
    'SW':  { x: 52,  y: 355, dy: 22, fs: 20, fsw: 20, fss: 14 },
    'WSW': { x: 15,  y: 275, dy: 18, fs: 14, fsw: 14, fss: 14 },
    'W':   { x: -30, y: 192, dy: 26, fs: 28, fsw: 28, fss: 16 },
    'WNW': { x: 15,  y: 125, dy: 18, fs: 14, fsw: 14, fss: 14 },
    'NW':  { x: 52,  y: 45,  dy: 22, fs: 20, fsw: 20, fss: 14 },
    'NNW': { x: 126, y: 15,  dy: 18, fs: 14, fsw: 14, fss: 14 },
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
            className += "stroke-red-600 dark:stroke-red-600";
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
            className += "fill-red-600 dark:fill-red-600 font-bold";
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
        <svg viewBox="-60 -60 520 520" xmlns="http://www.w3.org/2000/svg" className={className}>
            <style>
                {`
                    .compass-text-bg {
                        stroke: white;
                        stroke-width: 4px;
                        stroke-linejoin: round;
                        paint-order: stroke fill;
                    }
                    .dark .compass-text-bg {
                        stroke: #1e293b; /* slate-800 */
                    }
                `}
            </style>
            
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
            
            <g fontFamily="Arial, sans-serif" textAnchor="middle">
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
                                stroke="none"
                            />
                            <text x={pos.x} y={pos.y} fontSize={pos.fsw} className={`${textClass} compass-text-bg`}>{value}</text>
                            <text x={pos.x} y={pos.y + pos.dy} fontSize={pos.fss} className={`${textClass} compass-text-bg`}>({angle.toFixed(1)} °)</text>
                        </g>
                    )
                })}
            </g>
        </svg>
    );
};

export default CompassIcon;
