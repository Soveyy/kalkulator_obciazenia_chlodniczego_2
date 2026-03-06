import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import Checkbox from './ui/Checkbox';
import Input from './ui/Input';
import Select from './ui/Select';
import { VENTILATION_EXCHANGER_TYPES } from '../constants';
import Tooltip from './ui/Tooltip';

const VentilationPanel: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const { ventilation } = state.internalGains;
    const { input } = state;
    const [moistureError, setMoistureError] = React.useState<string | null>(null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        let newVentilationGains = { ...ventilation };

        if (type === 'checkbox') {
            (newVentilationGains as any)[name] = checked;
        } else if (type === 'radio') {
            (newVentilationGains as any)[name] = value;
        } else if (name === 'outdoorMoistureContent') {
            if (value === '') {
                newVentilationGains.outdoorMoistureContent = '';
                setMoistureError(null);
            } else {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    newVentilationGains.outdoorMoistureContent = num;
                    if (num < 0.005 || num > 0.018) {
                        setMoistureError('Wartość musi być w zakresie 0,005 - 0,018 kg/kg');
                    } else {
                        setMoistureError(null);
                    }
                }
            }
        } else if (['airflow', 'naturalVentilationAirflow', 'exteriorWallPerimeter', 'roomHeight'].includes(name)) {
            if (value === '') {
                (newVentilationGains as any)[name] = '';
            } else {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    (newVentilationGains as any)[name] = Math.max(0, num);
                }
            }
        } else if (name === 'windSpeed') {
            if (value === '') {
                newVentilationGains.windSpeed = '';
            } else {
                const num = parseFloat(value);
                if (!isNaN(num)) {
                    newVentilationGains.windSpeed = Math.max(0, Math.min(20, num));
                }
            }
        } else {
            (newVentilationGains as any)[name] = value;
        }
    
        dispatch({ type: 'SET_VENTILATION_GAINS', payload: newVentilationGains });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        dispatch({ type: 'SET_INPUT', payload: { ...input, [name]: value } });
    };

    const perimeter = Number(ventilation.exteriorWallPerimeter) || 0;
    const height = Number(ventilation.roomHeight) || 0;
    const wallArea = perimeter * height;
    
    let tightnessFactor = 2.0;
    if (ventilation.tightnessClass === 'tight') tightnessFactor = 0.7;
    if (ventilation.tightnessClass === 'leaky') tightnessFactor = 4.0;
    
    const effectiveLeakageArea = (wallArea * tightnessFactor).toFixed(1);

    return (
        <div className="space-y-6">
            <Card>
                <h3 className="font-semibold mb-3">Parametry ogólne</h3>
                <div className="max-w-md">
                    <label className="label-style flex items-center font-medium">
                        Zawartość wilgoci powietrza zewn. (kg/kg):
                        <Tooltip text="Zawartość wilgoci powietrza zewnętrznego. Używana do obliczenia obciążenia utajonego dla wentylacji i infiltracji." position="top" />
                    </label>
                    <div className="relative">
                        <Input 
                            name="outdoorMoistureContent" 
                            type="number" 
                            value={ventilation.outdoorMoistureContent} 
                            onChange={handleChange} 
                            step="0.0001" 
                            min="0.005" 
                            max="0.018" 
                            className={
                                ventilation.outdoorMoistureContent === '' ? 'animate-pulse-border border-blue-400' : 
                                (ventilation.outdoorMoistureContent < 0.005 || ventilation.outdoorMoistureContent > 0.018) ? 'animate-pulse-error' : ''
                            } 
                        />
                        {moistureError && (
                            <p className="text-[10px] text-red-500 mt-1 absolute bg-white dark:bg-slate-900 px-1 rounded border border-red-200 dark:border-red-900/50 z-10 shadow-sm">
                                {moistureError}
                            </p>
                        )}
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="font-semibold mb-3">Sekcja A: Infiltracja (nieszczelności)</h3>
                <div className="space-y-4">
                    <Checkbox id="infiltration_enabled" label="Uwzględniaj infiltrację" name="includeInfiltration" checked={ventilation.includeInfiltration} onChange={handleChange} />
                    {ventilation.includeInfiltration && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-style font-medium">Obwód ścian zewnętrznych (m):</label>
                                    <Input 
                                        type="number" 
                                        name="exteriorWallPerimeter" 
                                        value={ventilation.exteriorWallPerimeter} 
                                        onChange={handleChange} 
                                        min="0.1" 
                                        step="any" 
                                        className={
                                            ventilation.exteriorWallPerimeter === '' ? 'animate-pulse-border border-blue-400' : 
                                            (ventilation.exteriorWallPerimeter < 0.1) ? 'animate-pulse-error' : ''
                                        }
                                    />
                                </div>
                                <div>
                                    <label className="label-style font-medium">Wysokość pomieszczenia (m):</label>
                                    <Input 
                                        type="number" 
                                        name="roomHeight" 
                                        value={ventilation.roomHeight} 
                                        onChange={handleChange} 
                                        min="0.1" 
                                        step="any" 
                                        className={
                                            ventilation.roomHeight === '' ? 'animate-pulse-border border-blue-400' : 
                                            (ventilation.roomHeight < 0.1) ? 'animate-pulse-error' : ''
                                        }
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="label-style font-medium">Klasa szczelności przegród:</label>
                                <Select name="tightnessClass" value={ventilation.tightnessClass} onChange={handleChange}>
                                    <option value="tight">Szczelne (0.7 cm²/m²)</option>
                                    <option value="average">Średnie (2.0 cm²/m²)</option>
                                    <option value="leaky">Nieszczelne (4.0 cm²/m²)</option>
                                </Select>
                            </div>

                            <div>
                                <label className="label-style flex items-center font-medium">
                                    Efektywna pow. nieszczelności (cm²):
                                    <Tooltip text="Obliczona na podstawie obwodu, wysokości i wybranej klasy szczelności budynku." position="top" />
                                </label>
                                <Input type="text" value={effectiveLeakageArea} disabled className="bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" />
                            </div>

                            <div>
                                <label className="label-style font-medium">Całkowita liczba kondygnacji budynku:</label>
                                <Select name="buildingStories" value={ventilation.buildingStories} onChange={handleChange}>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3+">3 lub więcej</option>
                                </Select>
                            </div>
                            
                            <div>
                                <label className="label-style font-medium">Klasa osłonięcia przed wiatrem:</label>
                                <Select name="shieldingClass" value={ventilation.shieldingClass} onChange={handleChange}>
                                    <option value="1">Klasa 1 - Brak przeszkód (teren otwarty)</option>
                                    <option value="2">Klasa 2 - Osłona słaba (odizolowany dom wiejski)</option>
                                    <option value="3">Klasa 3 - Osłona umiarkowana (budynki po przeciwnej stronie ulicy)</option>
                                    <option value="4">Klasa 4 - Osłona miejska rozproszona (przeszkody dalej niż wysokość budynku)</option>
                                    <option value="5">Klasa 5 - Osłona silna (gęsta zabudowa, bliskie sąsiedztwo budynków/drzew)</option>
                                </Select>
                            </div>
                            <div>
                                <label className="label-style flex items-center font-medium">
                                    Prędkość wiatru U (m/s):
                                    <Tooltip text="Domyślna średnia prędkość powietrza dla Warszawy w miesiącach letnich wynosi 3,4 m/s." position="top" />
                                </label>
                                <Input 
                                    type="number" 
                                    name="windSpeed" 
                                    value={ventilation.windSpeed} 
                                    onChange={handleChange} 
                                    min="0" 
                                    max="20"
                                    step="any" 
                                    className={
                                        ventilation.windSpeed === '' ? 'animate-pulse-border border-blue-400' : 
                                        (ventilation.windSpeed < 0 || ventilation.windSpeed > 20) ? 'animate-pulse-error' : ''
                                    }
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <Card>
                <h3 className="font-semibold mb-3">Sekcja B: Typ wentylacji</h3>
                <div className="space-y-4">
                    <div className="flex flex-wrap gap-4 mb-4">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="type" value="none" checked={ventilation.type === 'none'} onChange={(e) => {
                                dispatch({ type: 'SET_VENTILATION_GAINS', payload: { ...ventilation, type: 'none', enabled: false } });
                            }} className="form-radio text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Brak</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="type" value="mechanical" checked={ventilation.type === 'mechanical'} onChange={(e) => {
                                dispatch({ type: 'SET_VENTILATION_GAINS', payload: { ...ventilation, type: 'mechanical', enabled: true, airflow: 50 } });
                            }} className="form-radio text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mechaniczna z odzyskiem</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="type" value="natural" checked={ventilation.type === 'natural'} onChange={(e) => {
                                dispatch({ type: 'SET_VENTILATION_GAINS', payload: { ...ventilation, type: 'natural', enabled: true, naturalVentilationAirflow: 50 } });
                            }} className="form-radio text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Grawitacyjna</span>
                        </label>
                    </div>

                    {ventilation.type !== 'none' && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                            {ventilation.type === 'mechanical' ? (
                                <>
                                    <div>
                                        <label className="label-style font-medium">Strumień powietrza wentylacyjnego (m³/h):</label>
                                        <Input type="number" name="airflow" value={ventilation.airflow} onChange={handleChange} min="0" step="any" />
                                    </div>
                                    <div>
                                        <label className="label-style font-medium">Typ wymiennika odzysku ciepła:</label>
                                        <Select name="exchangerType" value={ventilation.exchangerType} onChange={handleChange}>
                                            {Object.entries(VENTILATION_EXCHANGER_TYPES).map(([key, value]) => (
                                                <option key={key} value={key}>{value.label}</option>
                                            ))}
                                        </Select>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {VENTILATION_EXCHANGER_TYPES[ventilation.exchangerType]?.description}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="label-style font-medium">Normatywny wydatek powietrza (m³/h):</label>
                                    <Input type="number" name="naturalVentilationAirflow" value={ventilation.naturalVentilationAirflow} onChange={handleChange} min="0" step="any" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    );
};

export default VentilationPanel;