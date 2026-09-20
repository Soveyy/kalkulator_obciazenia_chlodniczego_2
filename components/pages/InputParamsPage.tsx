import React, { useEffect, useMemo, useRef } from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import Tooltip from '../ui/Tooltip';
import RtsInlineWidget from '../RtsInlineWidget';
import RtsPresetDetails from '../RtsPresetDetails';
import CustomRtsPresetSelect from '../ui/CustomRtsPresetSelect';

const InputParamsPage: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const areaRef = useRef<HTMLInputElement>(null);
    const temperatureRef = useRef<HTMLInputElement>(null);
    const humidityRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const request = state.inputFocusRequest;
        if (!request || request.roomId !== state.activeRoomId) return;
        const input = { roomArea: areaRef, tInternal: temperatureRef, rhInternal: humidityRef }[request.field].current;
        if (input) {
            input.focus({ preventScroll: true });
            input.select();
            input.scrollIntoView({ block: 'nearest' });
            dispatch({ type: 'CLEAR_INPUT_FOCUS' });
        }
    }, [state.inputFocusRequest, state.activeRoomId, dispatch]);

    const isAggregate = state.activeRoomId === 'aggregate';

    const aggregateData = useMemo(() => {
        if (!isAggregate) return null;

        let totalArea = 0;
        let weightedTSum = 0;
        let weightedRhSum = 0;
        let validRoomsCount = 0;

        state.rooms.forEach(room => {
            const area = parseFloat(room.input.roomArea) || 0;
            const tInt = parseFloat(room.input.tInternal) || 24;
            const rhInt = parseFloat(room.input.rhInternal) || 50;
            if (area > 0) {
                totalArea += area;
                weightedTSum += (tInt * area);
                weightedRhSum += (rhInt * area);
                validRoomsCount++;
            }
        });

        const weightedT = totalArea > 0 ? weightedTSum / totalArea : 24;
        const weightedRh = totalArea > 0 ? weightedRhSum / totalArea : 50;

        return {
            totalArea,
            weightedT,
            weightedRh,
            validRoomsCount
        };
    }, [state.rooms, isAggregate]);

    if (isAggregate) {
        return (
            <div className="space-y-6 animate-fade-in">
                <Card className="p-8 text-center flex flex-col items-center justify-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center mb-4">
                        <span className="text-2xl">📋</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Parametry wejściowe budynku</h2>
                    <p className="text-slate-500 dark:text-slate-400 max-w-lg mb-8">
                        Widok zbiorczy uśrednia statystyki wszystkich pomieszczeń na podstawie ich powierzchni. Aby edytować ustawienia, przełącz się na wybrane pomieszczenie.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Całkowita powierzchnia</span>
                            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                                {aggregateData?.totalArea.toFixed(1)} <span className="text-lg font-normal">m²</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Średnia temp. (ważona p.a.)</span>
                            <div className="text-3xl font-bold text-slate-800 dark:text-white">
                                {aggregateData?.weightedT.toFixed(1)} <span className="text-lg font-normal">°C</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col items-center">
                            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-1">Średnia wilgotność</span>
                            <div className="text-3xl font-bold text-slate-800 dark:text-white">
                                {aggregateData?.weightedRh.toFixed(1)} <span className="text-lg font-normal">%</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>
        );
    }

    const currentRoom = state.rooms.find(r => r.id === state.activeRoomId);
    if (!currentRoom) return null;

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        dispatch({
            type: 'SET_INPUT',
            payload: { ...currentRoom.input, [name]: value },
        });
    };

    const handleAccumulationChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement> | { target: { name: string, value: any } }) => {
        const { name, value } = e.target;
        dispatch({
            type: 'SET_ACCUMULATION',
            payload: { ...currentRoom.accumulation, [name]: name === 'glassPercentage' ? parseInt(value) : value }
        });
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 items-stretch">
                
                {/* Air Parameters */}
                <Card className={`p-6 min-h-[520px] flex flex-col ${currentRoom.accumulation.include ? 'xl:col-span-2' : 'xl:col-span-5'}`}>
                    <div className="flex items-center gap-3 mb-6 min-w-0 xl:min-h-[58px]">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-tight whitespace-normal">Parametry pomieszczenia</h3>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Środowisko i wymiary</p>
                        </div>
                    </div>
                    
                    <div className="flex flex-col gap-4 flex-grow w-full">
                        {/* Invisible alignment spacer to line up vertically with the right column card's Checkbox */}
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg w-full opacity-0 invisible select-none pointer-events-none" aria-hidden="true">
                            <Checkbox
                                id="alignment_spacer"
                                label="Uwzględnij akumulację ciepła (zalecane)"
                                checked={false}
                                onChange={() => {}}
                            />
                        </div>
                        
                        <div className="flex flex-col gap-4 w-full">
                                <div className="w-full">
                                    <div className="flex items-center mb-1.5">
                                        <label htmlFor="room-temperature" className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Temperatura wew. (°C)</label>
                                        <Tooltip text="Zalecana temperatura do chłodzenia to zazwyczaj 24-26°C." position="top" />
                                    </div>
                                    <Input
                                        type="number"
                                        name="tInternal"
                                        id="room-temperature"
                                        ref={temperatureRef}
                                        value={currentRoom.input.tInternal}
                                        onChange={handleInputChange}
                                        min="16" max="32" step="0.5"
                                        className="text-base py-2 w-full"
                                    />
                                </div>
                            
                                <div className="w-full">
                                    <div className="flex items-center mb-1.5">
                                        <label htmlFor="room-humidity" className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Wilgotność wew. (%)</label>
                                        <Tooltip text="Dla komfortu zwykle przyjmuje się 50%." position="top" />
                                    </div>
                                    <Input
                                        type="number"
                                        name="rhInternal"
                                        id="room-humidity"
                                        ref={humidityRef}
                                        value={currentRoom.input.rhInternal}
                                        onChange={handleInputChange}
                                        min="30" max="70" step="5"
                                        className="text-base py-2 w-full"
                                    />
                                </div>
                            
                                <div className="w-full">
                                    <div className="flex items-center mb-1.5">
                                        <label htmlFor="room-area" className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Powierzchnia (m²)</label>
                                        <Tooltip text="Powierzchnia pomieszczenia w metrach kwadratowych. Służy do automatycznego przeliczania niektórych zysków." position="top" />
                                    </div>
                                    <Input
                                        type="number"
                                        name="roomArea"
                                        id="room-area"
                                        ref={areaRef}
                                        value={currentRoom.input.roomArea}
                                        onChange={handleInputChange}
                                        min="1" step="0.5"
                                        className="text-base py-2 w-full font-semibold text-blue-600 dark:text-blue-400"
                                    />
                                </div>
                        </div>
                    </div>
                </Card>

                {/* RTS Accumulation Controls */}
                <Card className={`p-6 min-h-[520px] flex flex-col !overflow-visible relative z-20 ${currentRoom.accumulation.include ? 'xl:col-span-2' : 'xl:col-span-5'}`}>
                    <div className="flex items-center gap-3 mb-6 min-w-0 xl:min-h-[58px]">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                            <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                        </div>
                        <div className="min-w-0">
                            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-tight whitespace-normal overflow-hidden text-ellipsis">Akumulacja</h3>
                            <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Bezwładność cieplna</p>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4 flex-grow w-full">
                        <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg w-full">
                             <Checkbox
                                id="accumulation_enabled"
                                label="Uwzględnij akumulację ciepła (zalecane)"
                                name="include"
                                checked={currentRoom.accumulation.include}
                                onChange={(e) => dispatch({ type: 'SET_ACCUMULATION', payload: { ...currentRoom.accumulation, [e.target.name]: e.target.checked } })}
                            />
                        </div>
                        
                        {currentRoom.accumulation.include && (
                            <div className="flex flex-col gap-4 animate-fade-in w-full">
                                    <div className="w-full">
                                        <div className="flex items-center mb-1.5">
                                            <label htmlFor="room-rts-preset" className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Typ budynku / pomieszczenia</label>
                                            <Tooltip text="Wybór określa reprezentatywną geometrię i konstrukcję przegród, a przez to wpływa na akumulację ciepła oraz godzinowy rozkład obciążenia." position="top" />
                                        </div>
                                        <CustomRtsPresetSelect
                                            id="room-rts-preset"
                                            value={currentRoom.accumulation.rtsPreset}
                                            onChange={(val) => handleAccumulationChange({ target: { name: 'rtsPreset', value: val } } as any)}
                                        />
                                    </div>
                                
                                    <div className="w-full">
                                        <div className="flex items-center mb-1.5">
                                            <label htmlFor="room-floor-type" className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">Typ podłogi</label>
                                            <Tooltip text="Wybierz dominujące wykończenie podłogi. Wpływa ono na pochłanianie i późniejsze oddawanie ciepła przez podłogę. Wykładzina lub dywan ograniczają udział masy podłogi w akumulacji. Wybór służy do doboru współczynników RTF." position="top" />
                                        </div>
                                        <Select
                                            id="room-floor-type"
                                            name="floorType"
                                            value={currentRoom.accumulation.floorType}
                                            onChange={handleAccumulationChange as any}
                                            className="text-base py-2 w-full"
                                        >
                                            <option value="carpet">Wykładzina / dywan</option>
                                            <option value="panels">Drewno / parkiet / panele</option>
                                            <option value="tiles">Płytki / kamień / beton</option>
                                        </Select>
                                    </div>
                                
                                    <div className="w-full">
                                        <div className="flex items-center mb-1.5">
                                            <label htmlFor="room-glass-percentage" className="block text-xs font-medium text-slate-700 dark:text-slate-300 uppercase tracking-wider">% przeszklenia fasady</label>
                                            <Tooltip text="Udział powierzchni szyb w całkowitej powierzchni ścian zewnętrznych tego pomieszczenia. Parametr służy do doboru współczynników RTF. Okna należy dodatkowo wprowadzić w zakładce „Okna”." position="top" />
                                        </div>
                                        <Select
                                            id="room-glass-percentage"
                                            name="glassPercentage"
                                            value={currentRoom.accumulation.glassPercentage}
                                            onChange={handleAccumulationChange as any}
                                            className="text-base py-2 w-full"
                                        >
                                            <option value="10">10%</option>
                                            <option value="50">50%</option>
                                            <option value="90">90%</option>
                                        </Select>
                                    </div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* RTS Accumulation Chart */}
                {currentRoom.accumulation.include && (
                    <Card className="p-6 h-full flex flex-col xl:col-span-6 animate-fade-in border-orange-100 dark:border-orange-900/30 z-10">
                        <div className="flex-1 min-h-[460px] flex flex-col">
                            <RtsInlineWidget roomId={currentRoom.id} />
                        </div>
                    </Card>
                )}
            </div>

            {currentRoom.accumulation.include && (
                <RtsPresetDetails accumulation={currentRoom.accumulation} />
            )}

            {state.tutorialMode && (
                <Card className="p-4 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 animate-fade-in shadow-md">
                    <div className="flex items-start gap-4">
                        <span className="text-2xl mt-1">💡</span>
                        <div>
                            <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-1">Jak wypełnić parametry wejściowe?</h4>
                            <ul className="list-disc pl-5 text-sm text-amber-700 dark:text-amber-300 space-y-1">
                                <li><strong>Powierzchnia pomieszczenia</strong> posłuży później m.in. do wstępnego szacowania zysków od oświetlenia lub rozkładu obciążenia na m².</li>
                                <li><strong>Temperatura wewnętrzna</strong> wpływa na zyski przez przegrody i infiltrację we wszystkich kolejnych krokach. Projektowa wartość latem to najczęściej 24-26°C.</li>
                                <li><strong>Akumulacja ciepła (Bezwładność RTS)</strong> - fizyczne zjawisko pochłaniania energii promieniowania słonecznego i wewnętrznego przez ściany, podłogi, stropy i wyposażenie. Energia ta nie obciąża klimatyzacji natychmiast, lecz jest oddawana do powietrza z opóźnieniem. Wybierz typ budynku lub pomieszczenia na podstawie elementów opisanych w karcie pod wykresem.</li>
                            </ul>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default InputParamsPage;
