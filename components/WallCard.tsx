import React, { useState, useEffect } from 'react';
import { Wall } from '../types';
import { useCalculator } from '../contexts/CalculatorContext';
import { WINDOW_DIRECTIONS, WINDOW_AZIMUTHS, CompassArrow, WALL_MATERIALS } from '../constants';
import Button from './ui/Button';
import { PencilIcon, DocumentDuplicateIcon, TrashIcon } from './Icons';
import { CTS_PRESETS, isRoofPreset } from '../data/ctsPresets';

interface WallCardProps {
  wall: Wall;
}

const WallCard: React.FC<WallCardProps> = ({ wall }) => {
  const { dispatch, state } = useCalculator();
  const activeRoom = state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0];
  const walls = activeRoom.walls || [];
  const [isNew, setIsNew] = useState(false);

  const preset = CTS_PRESETS[wall.type];
  const isRoof = isRoofPreset(wall.type);
  const sameTypeWalls = walls.filter(w => isRoofPreset(w.type) === isRoof);
  const index = sameTypeWalls.findIndex(w => w.id === wall.id) + 1;
  const title = isRoof ? `Dach / stropodach ${index}` : `Ściana ${index}`;

  useEffect(() => {
    if(walls.length > 0 && wall.id === Math.max(...walls.map(w => w.id))) {
      setIsNew(true);
      const timer = setTimeout(() => setIsNew(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [wall.id, walls]);

  const dirLabel = WINDOW_DIRECTIONS.find(d => d.value === wall.direction)?.label || wall.direction;
  
  const handleEdit = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'editWall', data: wall.id } });
  const handleDuplicate = () => dispatch({ type: 'DUPLICATE_WALL', payload: wall.id });
  const handleDelete = () => dispatch({ type: 'DELETE_WALL', payload: wall.id });
  
  const rotation = WINDOW_AZIMUTHS[wall.direction] || 0;
  
  const isEditing = state.modal.isOpen && state.modal.type === 'editWall' && state.modal.data === wall.id;

  const materialData = WALL_MATERIALS[wall.material || 'brick_red'];
  const tilt = wall.tilt ?? preset.defaultTilt;

  return (
    <div className={`relative bg-slate-100 dark:bg-slate-700 p-4 rounded-lg shadow-sm flex flex-col min-h-48 transition-all duration-300 ${isNew ? 'ring-2 ring-green-400 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800' : ''} ${isEditing ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-100 dark:ring-offset-slate-800' : ''}`}>
       {tilt > 0 && <CompassArrow rotation={rotation} />}
      <h3 className="font-bold text-lg mb-1 text-slate-800 dark:text-white">{title}</h3>
      <div className="flex-grow text-sm space-y-1 text-slate-600 dark:text-slate-300">
        <p>Typ: <strong className="text-slate-800 dark:text-slate-100">{preset.label}</strong></p>
        <p>Wykończenie: <strong className="text-slate-800 dark:text-slate-100">{materialData?.label || 'Nieznane'} (α={materialData?.absorptance || 0.65})</strong></p>
        {tilt > 0 ? (
          <p>{isRoof ? 'Połać' : 'Kierunek'}: <strong className="text-slate-800 dark:text-slate-100">{dirLabel.split(' (')[0]}{isRoof ? ` · ${tilt}°` : ''}</strong></p>
        ) : (
          <p>Położenie: <strong className="text-slate-800 dark:text-slate-100">poziome · 0°</strong></p>
        )}
        <p>Wsp. U: <strong className="text-slate-800 dark:text-slate-100">{wall.u} W/(m²·K)</strong></p>
        <p>{isRoof ? 'Powierzchnia połaci' : 'Powierzchnia netto'}: <strong className="text-slate-800 dark:text-slate-100">{wall.area} m²</strong></p>
      </div>
      <div className="grid grid-cols-3 gap-2 mt-auto">
        <Button onClick={handleEdit} className="py-1 px-2 text-xs"><PencilIcon className="w-4 h-4 inline-block mr-1"/>Edytuj</Button>
        <Button onClick={handleDuplicate} variant="secondary" className="py-1 px-2 text-xs"><DocumentDuplicateIcon className="w-4 h-4 inline-block mr-1"/>Duplikuj</Button>
        <Button onClick={handleDelete} variant="danger" className="py-1 px-2 text-xs"><TrashIcon className="w-4 h-4 inline-block mr-1"/>Usuń</Button>
      </div>
    </div>
  );
};

export default WallCard;
