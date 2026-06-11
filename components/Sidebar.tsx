
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import { XIcon } from './Icons';
import { HelpCircle, Sparkles, Save, Upload, Share2, RotateCcw } from 'lucide-react';
import { createTutorial } from '../services/tutorialService';
import KPIDashboard from './KPIDashboard';

const Sidebar: React.FC = () => {
    const { state, dispatch, progress } = useCalculator();

    const startTour = () => {
        const tour = createTutorial(() => {});
        tour.drive();
    };
    
    return (
        <>
            {/* Overlay for mobile */}
            <div
                className={`fixed inset-0 bg-black/60 z-30 lg:hidden transition-opacity duration-300 ${
                    state.isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                aria-hidden="true"
            />
            <aside 
                className={`
                    bg-slate-50 dark:bg-slate-900 p-3 flex flex-col 
                    transform transition-transform duration-300 ease-in-out
                    
                    fixed inset-y-0 left-0 z-40 h-screen w-[85vw] max-w-sm shadow-2xl
                    ${state.isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    
                    lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-60 lg:shadow-none lg:translate-x-0 lg:pb-0 lg:border-r lg:border-slate-200 dark:lg:border-slate-800
                `}
            >
                 <div className="flex justify-between items-center mb-4 mt-2 lg:mt-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Narzędzia</h2>
                        <span className={`w-2 h-2 rounded-full transition-colors ${progress.base ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    </div>
                    <button 
                        id="sidebar-toggle"
                        className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                        aria-label="Zamknij menu"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pb-4 -mr-2 pr-2">
                    {/* Tutorial Toggle */}
                    <Card id="tutorial-toggle-container" className="!p-3 border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10">
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 rounded-lg text-blue-600 dark:text-blue-400">
                                        <HelpCircle size={16} />
                                    </div>
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200">Pomoc</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={state.tutorialMode}
                                        onChange={(e) => dispatch({ type: 'SET_TUTORIAL_MODE', payload: e.target.checked })}
                                    />
                                    <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <Button 
                                variant="secondary" 
                                fullWidth 
                                size="md"
                                onClick={startTour}
                            >
                                <Sparkles size={18} />
                                <span>Przewodnik</span>
                            </Button>
                        </div>
                    </Card>

                    {/* Project Management */}
                    <Card id="project-management" className="!p-3">
                         <div className="space-y-3">
                            <div>
                                <label className="label-style flex items-center font-bold text-xs mb-1">
                                    Nazwa Projektu
                                </label>
                                <Input 
                                    name="projectName" 
                                    type="text" 
                                    value={state.input.projectName} 
                                    onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} 
                                    className={`text-sm py-1.5 px-2 ${!state.input.projectName ? 'animate-pulse-border border-blue-400' : ''}`}
                                />
                            </div>
                            <div className="space-y-2">
                                <Button size="md" fullWidth onClick={() => dispatch({ type: 'SAVE_PROJECT_AS', payload: state.input.projectName })}>
                                    <Save size={18} className="shrink-0" /> <span>Zapisz</span>
                                </Button>
                                <Button size="md" fullWidth variant="secondary" onClick={() => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'projectList' } })}>
                                    <Upload size={18} className="shrink-0" /> <span>Wczytaj</span>
                                </Button>
                                <Button size="md" fullWidth variant="secondary" onClick={() => dispatch({ type: 'GENERATE_SHARE_LINK' })}>
                                    <Share2 size={18} className="shrink-0" /> <span>Udostępnij</span>
                                </Button>
                                <Button size="md" fullWidth variant="danger" onClick={() => dispatch({ type: 'RESET_PROJECT' })}>
                                    <RotateCcw size={18} className="shrink-0" /> <span>Resetuj</span>
                                </Button>
                            </div>
                         </div>
                    </Card>

                    {/* KPI Widget placed here */}
                    <KPIDashboard />

                </div>
            </aside>
        </>
    );
};

export default Sidebar;
