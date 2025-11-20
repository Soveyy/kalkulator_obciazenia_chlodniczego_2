
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import Checkbox from './ui/Checkbox';
import Input from './ui/Input';
import Select from './ui/Select';
import Button from './ui/Button';
import TimeRangeSlider from './ui/TimeRangeSlider';
import { PEOPLE_ACTIVITY_LEVELS, LIGHTING_TYPES, EQUIPMENT_PRESETS } from '../constants';
import { TrashIcon, PlusIcon } from './Icons';
import Tooltip from './ui/Tooltip';

const InternalGainsPanel: React.FC = () => {
    const { state, dispatch } = useCalculator();

    const hours = Array.from({ length: 25 }, (_, i) => i);

    const handlePeopleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        const currentPeopleGains = state.internalGains.people;
        let newPeopleGains = { ...currentPeopleGains };

        if (type === 'checkbox') {
            (newPeopleGains as any)[name] = checked;
        } else if (name === 'count') {
            if (value === '') {
                newPeopleGains.count = '';
            } else {
                const num = parseInt(value, 10);
                if (!isNaN(num) && num >= 0) {
                    newPeopleGains.count = Math.floor(num);
                }
            }
        } else { 
             const numValue = parseInt(value, 10);
            (newPeopleGains as any)[name] = isNaN(numValue) ? value : numValue;
        }
    
        dispatch({ type: 'SET_INTERNAL_GAINS', payload: { ...state.internalGains, people: newPeopleGains } });
    };
    
    const handlePeopleTimeChange = (start: number, end: number) => {
         dispatch({ 
             type: 'SET_INTERNAL_GAINS', 
             payload: { 
                 ...state.internalGains, 
                 people: { ...state.internalGains.people, startHour: start, endHour: end } 
             } 
         });
    }

    const handleLightingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        
        let val: any;
        if (type === 'checkbox') {
            val = checked;
        } else if (name === 'powerDensity') {
             if (value === '') {
                val = '';
            } else {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0) {
                    val = Math.floor(num);
                } else {
                    return; 
                }
            }
        } else {
            val = value;
        }

        const newLightingGains = { ...state.internalGains.lighting, [name]: val };
        
        if (name === 'type' && value !== state.internalGains.lighting.type) {
            newLightingGains.powerDensity = LIGHTING_TYPES[value]?.powerDensity || 0;
        }

        dispatch({ type: 'SET_INTERNAL_GAINS', payload: { ...state.internalGains, lighting: newLightingGains } });
    };

    const handleLightingTimeChange = (start: number, end: number) => {
        dispatch({ 
            type: 'SET_INTERNAL_GAINS', 
            payload: { 
                ...state.internalGains, 
                lighting: { ...state.internalGains.lighting, startHour: start, endHour: end } 
            } 
        });
   }

    const handleEquipmentChange = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedEquipment = state.internalGains.equipment.map(item => {
            if (item.id !== id) return item;

            if (name === 'name') {
                return { ...item, name: value };
            }
            
            if (value === '') {
                return { ...item, [name]: '' };
            }
            
            const num = parseInt(value, 10);
            if (!isNaN(num) && num >= 0) {
                return { ...item, [name]: Math.floor(num) };
            }
            return item;
        });
        dispatch({ type: 'SET_INTERNAL_GAINS', payload: { ...state.internalGains, equipment: updatedEquipment } });
    };
    
    const handleEquipmentTimeChange = (id: number, start: number, end: number) => {
        const updatedEquipment = state.internalGains.equipment.map(item => 
            item.id === id ? { ...item, startHour: start, endHour: end } : item
        );
        dispatch({ type: 'SET_INTERNAL_GAINS', payload: { ...state.internalGains, equipment: updatedEquipment } });
    }

    const addEquipment = (presetKey?: string) => {
        const preset = presetKey ? EQUIPMENT_PRESETS[presetKey] : null;
        dispatch({ type: 'ADD_EQUIPMENT_ITEM', payload: preset ? { name: preset.label, power: preset.power } : undefined });
    };
    
    const removeEquipment = (id: number) => {
        dispatch({ type: 'DELETE_EQUIPMENT_ITEM', payload: id });
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* People */}
            <Card>
                <h3 className="font-semibold mb-3">Ludzie</h3>
                <div className="space-y-4">
                    <Checkbox id="people_enabled" label="Uwzględnij zyski od ludzi" name="enabled" checked={state.internalGains.people.enabled} onChange={handlePeopleChange} />
                    {state.internalGains.people.enabled && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                            <div>
                                <label className="label-style">Liczba osób:</label>
                                <Input type="number" name="count" value={state.internalGains.people.count} onChange={handlePeopleChange} min="0" />
                            </div>
                            <div>
                                <label className="label-style flex items-center">
                                    Poziom aktywności:
                                    <Tooltip text="Zyski ciepła od ludzi są korygowane w zależności od temperatury wewnętrznej. Dla temp. >= 27°C, zysk jawny jest zmniejszany o 20%, a utajony odpowiednio zwiększany." />
                                </label>
                                <Select name="activityLevel" value={state.internalGains.people.activityLevel} onChange={handlePeopleChange}>
                                    {Object.entries(PEOPLE_ACTIVITY_LEVELS).map(([key, value]) => (
                                        <option key={key} value={key}>{value.label}</option>
                                    ))}
                                </Select>
                            </div>
                            <div className="mt-2">
                                <TimeRangeSlider 
                                    startHour={state.internalGains.people.startHour} 
                                    endHour={state.internalGains.people.endHour} 
                                    onChange={handlePeopleTimeChange} 
                                    label="Harmonogram obecności:"
                                    colorClass="bg-orange-500"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Lighting */}
            <Card>
                 <h3 className="font-semibold mb-3">Oświetlenie</h3>
                 <div className="space-y-4">
                    <Checkbox id="lighting_enabled" label="Uwzględnij zyski od oświetlenia" name="enabled" checked={state.internalGains.lighting.enabled} onChange={handleLightingChange} />
                    {state.internalGains.lighting.enabled && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                            <div>
                                <label className="label-style">Rodzaj oświetlenia:</label>
                                <Select name="type" value={state.internalGains.lighting.type} onChange={handleLightingChange}>
                                   {Object.entries(LIGHTING_TYPES).map(([key, value]) => (
                                        <option key={key} value={key}>{value.label}</option>
                                    ))}
                                </Select>
                            </div>
                             <div>
                                <label className="label-style">Gęstość mocy (W/m²):</label>
                                <Input type="number" name="powerDensity" value={state.internalGains.lighting.powerDensity} onChange={handleLightingChange} step="1" min="0" />
                            </div>
                            <div className="mt-2">
                                <TimeRangeSlider 
                                    startHour={state.internalGains.lighting.startHour} 
                                    endHour={state.internalGains.lighting.endHour} 
                                    onChange={handleLightingTimeChange} 
                                    label="Harmonogram oświetlenia:"
                                    colorClass="bg-yellow-500"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </Card>
            
            {/* Equipment */}
            <Card className="flex flex-col lg:col-span-2">
                <h3 className="font-semibold mb-3">Urządzenia</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 lg:flex lg:flex-wrap">
                    {Object.entries(EQUIPMENT_PRESETS).map(([key, preset]) => (
                        <Button key={key} variant="secondary" className="text-xs py-1" onClick={() => addEquipment(key)}>+ {preset.label}</Button>
                    ))}
                    <Button className="text-xs py-1" onClick={() => addEquipment()}><PlusIcon className="w-4 h-4 inline-block mr-1" />Dodaj własne</Button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2 max-h-72">
                    {state.internalGains.equipment.length === 0 && (
                        <p className="text-sm text-slate-500 text-center py-4">Brak dodanych urządzeń.</p>
                    )}
                    {state.internalGains.equipment.map(item => (
                        <div key={item.id} className="flex flex-col xl:flex-row gap-2 items-start xl:items-center bg-slate-50 dark:bg-slate-700/50 p-2 rounded border border-slate-200 dark:border-slate-700 transition-colors hover:bg-slate-100 dark:hover:bg-slate-700">
                            
                            {/* Name Input */}
                            <div className="w-full xl:flex-1">
                                 <label className="xl:hidden text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Nazwa</label>
                                 <Input name="name" value={item.name} onChange={(e) => handleEquipmentChange(item.id, e)} className="text-sm !py-1 !px-2 !h-8" placeholder="Nazwa" />
                            </div>

                            {/* Power and Quantity */}
                            <div className="grid grid-cols-2 gap-2 w-full xl:w-auto xl:flex xl:items-center">
                                <div className="xl:w-24">
                                     <label className="xl:hidden text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Moc [W]</label>
                                     <div className="relative">
                                        <Input name="power" type="number" value={item.power} onChange={(e) => handleEquipmentChange(item.id, e)} className="text-sm pr-6 !py-1 !px-2 !h-8" min="0" placeholder="Moc" />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">W</span>
                                     </div>
                                </div>
                                <div className="xl:w-20">
                                     <label className="xl:hidden text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Ilość</label>
                                     <div className="relative">
                                        <Input name="quantity" type="number" value={item.quantity} onChange={(e) => handleEquipmentChange(item.id, e)} className="text-sm pr-8 !py-1 !px-2 !h-8" min="0" placeholder="Ilość" />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">szt.</span>
                                     </div>
                                </div>
                            </div>

                            {/* Hours Dropdowns */}
                            <div className="grid grid-cols-2 gap-2 w-full xl:w-auto xl:flex xl:items-center xl:gap-1">
                                 <div className="xl:w-24">
                                    <label className="xl:hidden text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Start</label>
                                    <Select 
                                        value={item.startHour} 
                                        onChange={(e) => handleEquipmentTimeChange(item.id, parseInt(e.target.value), item.endHour)}
                                        className="text-sm !py-1 !px-2 !h-8"
                                    >
                                        {hours.map(h => <option key={`start-${h}`} value={h}>{h}:00</option>)}
                                    </Select>
                                </div>
                                <span className="hidden xl:block text-slate-400 font-bold">-</span>
                                <div className="xl:w-24">
                                    <label className="xl:hidden text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Stop</label>
                                    <Select 
                                        value={item.endHour} 
                                        onChange={(e) => handleEquipmentTimeChange(item.id, item.startHour, parseInt(e.target.value))}
                                        className="text-sm !py-1 !px-2 !h-8"
                                    >
                                         {hours.map(h => <option key={`end-${h}`} value={h}>{h}:00</option>)}
                                    </Select>
                                </div>
                            </div>

                            {/* Delete Button */}
                            <div className="w-full xl:w-auto flex justify-end">
                                <Button variant="danger" onClick={() => removeEquipment(item.id)} className="!p-0 w-8 h-8 flex items-center justify-center rounded"><TrashIcon className="w-4 h-4"/></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <style>{`.label-style { display: block; text-sm font-medium mb-1 text-slate-700 dark:text-slate-300; }`}</style>
        </div>
    );
};

export default InternalGainsPanel;
