
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import Input from './ui/Input';
import Select from './ui/Select';
import Checkbox from './ui/Checkbox';
import Button from './ui/Button';
import Tooltip from './ui/Tooltip';
import { XIcon } from './Icons';

const Sidebar: React.FC = () => {
    const { state, dispatch } = useCalculator();
    
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
                    bg-slate-50 dark:bg-slate-900 p-4 flex flex-col 
                    transform transition-transform duration-300 ease-in-out
                    
                    fixed inset-x-0 bottom-0 z-40 h-[85vh] w-full rounded-t-2xl shadow-2xl
                    ${state.isSidebarOpen ? 'translate-y-0' : 'translate-y-full'}
                    
                    lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-80 lg:rounded-none lg:shadow-none lg:translate-y-0 lg:translate-x-0 lg:pb-24
                `}
            >
                 <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-2 lg:hidden" aria-hidden="true"></div>
                 <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Parametry Główne</h2>
                    <button 
                        className="lg:hidden p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                        aria-label="Zamknij konfigurację"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 pb-4 -mr-2 pr-2">
                    {/* Project Management */}
                    <Card>
                        <h3 className="font-semibold mb-3">Projekt</h3>
                         <div className="space-y-3">
                            <div>
                                <label className="label-style flex items-center">
                                    Nazwa Projektu:
                                </label>
                                <Input name="projectName" type="text" value={state.input.projectName} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
                            </div>
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <Button fullWidth onClick={() => dispatch({ type: 'SAVE_PROJECT' })}>Zapisz</Button>
                                    <Button fullWidth variant="secondary" onClick={() => dispatch({ type: 'LOAD_PROJECT' })}>Wczytaj</Button>
                                </div>
                                <Button fullWidth variant="danger" onClick={() => dispatch({ type: 'RESET_PROJECT' })}>Resetuj</Button>
                            </div>
                         </div>
                    </Card>

                    {/* Input Data */}
                    <Card>
                        <h3 className="font-semibold mb-3">Dane Wejściowe</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="label-style flex items-center">
                                    Temperatura wewnętrzna (°C):
                                    <Tooltip text="Projektowana temperatura powietrza wewnątrz pomieszczenia."/>
                                </label>
                                <Input name="tInternal" type="number" value={state.input.tInternal} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
                            </div>
                            <div>
                                <label className="label-style flex items-center">
                                    Temperatura zewn. (°C):
                                    <Tooltip text="Maksymalna projektowana dobowa temperatura zewnętrzna." />
                                </label>
                                 <div className="flex gap-2 items-center">
                                    <Input name="tExternal" type="number" value={state.input.tExternal} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
                                    <Button variant="secondary" className="px-2 py-1" onClick={() => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'tempDatabase' } })}>Baza</Button>
                                 </div>
                            </div>
                             <div>
                                <label className="label-style flex items-center">
                                    Powierzchnia pomieszczenia (m²):
                                    <Tooltip text="Powierzchnia jest wykorzystywana do obliczania zysków od oświetlenia oraz urządzeń." />
                                </label>
                                <Input name="roomArea" type="number" value={state.input.roomArea} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
                            </div>
                        </div>
                    </Card>

                    {/* Accumulation Settings */}
                    <Card>
                         <h3 className="font-semibold mb-3 flex items-center">
                            Akumulacja Ciepła (RTS)
                            <Tooltip text="Ustawienia dotyczące zdolności budynku do magazynowania i opóźniania oddawania ciepła." />
                        </h3>
                        <div className="space-y-3">
                            <Checkbox
                                id="accumulation_enabled"
                                label="Uwzględnij akumulację ciepła"
                                name="include"
                                checked={state.accumulation.include}
                                onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: e.target.checked } })}
                            />
                            {state.accumulation.include && (
                                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-3 mt-3">
                                    <div>
                                        <label className="label-style flex items-center">
                                            Masa termiczna budynku:
                                            <Tooltip text="Określa zdolność budynku do magazynowania ciepła. Konstrukcja ciężka wolniej reaguje na zmiany temperatury." />
                                        </label>
                                        <Select name="thermalMass" value={state.accumulation.thermalMass} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: e.target.value as any } })}>
                                            <option value="light">Lekka</option>
                                            <option value="medium">Średnia</option>
                                            <option value="heavy">Ciężka</option>
                                            <option value="very_heavy">Bardzo ciężka</option>
                                        </Select>
                                    </div>
                                     <div>
                                        <label className="label-style flex items-center">
                                            Typ podłogi:
                                            <Tooltip text="Typ wykończenia podłogi wpływa na sposób pochłaniania i oddawania ciepła." />
                                        </label>
                                        <Select name="floorType" value={state.accumulation.floorType} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: e.target.value as any } })}>
                                            <option value="panels">Panele / Drewno</option>
                                            <option value="tiles">Płytki / Kamień</option>
                                            <option value="carpet">Wykładzina</option>
                                        </Select>
                                    </div>
                                    <div>
                                        <label className="label-style flex items-center">
                                            Procent przeszklenia fasady:
                                            <Tooltip text="Szacowany stosunek powierzchni okien do całkowitej powierzchni fasady. Wpływa na charakterystykę akumulacji ciepła." />
                                        </label>
                                        <Select name="glassPercentage" value={state.accumulation.glassPercentage} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: parseInt(e.target.value) as any } })}>
                                            <option value={10}>10%</option>
                                            <option value={50}>50%</option>
                                            <option value={90}>90%</option>
                                        </Select>
                                    </div>
                                    <div className="mt-4">
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
                
                <div className="mt-auto pt-4 text-center text-xs text-slate-400">
                    Wersja 0.3
                </div>
                <style>{`.label-style { display: block; text-sm font-medium mb-1 text-slate-700 dark:text-slate-300; }`}</style>
            </aside>
        </>
    );
};

export default Sidebar;
