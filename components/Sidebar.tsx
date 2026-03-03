
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
                    bg-slate-50 dark:bg-slate-900 p-3 flex flex-col 
                    transform transition-transform duration-300 ease-in-out
                    
                    fixed inset-x-0 bottom-0 z-40 h-[85vh] w-full rounded-t-2xl shadow-2xl
                    ${state.isSidebarOpen ? 'translate-y-0' : 'translate-y-full'}
                    
                    lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-80 lg:rounded-none lg:shadow-none lg:translate-y-0 lg:translate-x-0 lg:pb-20
                `}
            >
                 <div className="w-16 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full mx-auto mb-2 lg:hidden" aria-hidden="true"></div>
                 <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Parametry Główne</h2>
                        <span className={`w-2 h-2 rounded-full transition-colors ${useCalculator().progress.base ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
                    </div>
                    <button 
                        className="lg:hidden p-1 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                        onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
                        aria-label="Zamknij konfigurację"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto overflow-x-hidden space-y-4 pb-4 -mr-2 pr-2">
                    {/* Project Management */}
                    <Card className="!p-4">
                         <div className="space-y-2">
                            <div>
                                <label className="label-style flex items-center font-semibold">
                                    Nazwa Projektu:
                                </label>
                                <Input name="projectName" type="text" value={state.input.projectName} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
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
                    <Card className="!p-4">
                        <div className="space-y-2">
                            <div>
                                <label className="label-style flex items-center font-semibold">
                                    Temperatura wewnętrzna (°C):
                                    <Tooltip text="Projektowana temperatura powietrza wewnątrz pomieszczenia." position="top" />
                                </label>
                                <Input name="tInternal" type="number" value={state.input.tInternal} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
                            </div>
                            <div>
                                <label className="label-style flex items-center font-semibold">
                                    Wilgotność wewn. (%):
                                    <Tooltip text="Projektowana wilgotność względna powietrza wewnątrz." position="top" />
                                </label>
                                <Input name="rhInternal" type="number" value={state.input.rhInternal} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
                            </div>
                            <div>
                                <label className="label-style flex items-center font-semibold">
                                    Temperatura zewn. (°C):
                                    <Tooltip text="Maksymalna projektowana dobowa temperatura zewnętrzna." position="top" />
                                </label>
                                 <div className="flex gap-2 items-center">
                                    <Input name="tExternal" type="number" value={state.input.tExternal} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
                                    <Button variant="secondary" className="px-2 py-1" onClick={() => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'tempDatabase' } })}>Baza</Button>
                                 </div>
                            </div>
                             <div>
                                <label className="label-style flex items-center font-semibold">
                                    Powierzchnia (m²):
                                    <Tooltip text="Powierzchnia jest wykorzystywana do obliczania zysków od oświetlenia oraz urządzeń." position="top" />
                                </label>
                                <Input name="roomArea" type="number" value={state.input.roomArea} onChange={(e) => dispatch({ type: 'SET_INPUT', payload: { ...state.input, [e.target.name]: e.target.value } })} />
                            </div>
                        </div>
                    </Card>

                    {/* Accumulation Settings */}
                    <Card className="!p-4">
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
                            />
                            {state.accumulation.include && (
                                <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2 mt-2">
                                    <div>
                                        <label className="label-style flex items-center font-semibold">
                                            Masa termiczna budynku:
                                            <Tooltip text="Określa zdolność budynku do magazynowania ciepła. Konstrukcja ciężka wolniej reaguje na zmiany temperatury." position="top" />
                                        </label>
                                        <Select name="thermalMass" value={state.accumulation.thermalMass} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: e.target.value as any } })}>
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
                                        <Select name="floorType" value={state.accumulation.floorType} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: e.target.value as any } })}>
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
                                        <Select name="glassPercentage" value={state.accumulation.glassPercentage} onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...state.accumulation, [e.target.name]: parseInt(e.target.value) as any } })}>
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
