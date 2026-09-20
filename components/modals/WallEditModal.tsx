import { validateWall, inputNumber, parseNumber } from '../../services/validationService';
import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Tooltip from '../ui/Tooltip';
import { useCalculator } from '../../contexts/CalculatorContext';
import type { OpaquePartitionType, Wall } from '../../types';
import { WINDOW_DIRECTIONS, WALL_MATERIALS } from '../../constants';
import { CTS_PRESET_IDS, CTS_PRESETS, isRoofPreset } from '../../data/ctsPresets';

const WallEditModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const activeRoom = state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0];
    const { isOpen, type, data: wallId } = state.modal;
    const isModalOpen = isOpen && type === 'editWall';
    const isNew = wallId === null;

    const [wall, setWall] = useState<any | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const preset = wall ? CTS_PRESETS[wall.type as OpaquePartitionType] : null;
    const isRoof = wall && preset ? isRoofPreset(wall.type as OpaquePartitionType) : false;
    const tilt = Number(wall?.tilt ?? preset?.defaultTilt ?? 90);
    const requiresDirection = Boolean(wall && (!isRoof || tilt > 0));

    useEffect(() => {
        if (isModalOpen) {
            if (isNew) {
                const defaultPreset = CTS_PRESETS.sciana_murowana_ocieplona;
                setWall({
                    id: 0,
                    type: defaultPreset.id,
                    direction: '',
                    tilt: defaultPreset.defaultTilt,
                    u: defaultPreset.defaultU,
                    area: '',
                    material: defaultPreset.defaultMaterial,
                });
                dispatch({ type: 'SET_SELECTED_DIRECTION', payload: null });
                setErrors([]);
            } else {
                const originalWall = activeRoom.walls?.find(w => w.id === wallId);
                if (originalWall) {
                    const wallCopy = JSON.parse(JSON.stringify(originalWall));
                    const loadedPreset = CTS_PRESETS[wallCopy.type as OpaquePartitionType] || CTS_PRESETS.sciana_murowana_ocieplona;
                    if (!wallCopy.material) wallCopy.material = loadedPreset.defaultMaterial;
                    if (!Number.isFinite(Number(wallCopy.tilt))) wallCopy.tilt = loadedPreset.defaultTilt;
                    setWall(wallCopy);
                    dispatch({
                        type: 'SET_SELECTED_DIRECTION',
                        payload: Number(wallCopy.tilt) === 0 ? null : wallCopy.direction,
                    });
                    setErrors([]);
                }
            }
        } else {
            setWall(null);
        }
    }, [isModalOpen, wallId, activeRoom.walls, isNew]);

    useEffect(() => {
        if (wall && requiresDirection && state.selectedDirection && state.selectedDirection !== wall.direction) {
            setWall((previous: any) => previous ? { ...previous, direction: state.selectedDirection! } : null);
        }
    }, [state.selectedDirection, requiresDirection]);

    const handleClose = () => {
        dispatch({ type: 'SET_SELECTED_DIRECTION', payload: null });
        dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });
    };

    const handlePresetChange = (nextType: OpaquePartitionType) => {
        const nextPreset = CTS_PRESETS[nextType];
        setWall((previous: any) => ({
            ...previous,
            type: nextType,
            u: nextPreset.defaultU,
            tilt: nextPreset.defaultTilt,
            direction: nextPreset.defaultTilt === 0
                ? nextPreset.defaultDirection
                : previous.direction || nextPreset.defaultDirection,
            material: nextPreset.defaultMaterial,
        }));
        dispatch({
            type: 'SET_SELECTED_DIRECTION',
            payload: nextPreset.defaultTilt === 0 ? null : wall.direction || nextPreset.defaultDirection,
        });
        setErrors([]);
    };

    const handleTiltChange = (nextTilt: number) => {
        setWall((previous: any) => ({
            ...previous,
            tilt: nextTilt,
            direction: nextTilt === 0 ? 'S' : previous.direction || preset?.defaultDirection || 'S',
        }));
        dispatch({
            type: 'SET_SELECTED_DIRECTION',
            payload: nextTilt === 0 ? null : wall.direction || preset?.defaultDirection || 'S',
        });
        setErrors(current => current.filter(error => error !== 'tilt' && error !== 'direction'));
    };

    const handleSave = () => {
        if (!wall || !preset) return;

        const numericTilt = Number(wall.tilt);
        const issues = validateWall({ ...wall, boundaryType: 'external' });
        if (issues.length) {
            setErrors(issues.map(e => e.path));
            dispatch({ type: 'ADD_TOAST', payload: { message: issues[0].message, type: 'danger' } });
            return;
        }

        const wallToSave: Wall = {
            id: isNew ? Date.now() : wall.id,
            boundaryType: 'external',
            type: wall.type,
            direction: numericTilt === 0 ? 'S' : wall.direction,
            tilt: numericTilt,
            u: parseNumber(wall.u)!,
            area: parseNumber(wall.area)!,
            material: wall.material || preset.defaultMaterial,
        };

        if (isNew) dispatch({ type: 'ADD_WALL', payload: wallToSave });
        else dispatch({ type: 'UPDATE_WALL', payload: wallToSave });
        handleClose();
    };

    if (!isModalOpen || !wall || !preset) return null;

    const sameGroupWalls = (activeRoom.walls || []).filter(existing => isRoofPreset(existing.type) === isRoof);
    const index = sameGroupWalls.findIndex(existing => existing.id === wall.id) + 1;
    const genericTitle = isRoof ? `Dach ${Math.max(index, 1)}` : `Ściana ${Math.max(index, 1)}`;
    const modalTitle = isNew ? 'Dodaj przegrodę nieprzezroczystą' : `Edytuj: ${genericTitle}`;
    const wallPresetIds = CTS_PRESET_IDS.filter(id => CTS_PRESETS[id].group === 'wall');
    const roofPresetIds = CTS_PRESET_IDS.filter(id => CTS_PRESETS[id].group === 'roof');
    const uReferenceTooltip = isRoof
        ? 'Maksymalne U wg WT dla dachów, stropodachów i stropów pod nieogrzewanymi poddaszami (ti ≥ 16°C):\nWT 2021: 0,15\nWT 2017–2020: 0,18\nWT 2014–2016: 0,20\nWT 2008 / 2009–2013: 0,25 W/(m²·K)\nDla budynków władz publicznych poziom WT 2021 obowiązywał od 2019 r.\nJeśli znasz U projektowe, wpisz je zamiast wartości granicznej.'
        : 'Maksymalne U wg WT dla ścian zewnętrznych (ti ≥ 16°C):\nWT 2021: 0,20\nWT 2017–2020: 0,23\nWT 2014–2016: 0,25\nWT 2008 / 2009–2013: 0,30 W/(m²·K)\nDla budynków władz publicznych poziom WT 2021 obowiązywał od 2019 r.\nJeśli znasz U projektowe, wpisz je zamiast wartości granicznej.';

    return (
        <Modal
            isOpen={isModalOpen}
            onClose={handleClose}
            title={modalTitle}
            maxWidth="max-w-3xl"
            disableBackdropClick={true}
            footer={<>
                <Button variant="secondary" onClick={handleClose}>Anuluj</Button>
                <Button onClick={handleSave}>{isNew ? 'Dodaj przegrodę' : 'Zapisz zmiany'}</Button>
            </>}
        >
            <div className="space-y-5">
                <div>
                    <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Typ przegrody
                        <Tooltip text="Preset wybiera kształt odpowiedzi CTS i uzupełnia reprezentatywne U. Wartość U możesz następnie zastąpić danymi z projektu lub karty produktu." />
                    </label>
                    <Select
                        value={wall.type}
                        onChange={(event) => handlePresetChange(event.target.value as OpaquePartitionType)}
                    >
                        <optgroup label="Ściany zewnętrzne">
                            {wallPresetIds.map(id => (
                                <option key={id} value={id}>{CTS_PRESETS[id].label} — {CTS_PRESETS[id].menuDescription}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Dachy i stropodachy">
                            {roofPresetIds.map(id => (
                                <option key={id} value={id}>{CTS_PRESETS[id].label} — {CTS_PRESETS[id].menuDescription}</option>
                            ))}
                        </optgroup>
                    </Select>
                </div>

                <section className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 text-sm text-slate-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-slate-200">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{preset.label}</h3>
                            <p className="mt-1">{preset.recommendedFor}</p>
                        </div>
                        <span className="rounded-full bg-white px-3 py-1 font-medium text-blue-700 shadow-sm dark:bg-slate-800 dark:text-blue-300">
                            U referencyjne: {preset.defaultU.toFixed(3)} W/(m²·K)
                        </span>
                    </div>
                    <dl className="mt-3 grid gap-2">
                        <div>
                            <dt className="font-semibold text-slate-900 dark:text-white">Warstwy modelu CTS</dt>
                            <dd>{preset.layers}</dd>
                        </div>
                        <div>
                            <dt className="font-semibold text-slate-900 dark:text-white">Charakter odpowiedzi</dt>
                            <dd>{preset.thermalResponse}</dd>
                        </div>
                    </dl>
                    {preset.note && (
                        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                            {preset.note}
                        </p>
                    )}
                </section>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {requiresDirection && (
                        <div>
                            <label className={`block text-sm font-medium mb-1 ${errors.includes('direction') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                {isRoof ? 'Kierunek spadku połaci' : 'Kierunek świata'}
                            </label>
                            <Select
                                value={wall.direction}
                                onChange={(event) => {
                                    setWall({ ...wall, direction: event.target.value });
                                    dispatch({ type: 'SET_SELECTED_DIRECTION', payload: event.target.value });
                                }}
                                onMouseLeave={() => dispatch({ type: 'SET_HOVERED_DIRECTION', payload: null })}
                            >
                                <option value="">Wybierz kierunek...</option>
                                {WINDOW_DIRECTIONS.map(direction => (
                                    <option
                                        key={direction.value}
                                        value={direction.value}
                                        onMouseEnter={() => dispatch({ type: 'SET_HOVERED_DIRECTION', payload: direction.value })}
                                    >
                                        {direction.label}
                                    </option>
                                ))}
                            </Select>
                            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                {isRoof && 'Kierunek, w który opada połać.'}
                                <span className="hidden 2xl:inline"> Możesz również wskazać kierunek na kompasie.</span>
                            </p>
                        </div>
                    )}

                    {isRoof && (
                        <div>
                            <label className={`flex items-center text-sm font-medium mb-1 ${errors.includes('tilt') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                                Nachylenie połaci
                                <Tooltip text="Kąt od poziomu: 0° oznacza dach płaski. Wybierz najbliższą wartość dostępną w bazie promieniowania słonecznego." />
                            </label>
                            {preset.allowedTilts.length === 1 ? (
                                <div className="rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">
                                    0° — powierzchnia pozioma
                                </div>
                            ) : (
                                <Select value={tilt} onChange={(event) => handleTiltChange(Number(event.target.value))}>
                                    {preset.allowedTilts.map(value => (
                                        <option key={value} value={value}>{value}°{value === 0 ? ' — dach płaski' : ''}</option>
                                    ))}
                                </Select>
                            )}
                        </div>
                    )}

                    <div>
                        <label className={`block text-sm font-medium mb-1 ${errors.includes('area') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            {isRoof ? 'Rzeczywista powierzchnia połaci (m²)' : 'Powierzchnia netto ściany (m²)'}
                        </label>
                        <Input
                            type="number"
                            value={wall.area}
                            onChange={(event) => setWall({ ...wall, area: event.target.value })}
                            min="0.1"
                            step="0.1"
                        />
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                            {isRoof
                                ? 'Podaj pole po skosie, a nie rzut poziomy dachu.'
                                : 'Wpisz pole po odjęciu okien i drzwi; program nie odejmuje ich automatycznie.'}
                        </p>
                    </div>

                    <div>
                        <label className={`flex items-center text-sm font-medium mb-1 ${errors.includes('u') ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
                            Współczynnik U (W/m²·K)
                            <Tooltip text={uReferenceTooltip} />
                        </label>
                        <Input
                            type="number"
                            value={wall.u}
                            onChange={(event) => setWall({ ...wall, u: event.target.value })}
                            min="0.05"
                            max="10"
                            step="0.001"
                        />
                    </div>

                    <div className="sm:col-span-2">
                        <label className="flex items-center text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Wykończenie zewnętrzne i kolor
                            <Tooltip text="To ustawienie określa absorpcję promieniowania słonecznego używaną do temperatury zastępczej. Nie zmienia warstw ani współczynników CTS presetu." />
                        </label>
                        <Select
                            value={wall.material || preset.defaultMaterial}
                            onChange={(event) => setWall({ ...wall, material: event.target.value })}
                        >
                            {Object.entries(WALL_MATERIALS).map(([key, material]) => (
                                <option key={key} value={key}>{material.label} (α = {material.absorptance})</option>
                            ))}
                        </Select>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default WallEditModal;
