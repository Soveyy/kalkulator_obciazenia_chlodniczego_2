import React, { useState, useEffect } from 'react';
import { Window, Shading } from '../types';
import { useCalculator } from '../contexts/CalculatorContext';
import { 
    WINDOW_DIRECTIONS, 
    WINDOW_AZIMUTHS, 
    CompassArrow, 
    SHADING_TYPE_LABELS, 
    LOUVERS_SETTING_LABELS,
    DRAPERY_MATERIAL_LABELS,
    ROLLER_SHADE_SETTING_LABELS
} from '../constants';
import Button from './ui/Button';
import { PencilIcon, DocumentDuplicateIcon, TrashIcon } from './Icons';

// Helper component for displaying shading status
const ShadingStatus = ({ shading }: { shading: Shading }) => {
    if (!shading.enabled) {
        return (
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                <span className="font-medium">Osłona:</span> Wyłączona
            </div>
        );
    }

    const { type, location, color, setting, material } = shading;
    
    const typeLabel = SHADING_TYPE_LABELS[type as keyof typeof SHADING_TYPE_LABELS] || type;
    
    let settingLabel = setting;
    const colorLabelMap: { [key: string]: string } = { light: 'jasny', medium: 'średni', dark: 'ciemny' };
    const colorLabel = colorLabelMap[color] || color;

    if (type === 'louvers') {
        settingLabel = LOUVERS_SETTING_LABELS[setting as keyof typeof LOUVERS_SETTING_LABELS] || setting;
    } else if (type === 'draperies') {
        if (material === 'sheer') {
            settingLabel = DRAPERY_MATERIAL_LABELS.sheer;
        } else {
            const materialLabel = DRAPERY_MATERIAL_LABELS[material as keyof typeof DRAPERY_MATERIAL_LABELS] || material;
            settingLabel = `${materialLabel}, ${colorLabel}`;
        }
    } else if (type === 'roller_shades') {
        settingLabel = ROLLER_SHADE_SETTING_LABELS[setting as keyof typeof ROLLER_SHADE_SETTING_LABELS] || setting;
    } else if (type === 'insect_screens') {
        settingLabel = ''; // Location is enough
    }

    let effectiveColor = color;
    if (type === 'roller_shades') {
        if (setting.includes('dark')) effectiveColor = 'dark';
        else if (setting.includes('gray')) effectiveColor = 'medium';
        else effectiveColor = 'light';
    }

    const colorMap = {
        light: { bg: 'bg-slate-200', border: 'border-slate-400' },
        medium: { bg: 'bg-slate-400', border: 'border-slate-600' },
        dark: { bg: 'bg-slate-600', border: 'border-slate-800' },
    };
    
    const swatchClasses = colorMap[effectiveColor as keyof typeof colorMap] || colorMap.light;

    return (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                    <span className="font-medium">Osłona:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{typeLabel}</span>
                </div>
                <span className="font-mono px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300 text-[10px]">
                    {location === 'indoor' ? 'WEW' : 'ZEW'}
                </span>
            </div>
            <div className="flex items-center gap-2">
                 {(type !== 'insect_screens') && (
                    <span className={`inline-block w-3 h-3 rounded-sm border ${swatchClasses.bg} ${swatchClasses.border}`}></span>
                 )}
                 <span className="truncate">{settingLabel}</span>
            </div>
        </div>
    );
};


interface WindowCardProps {
  window: Window;
}

const WindowCard: React.FC<WindowCardProps> = ({ window }) => {
  const { dispatch, state } = useCalculator();
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    if(state.windows.length > 0 && window.id === Math.max(...state.windows.map(w => w.id))) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [window.id, state.windows]);

  const area = (window.width * window.height).toFixed(2);
  const dirLabel = WINDOW_DIRECTIONS.find(d => d.value === window.direction)?.label || window.direction;

  const handleEdit = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'editWindow', data: window.id } });
  const handleDuplicate = () => dispatch({ type: 'DUPLICATE_WINDOW', payload: window.id });
  const handleDelete = () => dispatch({ type: 'DELETE_WINDOW', payload: window.id });
  
  const rotation = WINDOW_AZIMUTHS[window.direction] || 0;
  
  const isEditing = state.modal.isOpen && state.modal.type === 'editWindow' && state.modal.data === window.id;

  return (
    <div className={`relative bg-slate-100 dark:bg-slate-700 p-4 rounded-lg shadow-sm flex flex-col min-h-48 transition-all duration-300 ${isNew ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800' : ''} ${isEditing ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800' : ''}`}>
       <CompassArrow rotation={rotation} />
      <h3 className="font-bold text-lg mb-1 text-slate-800 dark:text-white">Okno {window.id}</h3>
      <div className="flex-grow text-sm space-y-1 text-slate-600 dark:text-slate-300">
        <p>Kierunek: <strong className="text-slate-800 dark:text-slate-100">{dirLabel.split(' (')[0]}</strong></p>
        <p>Powierzchnia: <strong className="text-slate-800 dark:text-slate-100">{area} m²</strong></p>
        <ShadingStatus shading={window.shading} />
      </div>
      <div className="grid grid-cols-3 gap-2 mt-auto">
        <Button onClick={handleEdit} className="py-1 px-2 text-xs"><PencilIcon className="w-4 h-4 inline-block mr-1"/>Edytuj</Button>
        <Button onClick={handleDuplicate} variant="secondary" className="py-1 px-2 text-xs"><DocumentDuplicateIcon className="w-4 h-4 inline-block mr-1"/>Duplikuj</Button>
        <Button onClick={handleDelete} variant="danger" className="py-1 px-2 text-xs"><TrashIcon className="w-4 h-4 inline-block mr-1"/>Usuń</Button>
      </div>
    </div>
  );
};

export default WindowCard;