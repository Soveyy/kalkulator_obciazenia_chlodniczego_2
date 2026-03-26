import React, { useState, useEffect } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import { useCalculator } from '../../contexts/CalculatorContext';
import { Wall } from '../../types';
import { WINDOW_DIRECTIONS, WALL_MATERIALS } from '../../constants';

const WallEditModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const activeRoom = state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0];
    const { isOpen, type, data: wallId } = state.modal;
    const isModalOpen = isOpen && type === 'editWall';
    const isNew = wallId === null;

    const [wall, setWall] = useState<any | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        if (isModalOpen) {
            if (isNew) {
                const defaultWall: any = {
                    id: 0,
                    type: 'sciana_ocieplona',
                    direction: '',
                    u: 0.2,
                    area: '',
                    material: 'brick_red'
                };
                setWall(defaultWall);
                dispatch({ type: 'SET_SELECTED_DIRECTION', payload: null });
                setErrors([]);
            } else {
                const originalWall = activeRoom.walls?.find(w => w.id === wallId);
                if (originalWall) {
                    const wallCopy = JSON.parse(JSON.stringify(originalWall));
                    if (!wallCopy.material) wallCopy.material = 'brick_red';
                    setWall(wallCopy);
                    dispatch({ type: 'SET_SELECTED_DIRECTION', payload: wallCopy.direction });
                }
            }
        } else {
            setWall(null);
        }
    }, [isModalOpen, wallId, activeRoom.walls, isNew]);

    useEffect(() => {
        if (wall && state.selectedDirection && state.selectedDirection !== wall.direction) {
            setWall((prev: any) => prev ? { ...prev, direction: state.selectedDirection! } : null);
        }
    }, [state.selectedDirection]);

    const handleClose = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });

    const handleSave = () => {
        if (wall) {
            const newErrors: string[] = [];
            
            if (!wall.area || wall.area === '' || wall.area <= 0) newErrors.push('area');
            if (wall.type !== 'stropodach_ocieplony' && !wall.direction) newErrors.push('direction');
            if (wall.u === '' || wall.u <= 0 || wall.u > 10) newErrors.push('u');

            if (newErrors.length > 0) {
                setErrors(newErrors);
                let message = 'Proszę poprawić błędy w formularzu.';
                if (newErrors.includes('area')) message = 'Powierzchnia musi być większa od 0.';
                if (newErrors.includes('u')) message = 'Współczynnik U musi być w zakresie 0 - 10.';
                if (newErrors.includes('direction')) message = 'Proszę wybrać kierunek świata.';
                
                dispatch({ type: 'ADD_TOAST', payload: { message, type: 'danger' } });
                return;
            }

            const wallToSave: Wall = {
                id: isNew ? Date.now() : wall.id,
                type: wall.type,
                direction: wall.type === 'stropodach_ocieplony' ? 'S' : wall.direction,
                u: Number(wall.u),
                area: Number(wall.area),
                material: wall.material || 'brick_red'
            };

            if (isNew) {
                dispatch({ type: 'ADD_WALL', payload: wallToSave });
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Ściana została dodana.', type: 'success' } });
            } else {
                dispatch({ type: 'UPDATE_WALL', payload: wallToSave });
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Ściana została zaktualizowana.', type: 'success' } });
            }
            handleClose();
        }
    };

    if (!isModalOpen || !wall) return null;

    const isRoof = wall.type === 'stropodach_ocieplony';

    return (
        <Modal isOpen={isModalOpen} onClose={handleClose} title={isNew ? 'Dodaj Ścianę' : 'Edytuj Ścianę'}>
            <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Typ przegrody
                        </label>
                        <Select
                            value={wall.type}
                            onChange={(e) => setWall({ ...wall, type: e.target.value })}
                        >
                            <option value="sciana_ocieplona">Ściana ocieplona</option>
                            <option value="sciana_nieocieplona">Ściana nieocieplona</option>
                            <option value="stropodach_ocieplony">Stropodach ocieplony</option>
                        </Select>
                    </div>

                    {!isRoof && (
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${errors.includes('direction') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                Kierunek świata
                            </label>
                            <Select
                                value={wall.direction}
                                onChange={(e) => {
                                    setWall({ ...wall, direction: e.target.value });
                                    dispatch({ type: 'SET_SELECTED_DIRECTION', payload: e.target.value });
                                }}
                            >
                                <option value="">Wybierz kierunek...</option>
                                {WINDOW_DIRECTIONS.map(dir => (
                                    <option key={dir.value} value={dir.value}>{dir.label}</option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${errors.includes('area') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            Powierzchnia (m²)
                        </label>
                        <Input
                            type="number"
                            value={wall.area}
                            onChange={(e) => setWall({ ...wall, area: e.target.value })}
                            min="0.1"
                            step="0.1"
                        />
                    </div>

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${errors.includes('u') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            Współczynnik U (W/m²K)
                        </label>
                        <Input
                            type="number"
                            value={wall.u}
                            onChange={(e) => setWall({ ...wall, u: e.target.value })}
                            min="0.05"
                            max="10"
                            step="0.01"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Wykończenie zewnętrzne (Absorpcja)
                        </label>
                        <Select
                            value={wall.material || 'brick_red'}
                            onChange={(e) => setWall({ ...wall, material: e.target.value })}
                        >
                            {Object.entries(WALL_MATERIALS).map(([key, data]) => (
                                <option key={key} value={key}>{data.label} (α = {data.absorptance})</option>
                            ))}
                        </Select>
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <Button variant="secondary" onClick={handleClose}>Anuluj</Button>
                    <Button onClick={handleSave}>Zapisz</Button>
                </div>
            </div>
        </Modal>
    );
};

export default WallEditModal;
