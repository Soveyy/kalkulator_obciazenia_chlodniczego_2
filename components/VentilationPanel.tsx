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

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        let newVentilationGains = { ...ventilation };

        if (type === 'checkbox') {
            (newVentilationGains as any)[name] = checked;
        } else if (type === 'radio') {
            (newVentilationGains as any)[name] = value;
        } else if (['airflow', 'naturalVentilationAirflow', 'exteriorWallPerimeter', 'roomHeight', 'windSpeed', 'outdoorMoistureContent'].includes(name)) {
            if (value === '') {
                (newVentilationGains as any)[name] = '';
            } else {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0) {
                    (newVentilationGains as any)[name] = num;
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
                <h3 className="font-semibold mb-3">Parametry strefy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="label-style">Obwód ścian zewnętrznych (m):</label>
                        <Input type="number" name="exteriorWallPerimeter" value={ventilation.exteriorWallPerimeter} onChange={handleChange} min="0" step="0.1" />
                    </div>
                    <div>
                        <label className="label-style">Wysokość pomieszczenia (m):</label>
                        <Input type="number" name="roomHeight" value={ventilation.roomHeight} onChange={handleChange} min="0" step="0.1" />
                    </div>
                    <div>
                        <label className="label-style flex items-center">
                            Zawartość wilgoci powietrza zewn. (kg/kg):
                            <Tooltip text="Zawartość wilgoci powietrza zewnętrznego. Używana do obliczenia obciążenia utajonego." />
                        </label>
                        <Input name="outdoorMoistureContent" type="number" value={ventilation.outdoorMoistureContent} onChange={handleChange} step="0.0001" />
                    </div>
                    <div>
                        <label className="label-style flex items-center">
                            Efektywna pow. nieszczelności (cm²):
                            <Tooltip text="Obliczona na podstawie obwodu, wysokości i wybranej klasy szczelności budynku." />
                        </label>
                        <Input type="text" value={effectiveLeakageArea} disabled className="bg-slate-100 dark:bg-slate-800 text-slate-500 cursor-not-allowed" />
                    </div>
                </div>
            </Card>

            <Card>
                <h3 className="font-semibold mb-3">Sekcja A: Infiltracja</h3>
                <div className="space-y-4">
                    <Checkbox id="infiltration_enabled" label="Uwzględniaj infiltrację" name="includeInfiltration" checked={ventilation.includeInfiltration} onChange={handleChange} />
                    {ventilation.includeInfiltration && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                            <div>
                                <label className="label-style">Całkowita liczba kondygnacji budynku:</label>
                                <Select name="buildingStories" value={ventilation.buildingStories} onChange={handleChange}>
                                    <option value="1">1</option>
                                    <option value="2">2</option>
                                    <option value="3+">3 lub więcej</option>
                                </Select>
                            </div>
                            <div>
                                <label className="label-style">Klasa szczelności przegród:</label>
                                <Select name="tightnessClass" value={ventilation.tightnessClass} onChange={handleChange}>
                                    <option value="tight">Szczelne (0.7 cm²/m²)</option>
                                    <option value="average">Średnie (2.0 cm²/m²)</option>
                                    <option value="leaky">Nieszczelne (4.0 cm²/m²)</option>
                                </Select>
                            </div>
                            <div>
                                <label className="label-style">Klasa osłonięcia przed wiatrem:</label>
                                <Select name="shieldingClass" value={ventilation.shieldingClass} onChange={handleChange}>
                                    <option value="1">1 - Brak osłon</option>
                                    <option value="2">2 - Typowe dla domów wiejskich</option>
                                    <option value="3">3 - Typowe dla budynków naprzeciwko</option>
                                    <option value="4">4 - Typowe dla budynków miejskich na większych działkach</option>
                                    <option value="5">5 - Typowe dla gęstej zabudowy</option>
                                </Select>
                            </div>
                            <div>
                                <label className="label-style">Prędkość wiatru U (m/s):</label>
                                <Input type="number" name="windSpeed" value={ventilation.windSpeed} onChange={handleChange} min="0" step="0.1" />
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
                                dispatch({ type: 'SET_VENTILATION_GAINS', payload: { ...ventilation, type: 'mechanical', enabled: true } });
                            }} className="form-radio text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Mechaniczna z odzyskiem</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="type" value="natural" checked={ventilation.type === 'natural'} onChange={(e) => {
                                dispatch({ type: 'SET_VENTILATION_GAINS', payload: { ...ventilation, type: 'natural', enabled: true } });
                            }} className="form-radio text-indigo-600 focus:ring-indigo-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Grawitacyjna</span>
                        </label>
                    </div>

                    {ventilation.type !== 'none' && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                            {ventilation.type === 'mechanical' ? (
                                <>
                                    <div>
                                        <label className="label-style">Strumień powietrza wentylacyjnego (m³/h):</label>
                                        <Input type="number" name="airflow" value={ventilation.airflow} onChange={handleChange} min="0" />
                                    </div>
                                    <div>
                                        <label className="label-style">Typ wymiennika odzysku ciepła:</label>
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
                                    <label className="label-style">Normatywny wydatek powietrza (m³/h):</label>
                                    <Input type="number" name="naturalVentilationAirflow" value={ventilation.naturalVentilationAirflow} onChange={handleChange} min="0" />
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
            <style>{`.label-style { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.25rem; color: #334155; } .dark .label-style { color: #cbd5e1; }`}</style>
        </div>
    );
};

export default VentilationPanel;