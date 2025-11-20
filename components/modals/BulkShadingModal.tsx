import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Checkbox from '../ui/Checkbox';
import { useCalculator } from '../../contexts/CalculatorContext';
import { Shading } from '../../types';
import { LOUVERS_COLOR_DESCRIPTIONS, SHADING_TYPE_LABELS, LOUVERS_LOCATION_LABELS, LOUVERS_COLOR_LABELS, LOUVERS_SETTING_LABELS, DRAPERY_MATERIAL_LABELS, DRAPERY_MATERIAL_DESCRIPTIONS, ROLLER_SHADE_SETTING_LABELS, SHADING_LOCATION_LABELS } from '../../constants';

const BulkShadingModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const { isOpen, type } = state.modal;
    const isModalOpen = isOpen && type === 'bulkShading';

    const [shading, setShading] = useState<Partial<Shading> & { enabled: boolean }>({
        enabled: true,
        type: 'louvers',
        location: 'indoor',
        color: 'light',
        setting: 'tilted_45',
        material: 'open',
    });
    
    const shadingDb = state.allData?.shading.standard || {};

    const handleClose = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });

    const handleApply = () => {
        dispatch({ type: 'UPDATE_ALL_SHADING', payload: shading });
        handleClose();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;
        const isCheckbox = type === 'checkbox';

        setShading(prev => {
            let newShading: any = { ...prev, [name]: isCheckbox ? checked : value };
            
            if (name === 'type') {
                 // Reset to defaults
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

            return newShading;
        });
    };

    return (
        <Modal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
            title="Ustaw Osłony dla Wszystkich Okien"
            maxWidth="max-w-md"
            footer={<>
                <Button variant="secondary" onClick={handleClose}>Anuluj</Button>
                <Button onClick={handleApply}>Zastosuj do wszystkich</Button>
            </>}
        >
            <div className="space-y-4">
                <Checkbox id="bulk_shading_enabled" label="Włącz osłony" name="enabled" checked={shading.enabled} onChange={handleChange} />
                
                {shading.enabled && (
                    <div className="pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-4 mt-4">
                        <div>
                            <label className="label-style">Typ osłony:</label>
                            <Select name="type" value={shading.type} onChange={handleChange}>
                                {Object.entries(SHADING_TYPE_LABELS).map(([key, label]) => 
                                    shadingDb[key] && <option key={key} value={key}>{label as string}</option>
                                )}
                            </Select>
                        </div>

                        {shading.type === 'louvers' && shadingDb.louvers &&
                         <>
                             <div>
                                <label className="label-style">Lokalizacja:</label>
                                <Select name="location" value={shading.location} onChange={handleChange}>
                                    {Object.entries(LOUVERS_LOCATION_LABELS).map(([key, label]) => 
                                      shadingDb.louvers[key] && <option key={key} value={key}>{label as string}</option>
                                    )}
                                </Select>
                             </div>
                             <div>
                                <label className="label-style">Kolor / Typ lameli:</label>
                                <Select name="color" value={shading.color} onChange={handleChange}>
                                    {Object.entries(LOUVERS_COLOR_LABELS).map(([key, label]) => 
                                       shadingDb.louvers[shading.location!]?.[key] && <option key={key} value={key}>{label as string}</option>
                                    )}
                                </Select>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{LOUVERS_COLOR_DESCRIPTIONS[shading.color!]}</p>
                             </div>
                             <div>
                                <label className="label-style">Ustawienie lameli:</label>
                                <Select name="setting" value={shading.setting} onChange={handleChange}>
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
                                    <Select name="material" value={shading.material} onChange={handleChange}>
                                        {Object.entries(DRAPERY_MATERIAL_LABELS).map(([key, label]) => <option key={key} value={key}>{label as string}</option>)}
                                    </Select>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{DRAPERY_MATERIAL_DESCRIPTIONS[shading.material!]}</p>
                                </div>
                                {shading.material !== 'sheer' && <div>
                                    <label className="label-style">Kolor zasłon:</label>
                                    <Select name="color" value={shading.color} onChange={handleChange}>
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
                                <Select name="setting" value={shading.setting} onChange={handleChange}>
                                     {Object.entries(ROLLER_SHADE_SETTING_LABELS).map(([key, label]) => 
                                       shadingDb.roller_shades[key] && <option key={key} value={key}>{label as string}</option>
                                    )}
                                </Select>
                            </div>
                        }

                        {shading.type === 'insect_screens' && shadingDb.insect_screens &&
                             <div>
                                <label className="label-style">Umiejscowienie:</label>
                                <Select name="location" value={shading.location} onChange={handleChange}>
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

export default BulkShadingModal;