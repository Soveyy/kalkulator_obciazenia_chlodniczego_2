
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Checkbox from './ui/Checkbox';
import Button from './ui/Button';
import Tooltip from './ui/Tooltip';
import { XIcon } from './Icons';
import { HelpCircle, Sparkles } from 'lucide-react';
import { createTutorial } from '../services/tutorialService';

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
                    
                    lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-80 lg:shadow-none lg:translate-x-0 lg:pb-0
                `}
            >
                 <div className="flex justify-between items-center mb-4 mt-2 lg:mt-0">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Parametry Główne</h2>
                        <span className={`w-2 h-2 rounded-full transition-colors ${progress.base ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    </div>
                    <button 
                        id="sidebar-toggle"
                        className="lg:hidden p-2 -mr-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                        aria-label="Zamknij konfigurację"
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
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Tryb Pomocy</span>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        className="sr-only peer"
                                        checked={state.tutorialMode}
                                        onChange={(e) => dispatch({ type: 'SET_TUTORIAL_MODE', payload: e.target.checked })}
                                    />
                                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                                </label>
                            </div>
                            <Button 
                                variant="secondary" 
                                fullWidth 
                                size="sm"
                                onClick={startTour}
                                className="!py-1.5 text-xs flex items-center justify-center gap-2"
                            >
                                <Sparkles size={14} />
                                Uruchom przewodnik
                            </Button>
                        </div>
                    </Card>

                    {/* Project Management */}
                    <Card id="project-management" className="!p-4">
                         <div className="space-y-2">
                            <div>
                                <label className="label-style flex items-center font-semibold">
                                    Nazwa Projektu:
                                </label>
                                <Input 
                                    name="projectName" 
                                    type="text" 
                                    value={state.input.projectName} 
                                    onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} 
                                    className={!state.input.projectName ? 'animate-pulse-border border-blue-400' : ''}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Button fullWidth onClick={() => dispatch({ type: 'SAVE_PROJECT_AS', payload: state.input.projectName })}>Zapisz</Button>
                                    <Button fullWidth variant="secondary" onClick={() => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'projectList' } })}>Wczytaj</Button>
                                </div>
                                <div className="flex gap-2">
                                    <Button fullWidth variant="secondary" onClick={() => dispatch({ type: 'GENERATE_SHARE_LINK' })}>Udostępnij</Button>
                                    <Button fullWidth variant="danger" onClick={() => dispatch({ type: 'RESET_PROJECT' })}>Resetuj</Button>
                                </div>
                            </div>
                         </div>
                    </Card>

                    {/* Input Data */}
                    <Card id="room-basic-info" className="!p-4 relative overflow-hidden">
                        {state.tutorialMode && (
                            <div className="absolute top-0 right-0 p-1">
                                <Sparkles size={12} className="text-blue-500 animate-pulse" />
                            </div>
                        )}
                        <div className="space-y-2">
                            {state.activeRoomId === 'aggregate' && (
                                <div className="text-sm text-slate-500 dark:text-slate-400 italic mb-2">
                                    Wybierz konkretne pomieszczenie, aby edytować jego parametry.
                                </div>
                            )}
                            <div>
                                <label className="label-style flex items-center font-semibold">
                                    Temperatura wewnętrzna (°C):
                                    <Tooltip text="Projektowana temperatura powietrza wewnątrz pomieszczenia." position="top" />
                                </label>
                                <Input 
                                    name="tInternal" 
                                    type="number" 
                                    value={state.input.tInternal} 
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                        dispatch({ type: 'SET_INPUT', payload: { ...state.input, tInternal: val } });
                                    }} 
                                    step="any"
                                    min="-50"
                                    max="50"
                                    disabled={state.activeRoomId === 'aggregate'}
                                    className={
                                        state.input.tInternal === '' ? 'animate-pulse-border border-blue-400' : 
                                        (state.input.tInternal < -50 || state.input.tInternal > 50) ? 'animate-pulse-error' : ''
                                    }
                                />
                                {state.tutorialMode && (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 italic">
                                        Wskazówka: Zazwyczaj 22-26°C dla komfortu.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label-style flex items-center font-semibold">
                                    Wilgotność wewn. (%):
                                    <Tooltip text="Projektowana wilgotność względna powietrza wewnątrz." position="top" />
                                </label>
                                <Input 
                                    name="rhInternal" 
                                    type="number" 
                                    value={state.input.rhInternal} 
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                        dispatch({ type: 'SET_INPUT', payload: { ...state.input, rhInternal: val } });
                                    }} 
                                    step="any"
                                    min="0"
                                    max="100"
                                    disabled={state.activeRoomId === 'aggregate'}
                                    className={
                                        state.input.rhInternal === '' ? 'animate-pulse-border border-blue-400' : 
                                        (state.input.rhInternal < 0 || state.input.rhInternal > 100) ? 'animate-pulse-error' : ''
                                    }
                                />
                                {state.tutorialMode && (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 italic">
                                        Wskazówka: Standardowo 40-60%.
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label-style flex items-center font-semibold">
                                    Powierzchnia (m²):
                                    <Tooltip text="Powierzchnia jest wykorzystywana do obliczania zysków od oświetlenia oraz urządzeń." position="top" />
                                </label>
                                <Input 
                                    name="roomArea" 
                                    type="number" 
                                    value={state.input.roomArea} 
                                    onChange={(e) => {
                                        const val = e.target.value === '' ? '' : parseFloat(e.target.value);
                                        dispatch({ type: 'SET_INPUT', payload: { ...state.input, roomArea: val } });
                                    }} 
                                    step="any"
                                    min="0.01"
                                    disabled={state.activeRoomId === 'aggregate'}
                                    className={
                                        state.input.roomArea === '' ? 'animate-pulse-border border-blue-400' : 
                                        (state.input.roomArea <= 0) ? 'animate-pulse-error' : ''
                                    }
                                />
                            </div>
                        </div>
                    </Card>

                    {/* Accumulation Settings */}
                    <Card id="accumulation-settings" className="!p-4">
                         <h3 className="font-semibold mb-2 flex items-center">
                            Akumulacja Ciepła (RTS)
                            <Tooltip text="Ustawienia dotyczące zdolności budynku do magazynowania i opóźniania oddawania ciepła." position="top" />
                        </h3>
                        <div className="space-y-2">
                            <Checkbox
                                id="accumulation_enabled"
                                label="Uwzględnij akumulację ciepła"
                                name="include"
                                checked={state.accumulation.include}
                                onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: e.target.checked } })}
                                disabled={state.activeRoomId === 'aggregate'}
                            />
                            {state.accumulation.include && (
                                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 mt-2">
                                    <div>
                                        <label className="label-style flex items-center font-semibold">
                                            Masa termiczna budynku:
                                            <Tooltip text="Określa zdolność budynku do magazynowania ciepła. Konstrukcja ciężka wolniej reaguje na zmiany temperatury." position="top" />
                                        </label>
                                        <Select name="thermalMass" value={state.accumulation.thermalMass} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: e.target.value as any } })} disabled={state.activeRoomId === 'aggregate'}>
                                            <option value="light">Lekka</option>
                                            <option value="medium">Średnia</option>
                                            <option value="heavy">Ciężka</option>
                                            <option value="very_heavy">Bardzo ciężka</option>
                                        </Select>
                                    </div>
                                     <div>
                                        <label className="label-style flex items-center font-semibold">
                                            Typ podłogi:
                                            <Tooltip text="Typ wykończenia podłogi wpływa na sposób pochłaniania i oddawania ciepła." position="top" />
                                        </label>
                                        <Select name="floorType" value={state.accumulation.floorType} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: e.target.value as any } })} disabled={state.activeRoomId === 'aggregate'}>
                                            <option value="panels">Panele / Drewno</option>
                                            <option value="tiles">Płytki / Kamień</option>
                                            <option value="carpet">Wykładzina</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="label-style flex items-center font-semibold">
                                            Procent przeszklenia fasady:
                                            <Tooltip text="Szacowany stosunek powierzchni okien do całkowitej powierzchni fasady. Wpływa na charakterystykę akumulacji ciepła." position="top" />
                                        </label>
                                        <Select name="glassPercentage" value={state.accumulation.glassPercentage} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: parseInt(e.target.value) as any } })} disabled={state.activeRoomId === 'aggregate'}>
                                            <option value={10}>10%</option>
                                            <option value={50}>50%</option>
                                            <option value={90}>90%</option>
                                        </Select>
                                    </div>
                                    <div className="mt-2">
                                        <Button 
                                            variant="secondary" 
                                            fullWidth 
                                            onClick={() => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'rtsVisualizer' } })}
                                        >
                                            Pokaż wizualizację krzywych RTS
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
