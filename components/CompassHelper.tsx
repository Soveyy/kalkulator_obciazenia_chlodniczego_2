
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import CompassIcon from './CompassIcon';

const CompassHelper: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const { modal: { isOpen, type }, selectedDirection, hoveredDirection } = state;
    const isVisible = isOpen && type === 'editWindow';

    if (!isVisible) return null;

    const handleDirectionClick = (direction: string) => {
        dispatch({ type: 'SET_SELECTED_DIRECTION', payload: direction });
    };

    const handleDirectionHover = (direction: string | null) => {
        dispatch({ type: 'SET_HOVERED_DIRECTION', payload: direction });
    };

    return (
        <div className="fixed top-1/2 right-8 -translate-y-1/2 z-[60] bg-white dark:bg-slate-800 shadow-2xl p-4 rounded-full hidden xl:block animate-fade-in">
             <CompassIcon 
                className="w-[450px] h-[450px]" 
                selectedDirection={selectedDirection}
                hoveredDirection={hoveredDirection}
                onDirectionClick={handleDirectionClick}
                onDirectionHover={handleDirectionHover}
            />
             <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(-50%) scale(0.9); }
                    to { opacity: 1; transform: translateY(-50%) scale(1); }
                }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
             `}</style>
        </div>
    );
};

export default CompassHelper;
