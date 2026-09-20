import { APP_VERSION } from '../services/appVersion';
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import { SunIcon, MoonIcon, InformationCircleIcon, MenuIcon } from './Icons';
import Tooltip from './ui/Tooltip';
import CalculationStatus from './CalculationStatus';
import { logout, auth } from '../firebase';
import { LogOut, Snowflake, User as UserIcon } from 'lucide-react';

const Header: React.FC = () => {
    const { state, theme, toggleTheme, dispatch } = useCalculator();
    const user = auth?.currentUser;

    return (
        <header className="mb-4">
            <div className="flex lg:hidden items-center justify-center gap-3 mb-3">
                <span className="inline-flex rounded-xl p-2.5 bg-blue-600 text-white shadow-sm" aria-hidden="true">
                    <Snowflake size={23} />
                </span>
                <div className="text-left">
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                        Kalkulator HVAC <span className="font-normal text-slate-500 dark:text-slate-400">RTS</span>
                    </h1>
                    <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        Obciążenia chłodnicze pomieszczeń · v{APP_VERSION}
                    </p>
                </div>
            </div>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                     <button
                        className="lg:hidden p-2 rounded-full bg-blue-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors -ml-2 flex items-center gap-2 shadow-sm animate-pulse-glow"
                        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                        title="Konfiguracja parametrów"
                        aria-expanded={state.isSidebarOpen}
                        aria-controls="app-sidebar"
                    >
                        <MenuIcon className="w-5 h-5" />
                        <span className="font-semibold text-sm pr-2">Konfiguracja</span>
                    </button>
                    <div className="hidden lg:flex items-center gap-3 flex-none">
                        <span className="inline-flex rounded-xl p-2.5 bg-blue-600 text-white shadow-sm" aria-hidden="true">
                            <Snowflake size={23} />
                        </span>
                        <div>
                            <h1 className="text-lg sm:text-xl xl:text-2xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                                Kalkulator HVAC <span className="font-normal text-slate-500 dark:text-slate-400">RTS</span>
                            </h1>
                            <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                Obciążenia chłodnicze pomieszczeń · v{APP_VERSION}
                            </p>
                        </div>
                    </div>
                    <div className="w-7 flex-none">
                        <Tooltip text="Pokaż metodologię" position="bottom">
                             <button
                                aria-label="Pokaż metodologię"
                                onClick={() => dispatch({ type: 'SET_MODAL', payload: { type: 'methodology', isOpen: true } })}
                                className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                            >
                                <InformationCircleIcon className="w-7 h-7" />
                            </button>
                        </Tooltip>
                    </div>
                </div>
                <div className="relative flex items-center gap-3">
                    <CalculationStatus />
                    {user && (
                        <div className="hidden sm:flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-700">
                            {user.photoURL ? (
                                <img src={user.photoURL} alt="Avatar" className="w-8 h-8 rounded-full border border-slate-300 dark:border-slate-600" referrerPolicy="no-referrer" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                    <UserIcon className="w-5 h-5" />
                                </div>
                            )}
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                {user.displayName || user.email}
                            </span>
                        </div>
                    )}
                    {user && (
                        <button
                            onClick={logout}
                            className="p-2 rounded-full bg-red-100/50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                            title="Wyloguj się"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        title={theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
                        aria-label={theme === 'dark' ? 'Włącz jasny motyw' : 'Włącz ciemny motyw'}
                    >
                        {theme === 'dark' ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
