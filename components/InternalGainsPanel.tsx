
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import Checkbox from './ui/Checkbox';
import Input from './ui/Input';
import Select from './ui/Select';
import ActivitySelect from './ui/ActivitySelect';
import Button from './ui/Button';
import TimeRangeSlider from './ui/TimeRangeSlider';
import { PEOPLE_ACTIVITY_LEVELS, LIGHTING_TYPES, EQUIPMENT_PRESETS } from '../constants';
import { TrashIcon, PlusIcon } from './Icons';
import Tooltip from './ui/Tooltip';
import AdvancedAppliancesModal from './modals/AdvancedAppliancesModal';
import { ADVANCED_APPLIANCES } from '../data/advancedAppliances';
import { Users, Lightbulb, Monitor } from 'lucide-react';

const InternalGainsPanel: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const [isAdvancedModalOpen, setIsAdvancedModalOpen] = React.useState(false);

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
                    val = num;
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
            
            if (name === 'quantity') {
                const num = parseInt(value, 10);
                if (!isNaN(num) && num >= 0) {
                    return { ...item, [name]: Math.floor(num) };
                }
            } else if (name === 'power') {
                const num = parseFloat(value);
                if (!isNaN(num) && num >= 0) {
                    return { ...item, [name]: num };
                }
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

    const handleAdvancedApplianceChange = (id: string, field: string, value: any) => {
        const item = state.internalGains.advancedAppliances?.find(a => a.id === id);
        if (!item) return;
        dispatch({
            type: 'UPDATE_ADVANCED_APPLIANCE',
            payload: { ...item, [field]: value }
        });
    };

    const removeAdvancedAppliance = (id: string) => {
        dispatch({ type: 'DELETE_ADVANCED_APPLIANCE', payload: id });
    };
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* People */}
            <Card>
                <div className="flex items-center gap-3 mb-4 shrink-0 w-full">
                    <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-tight whitespace-normal overflow-hidden text-ellipsis">Ludzie</h3>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Zyski od użytkowników</p>
                    </div>
                </div>
                <div className="space-y-4">
                    <Checkbox id="people_enabled" label="Uwzględnij zyski ciepła od ludzi" name="enabled" checked={state.internalGains.people.enabled} onChange={handlePeopleChange} />
                    {state.internalGains.people.enabled && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                            <div>
                                <label className="label-style font-medium">Liczba osób:</label>
                                <Input 
                                    type="number" 
                                    name="count" 
                                    value={state.internalGains.people.count} 
                                    onChange={handlePeopleChange} 
                                    min="0" 
                                    step="1" 
                                    className={
                                        state.internalGains.people.count === '' ? 'animate-pulse-border border-blue-400' : 
                                        (state.internalGains.people.count < 0) ? 'animate-pulse-error' : ''
                                    }
                                />
                                {state.tutorialMode && (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 italic">
                                        Wskazówka: Dla biur przyjmuje się zazwyczaj 1 osobę na 10 m².
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="label-style flex items-center font-medium">
                                    Poziom aktywności:
                                    <Tooltip text="Zyski ciepła od ludzi są korygowane w zależności od temperatury wewnętrznej. Dla temp. >= 27°C, zysk jawny jest zmniejszany o 20%, a utajony odpowiednio zwiększany." position="top" />
                                </label>
                                <ActivitySelect 
                                    value={state.internalGains.people.activityLevel} 
                                    onChange={(val) => handlePeopleChange({ target: { name: 'activityLevel', value: val } } as any)} 
                                />
                                {state.tutorialMode && (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 italic">
                                        Wskazówka: Praca fizyczna generuje znacznie więcej ciepła niż biurowa.
                                    </p>
                                )}
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
                 <div className="flex items-center gap-3 mb-4 shrink-0 w-full">
                    <div className="w-10 h-10 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center shrink-0">
                        <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-tight whitespace-normal overflow-hidden text-ellipsis">Oświetlenie</h3>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Zyski od lamp opraw</p>
                    </div>
                </div>
                 <div className="space-y-4">
                    <Checkbox id="lighting_enabled" label="Uwzględnij zyski ciepła od oświetlenia" name="enabled" checked={state.internalGains.lighting.enabled} onChange={handleLightingChange} />
                    {state.internalGains.lighting.enabled && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                            <div>
                                <label className="label-style font-medium">Rodzaj oświetlenia:</label>
                                <Select name="type" value={state.internalGains.lighting.type} onChange={handleLightingChange}>
                                   {Object.entries(LIGHTING_TYPES).map(([key, value]) => (
                                        <option key={key} value={key}>{value.label}</option>
                                    ))}
                                </Select>
                            </div>
                             <div>
                                <label className="label-style font-medium">Gęstość mocy (W/m²):</label>
                                <Input 
                                    type="number" 
                                    name="powerDensity" 
                                    value={state.internalGains.lighting.powerDensity} 
                                    onChange={handleLightingChange} 
                                    step="any" 
                                    min="0" 
                                    className={
                                        state.internalGains.lighting.powerDensity === '' ? 'animate-pulse-border border-blue-400' : 
                                        (state.internalGains.lighting.powerDensity < 0) ? 'animate-pulse-error' : ''
                                    }
                                />
                                {state.tutorialMode && (
                                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1 italic">
                                        Wskazówka: Nowoczesne oświetlenie LED to zazwyczaj 5-10 W/m². Starsze świetlówki to 15-20 W/m².
                                    </p>
                                )}
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
                <div className="flex items-center gap-3 mb-4 shrink-0 w-full">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white leading-tight whitespace-normal overflow-hidden text-ellipsis">Urządzenia</h3>
                        <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-0.5">Zyski od sprzętu elektrycznego</p>
                    </div>
                </div>
                {state.tutorialMode && (
                    <p className="text-[10px] text-blue-600 dark:text-blue-400 mb-3 italic">
                        Wskazówka: Komputer biurowy z monitorem to średnio 100-150W. Drukarki pracują sporadycznie, więc ich uśredniona moc jest niższa.
                    </p>
                )}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 lg:flex lg:flex-wrap">
                    {Object.entries(EQUIPMENT_PRESETS).map(([key, preset]) => (
                        <Button key={key} variant="secondary" className="text-xs py-1" onClick={() => addEquipment(key)}>+ {preset.label}</Button>
                    ))}
                    <Button className="text-xs py-1" onClick={() => addEquipment()}><PlusIcon className="w-4 h-4 inline-block mr-1" />Dodaj własne</Button>
                    <Button className="text-xs py-1" variant="primary" onClick={() => setIsAdvancedModalOpen(true)}><PlusIcon className="w-4 h-4 inline-block mr-1" />Zaawansowane urządzenia</Button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-2 pr-2 -mr-2 max-h-72">
                    {state.internalGains.equipment.length === 0 && (!state.internalGains.advancedAppliances || state.internalGains.advancedAppliances.length === 0) && (
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
                                        <Input 
                                            name="power" 
                                            type="number" 
                                            value={item.power} 
                                            onChange={(e) => handleEquipmentChange(item.id, e)} 
                                            className={`text-sm pr-6 !py-1 !px-2 !h-8 ${
                                                item.power === '' ? 'animate-pulse-border border-blue-400' : 
                                                (item.power < 0) ? 'animate-pulse-error' : ''
                                            }`} 
                                            min="0" 
                                            step="any" 
                                            placeholder="Moc" 
                                        />
                                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">W</span>
                                     </div>
                                </div>
                                <div className="xl:w-20">
                                     <label className="xl:hidden text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Ilość</label>
                                     <div className="relative">
                                        <Input 
                                            name="quantity" 
                                            type="number" 
                                            value={item.quantity} 
                                            onChange={(e) => handleEquipmentChange(item.id, e)} 
                                            className={`text-sm pr-8 !py-1 !px-2 !h-8 ${
                                                item.quantity === '' ? 'animate-pulse-border border-blue-400' : 
                                                (item.quantity < 1) ? 'animate-pulse-error' : ''
                                            }`} 
                                            min="1" 
                                            step="1" 
                                            placeholder="Ilość" 
                                        />
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

                    {state.internalGains.advancedAppliances?.map(item => {
                        const catalogItem = ADVANCED_APPLIANCES.find(a => a.id === item.catalogId);
                        if (!catalogItem) return null;
                        return (
                            <div key={item.id} className="flex flex-col xl:flex-row gap-2 items-start xl:items-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded border border-blue-200 dark:border-blue-800 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/40">
                                
                                {/* Name Input */}
                                <div className="w-full xl:flex-1">
                                    <label className="xl:hidden text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Nazwa</label>
                                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 leading-tight">
                                        {catalogItem.name}
                                    </div>
                                    <div className="text-[10px] text-slate-500 truncate">
                                        ASHRAE • {catalogItem.category} • {catalogItem.fuel} 
                                        {catalogItem.ratedW && ` • Moc znam.: ${catalogItem.ratedW} W`}
                                    </div>
                                </div>

                                {/* Options and Quantity */}
                                <div className="grid grid-cols-2 gap-2 w-full xl:w-auto xl:flex xl:items-center">
                                    {catalogItem.qRadHoodedW !== undefined && (
                                        <div className="xl:w-24">
                                            <div className="flex items-center h-full pt-1">
                                                <Checkbox 
                                                    id={`hood-${item.id}`} 
                                                    label="Pod okapem" 
                                                    checked={!!item.isHoodedOverride} 
                                                    onChange={(e) => handleAdvancedApplianceChange(item.id, 'isHoodedOverride', (e.target as HTMLInputElement).checked)} 
                                                />
                                            </div>
                                        </div>
                                    )}
                                    <div className="xl:w-20">
                                        <label className="xl:hidden text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1 block">Ilość</label>
                                        <div className="relative">
                                            <Input 
                                                type="number" 
                                                value={item.quantity} 
                                                onChange={(e) => handleAdvancedApplianceChange(item.id, 'quantity', parseInt(e.target.value, 10))} 
                                                className={`text-sm pr-8 !py-1 !px-2 !h-8 ${
                                                    item.quantity === '' as any ? 'animate-pulse-border border-blue-400' : 
                                                    (item.quantity < 1) ? 'animate-pulse-error' : ''
                                                }`} 
                                                min="1" 
                                                step="1" 
                                            />
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
                                            onChange={(e) => handleAdvancedApplianceChange(item.id, 'startHour', parseInt(e.target.value))}
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
                                            onChange={(e) => handleAdvancedApplianceChange(item.id, 'endHour', parseInt(e.target.value))}
                                            className="text-sm !py-1 !px-2 !h-8"
                                        >
                                            {hours.map(h => <option key={`end-${h}`} value={h}>{h}:00</option>)}
                                        </Select>
                                    </div>
                                </div>

                                {/* Delete Button */}
                                <div className="w-full xl:w-auto flex justify-end">
                                    <Button variant="danger" onClick={() => removeAdvancedAppliance(item.id)} className="!p-0 w-8 h-8 flex items-center justify-center rounded"><TrashIcon className="w-4 h-4"/></Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </Card>
            
            {isAdvancedModalOpen && (
                <AdvancedAppliancesModal 
                    isOpen={isAdvancedModalOpen} 
                    onClose={() => setIsAdvancedModalOpen(false)} 
                />
            )}
        </div>
    );
};

export default InternalGainsPanel;
