
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import CompassIcon from './CompassIcon';

const CompassHelper: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const { modal: { isOpen, type }, selectedDirection, hoveredDirection } = state;
    const isVisible = isOpen && (type === 'editWindow' || type === 'editWall');

    if (!isVisible) return null;

    const handleDirectionClick = (direction: string) => {
        dispatch({ type: 'SET_SELECTED_DIRECTION', payload: direction });
    };

    const handleDirectionHover = (direction: string | null) => {
        dispatch({ type: 'SET_HOVERED_DIRECTION', payload: direction });
    };

    return (
        <div className="fixed top-1/2 right-8 -translate-y-1/2 z-[60] bg-white dark:bg-slate-800 shadow-2xl p-4 rounded-full hidden 2xl:block compass-enter">
             <CompassIcon 
                className="w-[min(450px,calc((100vw-48rem)/2-5rem),calc(100dvh-6rem))] h-auto aspect-square"
                selectedDirection={selectedDirection}
                hoveredDirection={hoveredDirection}
                onDirectionClick={handleDirectionClick}
                onDirectionHover={handleDirectionHover}
            />
             <style>{`
                @keyframes compass-enter {
                    from { opacity: 0; transform: translateY(-50%) scale(0.9); }
                    to { opacity: 1; transform: translateY(-50%) scale(1); }
                }
                .compass-enter { animation: compass-enter 0.3s ease-out forwards; }
                @media (prefers-reduced-motion: reduce) { .compass-enter { animation: none; } }
             `}</style>
        </div>
    );
};

export default CompassHelper;
