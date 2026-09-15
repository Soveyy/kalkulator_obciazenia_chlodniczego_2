import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Tooltip from '../ui/Tooltip';
import { useCalculator } from '../../contexts/CalculatorContext';
import type { UnconditionedPartitionType, Wall } from '../../types';
import {
    UNCONDITIONED_PARTITION_IDS,
    UNCONDITIONED_PARTITION_PRESETS,
} from '../../data/unconditionedPresets';

interface EditablePartition {
    id: number;
    unconditionedType: UnconditionedPartitionType;
    area: number | '';
    u: number | '';
    adjacentTemperature: number | '';
}

const UnconditionedWallEditModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const activeRoom = state.rooms.find(room => room.id === state.activeRoomId) || state.rooms[0];
    const { isOpen, type, data: wallId } = state.modal;
    const isModalOpen = isOpen && type === 'editUnconditionedWall';
    const isNew = wallId === null;
    const [partition, setPartition] = useState<EditablePartition | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    useEffect(() => {
        if (!isModalOpen) {
            setPartition(null);
            return;
        }

        if (isNew) {
            const preset = UNCONDITIONED_PARTITION_PRESETS.ceiling_hot_attic;
            setPartition({
                id: 0,
                unconditionedType: preset.id,
                area: '',
                u: preset.defaultU,
                adjacentTemperature: preset.defaultTemperature,
            });
            setErrors([]);
            return;
        }

        const original = activeRoom.walls.find(wall => wall.id === wallId && wall.boundaryType === 'unconditioned');
        if (original) {
            const unconditionedType = original.unconditionedType || 'ceiling_hot_attic';
            setPartition({
                id: original.id,
                unconditionedType,
                area: original.area,
                u: original.u,
                adjacentTemperature: original.adjacentTemperature ?? UNCONDITIONED_PARTITION_PRESETS[unconditionedType].defaultTemperature,
            });
            setErrors([]);
        }
    }, [activeRoom.walls, isModalOpen, isNew, wallId]);

    const handleClose = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });

    const handleTypeChange = (nextType: UnconditionedPartitionType) => {
        const preset = UNCONDITIONED_PARTITION_PRESETS[nextType];
        setPartition(previous => previous ? {
            ...previous,
            unconditionedType: nextType,
            u: preset.defaultU,
            adjacentTemperature: preset.defaultTemperature,
        } : null);
        setErrors([]);
    };

    const handleSave = () => {
        if (!partition) return;
        const nextErrors: string[] = [];
        const area = Number(partition.area);
        const u = Number(partition.u);
        const adjacentTemperature = Number(partition.adjacentTemperature);

        if (!Number.isFinite(area) || area <= 0) nextErrors.push('area');
        if (!Number.isFinite(u) || u <= 0 || u > 10) nextErrors.push('u');
        if (!Number.isFinite(adjacentTemperature) || adjacentTemperature < -50 || adjacentTemperature > 100) {
            nextErrors.push('adjacentTemperature');
        }

        if (nextErrors.length > 0) {
            setErrors(nextErrors);
            const message = nextErrors.includes('area')
                ? 'Powierzchnia musi być większa od 0.'
                : nextErrors.includes('u')
                    ? 'Współczynnik U musi być w zakresie 0–10 W/(m²·K).'
                    : 'Temperatura przestrzeni musi być w zakresie od −50 do 100°C.';
            dispatch({ type: 'ADD_TOAST', payload: { message, type: 'danger' } });
            return;
        }

        const wallToSave: Wall = {
            id: isNew ? Date.now() : partition.id,
            boundaryType: 'unconditioned',
            unconditionedType: partition.unconditionedType,
            adjacentTemperature,
            area,
            u,
            // Pola nieużywane w tym uproszczonym modelu pozostają ustawione dla zgodności zapisu projektu.
            type: 'stropodach_zelbetowy_ocieplony',
            direction: 'S',
            tilt: 0,
            material: 'paint_white',
        };

        if (isNew) dispatch({ type: 'ADD_WALL', payload: wallToSave });
        else dispatch({ type: 'UPDATE_WALL', payload: wallToSave });
        handleClose();
    };

    if (!isModalOpen || !partition) return null;
    const preset = UNCONDITIONED_PARTITION_PRESETS[partition.unconditionedType];

    return (
        <Modal
            isOpen={isModalOpen}
            onClose={handleClose}
            title={isNew ? 'Dodaj przegrodę do nieklimatyzowanej przestrzeni' : 'Edytuj przegrodę do nieklimatyzowanej przestrzeni'}
            maxWidth="max-w-2xl"
            disableBackdropClick={true}
            footer={<>
                <Button variant="secondary" onClick={handleClose}>Anuluj</Button>
                <Button onClick={handleSave}>{isNew ? 'Dodaj przegrodę' : 'Zapisz zmiany'}</Button>
            </>}
        >
            <div className="space-y-5">
                <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-sm text-slate-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-slate-200">
                    Obciążenie jest stałe przez całą dobę i wynosi <strong>U × A × (temperatura przestrzeni − temperatura pomieszczenia)</strong>. Dla tej przegrody nie stosuje się nasłonecznienia, CTS ani opóźnienia RTS.
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rodzaj przegrody</label>
                    <Select value={partition.unconditionedType} onChange={event => handleTypeChange(event.target.value as UnconditionedPartitionType)}>
                        {UNCONDITIONED_PARTITION_IDS.map(id => (
                            <option key={id} value={id}>{UNCONDITIONED_PARTITION_PRESETS[id].label}</option>
                        ))}
                    </Select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                        <label className={`block text-sm font-medium mb-1 ${errors.includes('area') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            {preset.areaLabel} (m²)
                        </label>
                        <Input type="number" value={partition.area} min="0.1" step="0.1" onChange={event => setPartition({ ...partition, area: event.target.value === '' ? '' : Number(event.target.value) })} />
                    </div>

                    <div>
                        <label className={`flex items-center text-sm font-medium mb-1 ${errors.includes('u') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            Współczynnik U (W/m²·K)
                            <Tooltip text="Wpisz współczynnik przenikania ciepła dla całej przegrody." />
                        </label>
                        <Input type="number" value={partition.u} min="0.05" max="10" step="0.001" onChange={event => setPartition({ ...partition, u: event.target.value === '' ? '' : Number(event.target.value) })} />
                    </div>

                    <div className="sm:col-span-2">
                        <label className={`flex items-center text-sm font-medium mb-1 ${errors.includes('adjacentTemperature') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            Stała temperatura nieklimatyzowanej przestrzeni (°C)
                            <Tooltip text="Temperatura jest przyjmowana jako stała przez wszystkie 24 godziny. Dla gorącego poddasza wartością startową jest 50°C; możesz ją zmienić." />
                        </label>
                        <Input type="number" value={partition.adjacentTemperature} min="-50" max="100" step="0.5" onChange={event => setPartition({ ...partition, adjacentTemperature: event.target.value === '' ? '' : Number(event.target.value) })} />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            Gdy podana temperatura jest niższa od temperatury pomieszczenia, przegroda zmniejsza obciążenie chłodnicze.
                        </p>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default UnconditionedWallEditModal;
