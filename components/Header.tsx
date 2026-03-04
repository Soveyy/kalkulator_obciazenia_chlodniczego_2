import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import { SunIcon, MoonIcon, InformationCircleIcon, MenuIcon } from './Icons';
import Tooltip from './ui/Tooltip';

const Header: React.FC = () => {
    const { theme, toggleTheme, dispatch } = useCalculator();

    return (
        <header className="mb-6">
            <h1 className="text-xl font-bold text-slate-800 dark:text-white text-center mb-4 lg:hidden">
                Kalkulator obciążenia chłodniczego
            </h1>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <button
                        className="lg:hidden p-2 rounded-full bg-blue-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors -ml-2 flex items-center gap-2 shadow-sm animate-pulse-glow"
                        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                        title="Konfiguracja parametrów"
                    >
                        <MenuIcon className="w-5 h-5" />
                        <span className="font-semibold text-sm pr-2">Konfiguracja</span>
                    </button>
                    <div className="flex items-baseline gap-3">
                        <h1 className="hidden lg:block text-2xl md:text-3xl font-bold text-slate-800 dark:text-white">
                            Kalkulator obciążenia chłodniczego
                        </h1>
                        <span className="hidden lg:block text-xs font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full border border-slate-200 dark:border-slate-700">
                            v0.38
                        </span>
                    </div>
                    <Tooltip text="Pokaż metodologię" position="bottom">
                         <button
                            onClick={() => dispatch({ type: 'SET_MODAL', payload: { type: 'methodology', isOpen: true } })}
                            className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                        >
                            <InformationCircleIcon className="w-7 h-7" />
                        </button>
                    </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        title="Zmień motyw"
                    >
                        {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;