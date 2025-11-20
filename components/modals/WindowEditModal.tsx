
import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import { useCalculator } from '../../contexts/CalculatorContext';
import { Window, Shading, Overhang } from '../../types';
import { WINDOW_DIRECTIONS, WINDOW_PRESETS, WINDOW_TYPE_DESCRIPTIONS, SHADING_TYPE_LABELS, SHADING_LOCATION_LABELS, LOUVERS_LOCATION_LABELS, LOUVERS_COLOR_LABELS, LOUVERS_COLOR_DESCRIPTIONS, LOUVERS_SETTING_LABELS, DRAPERY_MATERIAL_LABELS, DRAPERY_MATERIAL_DESCRIPTIONS, ROLLER_SHADE_SETTING_LABELS } from '../../constants';
import Tooltip from '../ui/Tooltip';

const WindowEditModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const { isOpen, type, data: windowId } = state.modal;
    const isModalOpen = isOpen && type === 'editWindow';
    const isNew = windowId === null;

    const [window, setWindow] = useState<Window | null>(null);
    const [shading, setShading] = useState<Shading | null>(null);
    const [overhang, setOverhang] = useState<Overhang>({ enabled: false, depth: 1.0, distanceAbove: 0.2 });

    useEffect(() => {
        if (isModalOpen) {
            if (isNew) {
                const defaultWindow: Window = {
                    id: 0, // temp ID
                    type: 'modern', direction: 'S', u: 0.9, shgc: 0.5, width: 1.0, height: 2.2,
                    shading: { enabled: false, type: 'louvers', location: 'indoor', color: 'light', setting: 'tilted_45', material: 'open' },
                    overhang: { enabled: false, depth: 1.0, distanceAbove: 0.2 }
                };
                setWindow(defaultWindow);
                setShading(defaultWindow.shading);
                setOverhang(defaultWindow.overhang || { enabled: false, depth: 1.0, distanceAbove: 0.2 });
                dispatch({ type: 'SET_SELECTED_DIRECTION', payload: defaultWindow.direction });
            } else {
                const originalWindow = state.windows.find(w => w.id === windowId);
                if (originalWindow) {
                    const windowCopy = JSON.parse(JSON.stringify(originalWindow));
                    setWindow(windowCopy);
                    setShading(windowCopy.shading);
                    setOverhang(windowCopy.overhang || { enabled: false, depth: 1.0, distanceAbove: 0.2 });
                    dispatch({ type: 'SET_SELECTED_DIRECTION', payload: windowCopy.direction });
                }
            }
        } else {
            setWindow(null);
            setShading(null);
        }
    }, [isModalOpen, windowId, state.windows, isNew]);

    // Fix: Only update local state from global 'selectedDirection' if it changes externally (e.g. compass click),
    // but we manually update global state on local change, so this useEffect might loop if not careful.
    // The "double highlight" is often caused by state bouncing.
    // We will only sync from state -> window if they differ, effectively making the Compass the source of truth when clicked.
    useEffect(() => {
        if (window && state.selectedDirection && state.selectedDirection !== window.direction) {
            setWindow(prev => prev ? { ...prev, direction: state.selectedDirection! } : null);
        }
    }, [state.selectedDirection]);


    const handleClose = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });

    const handleSave = () => {
        if (window && shading) {
            const finalWindow = { ...window, shading, overhang };
            if (isNew) {
                const { id, ...windowData } = finalWindow;
                dispatch({ type: 'ADD_WINDOW', payload: windowData as Omit<Window, 'id'> });
            } else {
                dispatch({ type: 'UPDATE_WINDOW', payload: finalWindow });
            }
            handleClose();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        
        let val: any = value;
        if (type === 'number' || name === 'u' || name === 'shgc' || name === 'width' || name === 'height' ) val = parseFloat(value);

        if (name === 'direction') {
            // Update global state to reflect selection on compass immediately
            // This might trigger the useEffect above, but since values will match, it shouldn't cause a loop or flicker
            dispatch({ type: 'SET_SELECTED_DIRECTION', payload: value });
        }

        if (name === 'type' && value !== 'custom') {
            const preset = WINDOW_PRESETS[value as keyof typeof WINDOW_PRESETS];
            if (preset) {
                setWindow(prev => prev ? { ...prev, type: value as Window['type'], u: preset.u, shgc: preset.shgc } : null);
                return;
            }
        }
        
        if ((name === 'u' || name === 'shgc') && window?.type !== 'custom') {
             setWindow(prev => prev ? { ...prev, type: 'custom', [name]: val } : null);
        } else {
            setWindow(prev => prev ? { ...prev, [name]: val } : null);
        }
    };

    const handleShadingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        const isCheckbox = type === 'checkbox';
    
        setShading(prev => {
            if (!prev) return null;
            let newShading = { ...prev, [name]: isCheckbox ? checked : value };
            
            if (name === 'type') {
                newShading.location = 'indoor';
                newShading.color = 'light';
                newShading.material = 'open';
    
                switch(value) {
                    case 'louvers':
                        newShading.setting = 'tilted_45';
                        break;
                    case 'roller_shades':
                        newShading.setting = 'light_translucent';
                        break;
                    case 'draperies':
                    case 'insect_screens':
                        newShading.setting = ''; 
                        break;
                }
            }
            
            return newShading as Shading;
        });
    };

    const handleOverhangChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setOverhang(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : parseFloat(value)
        }));
    };

    if (!isModalOpen || !window || !shading) return null;
    
    const shadingDb = state.allData?.shading[window.type as keyof typeof state.allData.shading] || state.allData?.shading.standard || {};
    const description = WINDOW_TYPE_DESCRIPTIONS[window.type as keyof typeof WINDOW_TYPE_DESCRIPTIONS];
    const modalTitle = isNew ? "Dodaj Nowe Okno" : `Edytuj Okno ${window.id}`;

    return (
        <Modal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
            title={modalTitle}
            maxWidth="max-w-2xl"
            disableBackdropClick={true}
            disableEscKey={true}
            footer={<>
                <Button variant="secondary" onClick={handleClose}>Anuluj</Button>
                <Button onClick={handleSave}>{isNew ? 'Dodaj Okno' : 'Zapisz zmiany'}</Button>
            </>}
        >
            <div className="space-y-4">
                <div>
                    <label className="label-style flex items-center">
                        Typ okna:
                        <Tooltip text="Wybierz predefiniowany typ okna lub 'Niestandardowe', aby ręcznie wprowadzić wartości." />
                    </label>
                    <Select name="type" value={window.type} onChange={handleChange}>
                        <option value="custom">Niestandardowe</option>
                        <option value="modern">Nowoczesne (3-szybowe)</option>
                        <option value="standard">Standardowe (nowe, 2-szybowe)</option>
                        <option value="older_double">Starsze (2-szybowe)</option>
                        <option value="historic">Historyczne (1-szybowe)</option>
                    </Select>
                     {description && window.type !== 'custom' && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md">{description}</p>
                    )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="label-style flex items-center">
                            Współczynnik U:
                            <Tooltip text="Współczynnik przenikania ciepła (W/m²K). Niższa wartość oznacza lepszą izolacyjność." />
                        </label>
                        <Input type="number" name="u" value={window.u} onChange={handleChange} step="0.1" />
                    </div>
                    <div>
                        <label className="label-style flex items-center">
                            Współczynnik SHGC:
                             <Tooltip text="Współczynnik całkowitego zysku energii słonecznej (g). Niższa wartość oznacza mniejsze zyski od słońca." />
                        </label>
                        <Input type="number" name="shgc" value={window.shgc} onChange={handleChange} step="0.01" />
                    </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="label-style">Szerokość (m):</label>
                        <Input type="number" name="width" value={window.width} onChange={handleChange} step="0.1" />
                    </div>
                    <div>
                        <label className="label-style">Wysokość (m):</label>
                        <Input type="number" name="height" value={window.height} onChange={handleChange} step="0.1" />
                    </div>
                </div>
                 <div>
                    <label className="label-style">Kierunek świata:</label>
                    <select 
                        name="direction" 
                        value={window.direction} 
                        onChange={handleChange}
                        onMouseLeave={() => dispatch({ type: 'SET_HOVERED_DIRECTION', payload: null })}
                        className="w-full box-border px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
                    >
                        {WINDOW_DIRECTIONS.map(dir => (
                            <option 
                                key={dir.value} 
                                value={dir.value}
                                onMouseEnter={() => dispatch({ type: 'SET_HOVERED_DIRECTION', payload: dir.value })}
                            >
                                {dir.label}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 italic">
                        Wskazówka: Możesz również wybrać kierunek klikając na kompas po prawej stronie.
                    </p>
                </div>

                <hr className="my-4 border-slate-200 dark:border-slate-700"/>
                
                <div className="space-y-4">
                    <div className="flex items-center">
                         <Checkbox 
                            id={`overhang_enabled_${window.id}`} 
                            label="Uwzględnij daszek / balkon powyżej" 
                            name="enabled" 
                            checked={overhang.enabled} 
                            onChange={handleOverhangChange} 
                        />
                         <Tooltip text="Stały element architektoniczny (np. balkon, okap dachu) rzucający cień na okno." />
                    </div>

                    {overhang.enabled && (
                        <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 grid grid-cols-2 gap-4">
                             <div>
                                <label className="label-style flex items-center">
                                    Głębokość daszku [m]:
                                    <Tooltip text="Wysięg daszku lub balkonu od lica ściany." />
                                </label>
                                <Input type="number" name="depth" value={overhang.depth} onChange={handleOverhangChange} step="0.1" min="0" />
                            </div>
                            <div>
                                <label className="label-style flex items-center">
                                    Odległość nad oknem [m]:
                                    <Tooltip text="Pionowa odległość od górnej krawędzi okna do spodu daszku." />
                                </label>
                                <Input type="number" name="distanceAbove" value={overhang.distanceAbove} onChange={handleOverhangChange} step="0.1" min="0" />
                            </div>
                        </div>
                    )}
                </div>

                <hr className="my-4 border-slate-200 dark:border-slate-700"/>

                 <Checkbox id={`shading_enabled_${window.id}`} label="Uwzględnij osłonę przeciwsłoneczną (rolety/żaluzje)" name="enabled" checked={shading.enabled} onChange={handleShadingChange} />
            
                {shading.enabled && (
                    <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                        <div>
                            <label className="label-style">Typ osłony:</label>
                            <Select name="type" value={shading.type} onChange={handleShadingChange}>
                                {Object.entries(SHADING_TYPE_LABELS).map(([key, label]) => 
                                    shadingDb[key] && <option key={key} value={key}>{label as string}</option>
                                )}
                            </Select>
                        </div>

                        {shading.type === 'louvers' && shadingDb.louvers &&
                         <>
                             <div>
                                <label className="label-style">Lokalizacja:</label>
                                <Select name="location" value={shading.location} onChange={handleShadingChange}>
                                    {Object.entries(LOUVERS_LOCATION_LABELS).map(([key, label]) => 
                                      shadingDb.louvers[key] && <option key={key} value={key}>{label as string}</option>
                                    )}
                                </Select>
                             </div>
                             <div>
                                <label className="label-style">Kolor / Typ lameli:</label>
                                <Select name="color" value={shading.color} onChange={handleShadingChange}>
                                    {Object.entries(LOUVERS_COLOR_LABELS).map(([key, label]) => 
                                       shadingDb.louvers[shading.location!]?.[key] && <option key={key} value={key}>{label as string}</option>
                                    )}
                                </Select>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{LOUVERS_COLOR_DESCRIPTIONS[shading.color!]}</p>
                             </div>
                             <div>
                                <label className="label-style">Ustawienie lameli:</label>
                                <Select name="setting" value={shading.setting} onChange={handleShadingChange}>
                                    {Object.entries(LOUVERS_SETTING_LABELS).map(([key, label]) => 
                                        shadingDb.louvers[shading.location!]?.[shading.color!]?.[key] && <option key={key} value={key}>{label as string}</option>
                                    )}
                                </Select>
                             </div>
                         </>
                        }
                        
                         {shading.type === 'draperies' && shadingDb.draperies &&
                            <>
                                <div>
                                    <label className="label-style">Typ materiału:</label>
                                    <Select name="material" value={shading.material} onChange={handleShadingChange}>
                                        {Object.entries(DRAPERY_MATERIAL_LABELS).map(([key, label]) => <option key={key} value={key}>{label as string}</option>)}
                                    </Select>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{DRAPERY_MATERIAL_DESCRIPTIONS[shading.material!]}</p>
                                </div>
                                {shading.material !== 'sheer' && <div>
                                    <label className="label-style">Kolor zasłon:</label>
                                    <Select name="color" value={shading.color} onChange={handleShadingChange}>
                                        <option value="light">Jasny</option>
                                        <option value="medium">Średni</option>
                                        <option value="dark">Ciemny</option>
                                    </Select>
                                </div>}
                            </>
                        }

                        {shading.type === 'roller_shades' && shadingDb.roller_shades &&
                            <div>
                                <label className="label-style">Rodzaj rolety:</label>
                                <Select name="setting" value={shading.setting} onChange={handleShadingChange}>
                                     {Object.entries(ROLLER_SHADE_SETTING_LABELS).map(([key, label]) => 
                                       shadingDb.roller_shades[key] && <option key={key} value={key}>{label as string}</option>
                                    )}
                                </Select>
                            </div>
                        }

                        {shading.type === 'insect_screens' && shadingDb.insect_screens &&
                             <div>
                                <label className="label-style">Umiejscowienie:</label>
                                <Select name="location" value={shading.location} onChange={handleShadingChange}>
                                     {Object.entries(SHADING_LOCATION_LABELS).map(([key, label]) => 
                                        shadingDb.insect_screens[key] && <option key={key} value={key}>{label as string}</option>
                                     )}
                                </Select>
                             </div>
                        }
                    </div>
                )}
            </div>
            <style>{`.label-style { display: block; margin-bottom: 0.25rem; font-medium; color: #475569; } .dark .label-style { color: #cbd5e1; }`}</style>
        </Modal>
    );
};

export default WindowEditModal;
