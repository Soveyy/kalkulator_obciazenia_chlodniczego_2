import { decompressProjectLink } from '../services/shareDataService';
import { MAX_ROOMS, validateRoom, roomInputKey, assertRoomValid } from '../services/validationService';
import { useProjectStorage } from '../services/useProjectStorage';
import { getRoomFeedback, getIssueTab, type RoomFeedback } from '../services/roomFeedback';

import React, { createContext, useReducer, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { Window, AccumulationSettings, CalculationResults, AllData, Shading, InternalGains, EquipmentGains, InputState, AppTab, VentilationGains, SavedProject, State, Action, RoomState } from '../types';
import { calculateWorstMonth, calculateGainsForMonth, generateTemperatureProfile } from '../services/calculationService';
import { loadAllData } from '../services/dataService';
import { generatePdfReport } from '../services/reportGenerator';
import { MONTH_NAMES, ANALYSIS_MONTHS } from '../constants';
import LZString from 'lz-string';
import { db, auth, isFirebaseConfigured } from '../firebase';


import { createInitialRoomState } from '../data/defaults';
import {
    createProjectSnapshot,
    MAX_SHARE_PAYLOAD_LENGTH,
    parseProjectDataJson,
    sanitizeProjectData,
    sanitizeSavedProject,
} from '../services/projectDataService';

const initialRoomState = createInitialRoomState();

const initialState: State = {
    projectName: 'Mój Projekt',
    rooms: [initialRoomState],
    activeRoomId: 'room-1',
    
    allData: null,
    isShadingViewActive: true,
    chartType: 'line',
    modal: { isOpen: false, type: null, data: null },
    theme: 'light',
    toasts: [],
    activeTab: 'input',
    selectedDirection: null,
    hoveredDirection: null,
    isSidebarOpen: false,
    isGeneratingReport: false,
    savedProjects: [],
    tutorialMode: false,
    hasSeenWelcome: false,
    systems: []
};

let toastId = 0;

function updateActiveRoom(state: State, updater: (room: RoomState) => RoomState): State {
    return {
        ...state,
        rooms: state.rooms.map(room => 
            room.id === state.activeRoomId ? updater(room) : room
        )
    };
}

function reduceCalculator(state: State, action: Action): State {
    const activeRoom = state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0];

    switch (action.type) {
        case 'ADD_ROOM': {
            if (state.rooms.length >= MAX_ROOMS) throw new Error('Projekt może zawierać maksymalnie 10 pomieszczeń.');
            const newId = crypto.randomUUID();
            const newRoom = createInitialRoomState(newId, `Pomieszczenie ${state.rooms.length + 1}`);
            return {
                ...state,
                rooms: [...state.rooms, newRoom],
                activeRoomId: newId,
                activeTab: 'input',
                inputFocusRequest: { roomId: newId, field: 'roomArea' },
            };
        }
        case 'SWITCH_ROOM':
            if (action.payload !== 'aggregate' && !state.rooms.some(room => room.id === action.payload)) throw new Error('Nie istnieje wybrane pomieszczenie.');
            return { ...state, activeRoomId: action.payload, inputFocusRequest: undefined };
        case 'FOCUS_ROOM_INPUT':
            return { ...state, activeTab: 'input', inputFocusRequest: { roomId: activeRoom.id, field: action.payload } };
        case 'CLEAR_INPUT_FOCUS':
            return { ...state, inputFocusRequest: undefined };
        case 'UPDATE_ROOM_NAME':
            return {
                ...state,
                rooms: state.rooms.map(r => r.id === action.payload.id ? { ...r, name: action.payload.name } : r)
            };
        case 'DELETE_ROOM': {
            if (state.rooms.length <= 1) return state;
            const newRooms = state.rooms.filter(r => r.id !== action.payload);
            let newActiveRoomId = state.activeRoomId;
            if (state.activeRoomId === action.payload) {
                newActiveRoomId = newRooms[0].id;
            } else if (state.activeRoomId === 'aggregate' && newRooms.length <= 1) {
                newActiveRoomId = newRooms[0].id;
            }
            
            return {
                ...state,
                rooms: newRooms,
                activeRoomId: newActiveRoomId,
                systems: state.systems.map(sys => ({
                    ...sys,
                    indoorUnits: sys.indoorUnits.filter(unit => unit.roomId !== action.payload)
                }))
            };
        }
        case 'DUPLICATE_ROOM': {
            if (state.rooms.length >= MAX_ROOMS) throw new Error('Projekt może zawierać maksymalnie 10 pomieszczeń.');
            const roomToDuplicate = state.rooms.find(r => r.id === action.payload);
            if (!roomToDuplicate) return state;
            const newId = crypto.randomUUID();
            const duplicatedRoom: RoomState = {
                ...roomToDuplicate,
                id: newId,
                name: `${roomToDuplicate.name} (Kopia)`
            };
            return {
                ...state,
                rooms: [...state.rooms, duplicatedRoom],
                activeRoomId: newId,
                inputFocusRequest: undefined,
            };
        }
        case 'SET_ALL_DATA':
            return { ...state, allData: action.payload };
        case 'SET_INPUT': {
            const { projectName, ...roomInput } = action.payload;
            return {
                ...updateActiveRoom(state, room => ({ ...room, input: roomInput })),
                projectName: projectName !== undefined ? projectName : state.projectName
            };
        }
        case 'ADD_WINDOW': {
            return updateActiveRoom(state, room => {
                const newWindowPayload = action.payload as Omit<Window, 'id'>;
                const newWindow: Window = {
                    ...newWindowPayload,
                    id: room.windows.length > 0 ? Math.max(...room.windows.map(w => w.id)) + 1 : 1,
                };
                return { ...room, windows: [...room.windows, newWindow] };
            });
        }
        case 'UPDATE_WINDOW':
            return updateActiveRoom(state, room => ({
                ...room,
                windows: room.windows.map(w => w.id === action.payload.id ? action.payload : w)
            }));
        case 'DELETE_WINDOW': {
            return updateActiveRoom(state, room => {
                const windowsAfterDelete = room.windows.filter(w => w.id !== action.payload);
                const renumberedWindows = windowsAfterDelete.map((w, index) => ({
                    ...w,
                    id: index + 1
                }));
                return { ...room, windows: renumberedWindows };
            });
        }
        case 'DUPLICATE_WINDOW': {
            return updateActiveRoom(state, room => {
                const windowToDuplicate = room.windows.find(w => w.id === action.payload);
                if (!windowToDuplicate) return room;
                const newWindow: Window = {
                    ...windowToDuplicate,
                    id: room.windows.length > 0 ? Math.max(...room.windows.map(w => w.id)) + 1 : 1,
                };
                return { ...room, windows: [...room.windows, newWindow] };
            });
        }
         case 'ADD_WALL':
            return updateActiveRoom(state, room => ({
                ...room,
                walls: [...room.walls, { ...action.payload, id: Math.max(0, ...room.walls.map(w => w.id)) + 1 }]
            }));
        case 'UPDATE_WALL':
            return updateActiveRoom(state, room => ({
                ...room,
                walls: room.walls.map(w => w.id === action.payload.id ? action.payload : w)
            }));
        case 'DELETE_WALL':
            return updateActiveRoom(state, room => ({
                ...room,
                walls: room.walls.filter(w => w.id !== action.payload)
            }));
        case 'DUPLICATE_WALL': {
            return updateActiveRoom(state, room => {
                const wallToDuplicate = room.walls.find(w => w.id === action.payload);
                if (!wallToDuplicate) return room;
                return {
                    ...room,
                    walls: [...room.walls, { ...wallToDuplicate, id: Math.max(0, ...room.walls.map(w => w.id)) + 1 }]
                };
            });
        }
        case 'UPDATE_ALL_SHADING': {
            return updateActiveRoom(state, room => ({
                ...room,
                windows: room.windows.map(win => {
                    const isTilted = (win.tilt ?? 90) !== 90;
                    const newShadingType = action.payload.type;
                    if (isTilted && newShadingType === 'draperies') {
                        return win;
                    }
                    return {
                        ...win,
                        shading: { ...win.shading, ...action.payload }
                    };
                })
            }));
        }
        case 'SET_ACCUMULATION':
            return updateActiveRoom(state, room => ({ ...room, accumulation: action.payload }));
        case 'SET_INTERNAL_GAINS':
            return updateActiveRoom(state, room => ({ ...room, internalGains: action.payload }));
        case 'SET_VENTILATION_GAINS':
            return updateActiveRoom(state, room => ({
                ...room,
                internalGains: { ...room.internalGains, ventilation: action.payload }
            }));
        case 'ADD_EQUIPMENT_ITEM': {
            return updateActiveRoom(state, room => {
                const newId = room.internalGains.equipment.length > 0 ? Math.max(...room.internalGains.equipment.map(e => e.id)) + 1 : 1;
                let startHour = 8;
                let endHour = 16;
                if (action.payload?.name === 'Lodówka') {
                    startHour = 0;
                    endHour = 24;
                }
                const newItem: EquipmentGains = {
                    id: newId,
                    name: action.payload?.name || 'Nowe urządzenie',
                    power: action.payload?.power || 100,
                    quantity: 1,
                    startHour: startHour,
                    endHour: endHour,
                };
                return {
                    ...room,
                    internalGains: {
                        ...room.internalGains,
                        equipment: [...room.internalGains.equipment, newItem]
                    }
                };
            });
        }
        case 'DELETE_EQUIPMENT_ITEM': {
            return updateActiveRoom(state, room => ({
                ...room,
                internalGains: {
                    ...room.internalGains,
                    equipment: room.internalGains.equipment.filter(item => item.id !== action.payload)
                }
            }));
        }
        case 'ADD_ADVANCED_APPLIANCE': {
            return updateActiveRoom(state, room => ({
                ...room,
                internalGains: {
                    ...room.internalGains,
                    advancedAppliances: [...(room.internalGains.advancedAppliances || []), action.payload]
                }
            }));
        }
        case 'UPDATE_ADVANCED_APPLIANCE': {
            return updateActiveRoom(state, room => ({
                ...room,
                internalGains: {
                    ...room.internalGains,
                    advancedAppliances: (room.internalGains.advancedAppliances || []).map(item => 
                        item.id === action.payload.id ? action.payload : item
                    )
                }
            }));
        }
        case 'DELETE_ADVANCED_APPLIANCE': {
            return updateActiveRoom(state, room => ({
                ...room,
                internalGains: {
                    ...room.internalGains,
                    advancedAppliances: (room.internalGains.advancedAppliances || []).filter(item => item.id !== action.payload)
                }
            }));
        }
        case 'SET_RESULTS':
            return updateActiveRoom(state, room => ({
                ...room,
                calculationError: undefined,
                calculatedInputKey: roomInputKey(room),
                results: action.payload.results,
                currentMonth: action.payload.month,
                tExtProfile: action.payload.tExtProfile,
                resultMessage: action.payload.message !== undefined ? action.payload.message : room.resultMessage,
                monthlyPeaks: action.payload.monthlyPeaks,
                yearlyMatrix: action.payload.yearlyMatrix || room.yearlyMatrix,
                solarMatrix: action.payload.solarMatrix || room.solarMatrix,
                solarInstantMatrix: action.payload.solarInstantMatrix || room.solarInstantMatrix,
                activeResults: state.isShadingViewActive 
                    ? action.payload.results.withShading 
                    : action.payload.results.withoutShading,
            }));
        case 'CLEAR_RESULTS':
            return updateActiveRoom(state, room => ({ ...room, results: null, activeResults: null, resultMessage: '' }));
        case 'SET_SHADING_VIEW': {
            if (!state.allData) return { ...state, isShadingViewActive: action.payload };

            const newRooms = state.rooms.map(room => {
                if (!room.results) return room;

                const { monthlyPeaks, yearlyMatrix, solarMatrix, solarInstantMatrix } = calculateWorstMonth(
                    room.windows,
                    room.walls,
                    state.allData!,
                    room.input,
                    room.accumulation,
                    room.internalGains,
                    !action.payload
                );

                return {
                    ...room,
                    activeResults: action.payload ? room.results.withShading : room.results.withoutShading,
                    monthlyPeaks,
                    yearlyMatrix,
                    solarMatrix,
                    solarInstantMatrix
                };
            });
            return {
                ...state,
                rooms: newRooms,
                isShadingViewActive: action.payload
            };
        }
        case 'RECALCULATE_VIEW': {
            if (!state.allData || !activeRoom.results) return state;
            const newMonth = action.payload;
            const tExtProfile = generateTemperatureProfile(newMonth, state.allData);
            const resultsWithShading = calculateGainsForMonth(activeRoom.windows, activeRoom.walls, activeRoom.input, tExtProfile, newMonth, state.allData, activeRoom.accumulation, activeRoom.internalGains, false);
            const resultsWithoutShading = calculateGainsForMonth(activeRoom.windows, activeRoom.walls, activeRoom.input, tExtProfile, newMonth, state.allData, activeRoom.accumulation, activeRoom.internalGains, true);

            const newResults = { withShading: resultsWithShading, withoutShading: resultsWithoutShading };
            
            return updateActiveRoom(state, room => ({
                ...room,
                currentMonth: newMonth,
                calculationError: undefined,
                calculatedInputKey: roomInputKey(room),
                tExtProfile: tExtProfile,
                results: newResults,
                activeResults: state.isShadingViewActive ? newResults.withShading : newResults.withoutShading,
            }));
        }
        case 'RECALCULATE_ALL_ROOMS': {
            if (!state.allData) return state;
            const newMonth = action.payload;
            const monthName = MONTH_NAMES[parseInt(newMonth, 10) - 1];
            const message = `Wyniki dla wszystkich pomieszczeń obliczone dla wybranego miesiąca: ${monthName}.`;

            const newRooms = state.rooms.map(room => {
                const tExtProfile = generateTemperatureProfile(newMonth, state.allData!);
                const resultsWithShading = calculateGainsForMonth(room.windows || [], room.walls || [], room.input, tExtProfile, newMonth, state.allData!, room.accumulation, room.internalGains, false);
                const resultsWithoutShading = calculateGainsForMonth(room.windows || [], room.walls || [], room.input, tExtProfile, newMonth, state.allData!, room.accumulation, room.internalGains, true);

                const newResults = { withShading: resultsWithShading, withoutShading: resultsWithoutShading };

                return {
                    ...room,
                    currentMonth: newMonth,
                    calculationError: undefined,
                    calculatedInputKey: roomInputKey(room),
                    tExtProfile,
                    results: newResults,
                    activeResults: state.isShadingViewActive ? newResults.withShading : newResults.withoutShading,
                    resultMessage: message,
                };
            });

            return {
                ...state,
                rooms: newRooms
            };
        }
        case 'TOGGLE_CHART_TYPE':
            return { ...state, chartType: state.chartType === 'line' ? 'bar' : 'line' };
        case 'SET_MODAL':
            if (!action.payload.isOpen) {
                return { ...state, modal: action.payload, selectedDirection: null, hoveredDirection: null };
            }
            return { ...state, modal: action.payload };
        case 'ADD_TOAST':
            return { ...state, toasts: [...state.toasts, { ...action.payload, id: toastId++ }] };
        case 'REMOVE_TOAST':
            return { ...state, toasts: state.toasts.filter(t => t.id !== action.payload) };
        case 'SET_STATE': {
            // Migration logic for old flat state
            const payload = action.payload as any;
            if (payload.windows && !payload.rooms) {
                const migratedRoom: RoomState = {
                    id: 'room-1',
                    name: 'Pomieszczenie 1',
                    windows: payload.windows || [],
                    walls: payload.walls || [],
                    input: {
                        tInternal: payload.input?.tInternal || '24',
                        rhInternal: payload.input?.rhInternal || '50',
                        roomArea: payload.input?.roomArea || '',
                    },
                    accumulation: payload.accumulation || initialRoomState.accumulation,
                    internalGains: payload.internalGains || initialRoomState.internalGains,
                    results: payload.results || null,
                    activeResults: payload.activeResults || null,
                    currentMonth: payload.currentMonth || '7',
                    resultMessage: payload.resultMessage || '',
                    tExtProfile: payload.tExtProfile || [],
                    monthlyPeaks: payload.monthlyPeaks || [],
                    yearlyMatrix: payload.yearlyMatrix || null,
                    solarMatrix: payload.solarMatrix || null,
                    solarInstantMatrix: payload.solarInstantMatrix || null,
                };
                return {
                    ...state,
                    ...payload,
                    projectName: payload.input?.projectName || 'Mój Projekt',
                    rooms: [migratedRoom],
                    activeRoomId: 'room-1',
                    // Clear old properties
                    windows: undefined,
                    input: undefined,
                    accumulation: undefined,
                    internalGains: undefined,
                    results: undefined,
                    activeResults: undefined,
                    currentMonth: undefined,
                    resultMessage: undefined,
                    tExtProfile: undefined,
                    monthlyPeaks: undefined,
                    yearlyMatrix: undefined,
                    solarMatrix: undefined,
                    solarInstantMatrix: undefined,
                };
            }
            
            if (payload.rooms) {
                const migratedRooms = payload.rooms.map((room: any) => ({
                    ...initialRoomState,
                    ...room,
                    windows: room.windows || [],
                    walls: room.walls || [],
                    internalGains: room.internalGains?.advancedAppliances && room.internalGains?.equipment ? room.internalGains : {
                        ...initialRoomState.internalGains,
                        ...room.internalGains,
                        equipment: room.internalGains?.equipment || [],
                        advancedAppliances: room.internalGains?.advancedAppliances || []
                    }
                }));
                return { ...state, ...payload, rooms: migratedRooms };
            }
            
            return { ...state, ...payload };
        }
        case 'SET_ACTIVE_TAB':
            return { ...state, activeTab: action.payload };
        case 'SET_SELECTED_DIRECTION':
            return { ...state, selectedDirection: action.payload };
        case 'SET_HOVERED_DIRECTION':
            return { ...state, hoveredDirection: action.payload };
        case 'TOGGLE_SIDEBAR':
            return { ...state, isSidebarOpen: !state.isSidebarOpen };
        case 'SET_GENERATING_REPORT':
            return { ...state, isGeneratingReport: action.payload };
        case 'SET_SAVED_PROJECTS':
            return { ...state, savedProjects: action.payload };
        case 'SET_TUTORIAL_MODE':
            localStorage.setItem('hvac_tutorial_mode', JSON.stringify(action.payload));
            return { ...state, tutorialMode: action.payload };
        case 'SET_HAS_SEEN_WELCOME':
            if (action.payload) {
                localStorage.setItem('hvac_has_seen_welcome', 'true');
            }
            return { ...state, hasSeenWelcome: true };
        case 'ADD_SYSTEM':
            return {
                ...state,
                systems: [...state.systems, action.payload]
            };
        case 'UPDATE_SYSTEM':
            return {
                ...state,
                systems: state.systems.map(sys => sys.id === action.payload.id ? action.payload : sys)
            };
        case 'DELETE_SYSTEM':
            return {
                ...state,
                systems: state.systems.filter(sys => sys.id !== action.payload)
            };
        case 'REORDER_SYSTEMS':
            return {
                ...state,
                systems: action.payload
            };
        default:
            return state;
    }
}


export function calculatorReducer(state: State, action: Action): State {
    try {
        const next = reduceCalculator(state, action);
        if (['SET_STATE', 'ADD_SYSTEM', 'UPDATE_SYSTEM', 'REORDER_SYSTEMS', 'ADD_ROOM', 'DUPLICATE_ROOM', 'ADD_ADVANCED_APPLIANCE', 'UPDATE_ADVANCED_APPLIANCE', 'ADD_EQUIPMENT_ITEM', 'SET_INTERNAL_GAINS', 'ADD_WINDOW', 'UPDATE_WINDOW', 'DUPLICATE_WINDOW', 'ADD_WALL', 'UPDATE_WALL', 'DUPLICATE_WALL'].includes(action.type)) createProjectSnapshot(next);
        return { ...next, rooms: next.rooms.map(room => {
            const previous = state.rooms.find(r => r.id === room.id);
            if (previous && roomInputKey(previous) !== roomInputKey(room)) return { ...room, activeResults: null, calculatedInputKey: undefined, calculationError: undefined, resultMessage: 'Nieaktualny wynik — zmieniono dane.' };
            return room;
        }) };
    } catch (error) {
        return { ...state, toasts: [...state.toasts, { id: toastId++, type: 'danger', message: error instanceof Error ? error.message : 'Nieprawidłowe dane.' }] };
    }
}

const CalculatorContext = createContext<{
    state: State;
    dispatch: React.Dispatch<Action>;
    theme: 'light' | 'dark';
    toggleTheme: () => void;
    handleCalculate: () => void;
    handleGenerateReport: () => void;
    isCalculating: boolean;
    roomFeedback: RoomFeedback;
    navigateToIssue: (path: string) => void;
    toasts: any[];
    validation: {
        issues: import("../services/validationService").ValidationIssue[];
        baseValid: boolean;
        infiltrationValid: boolean;
        internal: boolean;
        windows: boolean;
        ventilation: boolean;
        walls: boolean;
        isFormValid: boolean;
    };
}>({
    state: initialState,
    dispatch: () => null,
    theme: 'light',
    toggleTheme: () => {},
    handleCalculate: () => {},
    handleGenerateReport: () => {},
    isCalculating: false,
    roomFeedback: getRoomFeedback(initialRoomState, validateRoom(initialRoomState), initialState.projectName, false),
    navigateToIssue: () => {},
    toasts: [],
    validation: { issues: [], baseValid: false, infiltrationValid: false, internal: false, windows: false, ventilation: false, walls: false, isFormValid: false }
});

export const CalculatorProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [state, dispatch] = useReducer(calculatorReducer, initialState);
    const [isCalculating, setIsCalculating] = useState(false);
    const storage = useProjectStorage(state, dispatch);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        const savedTutorialMode = localStorage.getItem('hvac_tutorial_mode');
        const initialTutorialMode = savedTutorialMode === 'true';
        
        const savedHasSeenWelcome = localStorage.getItem('hvac_has_seen_welcome');
        const initialHasSeenWelcome = savedHasSeenWelcome === 'true';

        dispatch({ type: 'SET_STATE', payload: { 
            theme: initialTheme,
            tutorialMode: initialTutorialMode,
            hasSeenWelcome: initialHasSeenWelcome
        }});
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    }, []);
    
    // Check for URL params on mount
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        let data = params.get('data');
        
        if (!data && window.location.hash.startsWith('#data=')) {
            data = window.location.hash.replace('#data=', '');
        }

        if (data) {
            try {
                if (data.length > MAX_SHARE_PAYLOAD_LENGTH) {
                    throw new Error('Dane udostępnionego projektu są zbyt duże.');
                }
                const decompressed = decompressProjectLink(data);
                if (!decompressed) throw new Error('Nie udało się rozpakować danych projektu.');

                const projectData = parseProjectDataJson(decompressed);
                dispatch({ type: 'SET_STATE', payload: { ...projectData, savedProjectId: undefined } });
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Projekt wczytany z linku i sprawdzony.', type: 'success' } });

                // Clean URL after a successful import.
                window.history.replaceState({}, document.title, window.location.pathname);
            } catch (e) {
                console.error("Failed to load project from URL", e);
                dispatch({ type: 'ADD_TOAST', payload: { message: e instanceof Error ? e.message : 'Nie udało się wczytać projektu z linku.', type: 'danger' } });
            }
        }
    }, []);

    useEffect(() => {
        if (state.isSidebarOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [state.isSidebarOpen]);

    useEffect(() => {
        const isMobile = window.innerWidth < 1024; // lg breakpoint
        const hasVisited = localStorage.getItem('hasVisitedOnMobile');
        if (isMobile && !hasVisited) {
            dispatch({ type: 'TOGGLE_SIDEBAR' });
            localStorage.setItem('hasVisitedOnMobile', 'true');
        }
    }, []);

    useEffect(() => {
        loadAllData().then(data => {
            dispatch({ type: 'SET_ALL_DATA', payload: data });
        }).catch(err => {
            console.error("Data loading error:", err);
            dispatch({ type: 'ADD_TOAST', payload: { message: `Błąd ładowania danych aplikacji: ${err.message || 'Nieznany błąd'}`, type: 'danger' } });
        });
    }, []);

    const toggleTheme = () => {
        const newTheme = state.theme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', newTheme);
        dispatch({ type: 'SET_STATE', payload: { theme: newTheme }});
        document.documentElement.classList.toggle('dark', newTheme === 'dark');
    };

    const activeRoom = state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0];

    const validation = React.useMemo(() => {
        const issues = validateRoom(activeRoom);
        const errors = issues.filter(e => e.severity === 'error');
        const baseValid = state.projectName.trim() !== '' && !errors.some(e => e.path.startsWith('input.'));
        const infiltrationValid = !errors.some(e => e.path.startsWith('internalGains.ventilation.'));
        const internal = activeRoom.internalGains.people.enabled || activeRoom.internalGains.lighting.enabled || (activeRoom.internalGains.equipment?.length || 0) > 0;
        const windows = (activeRoom.windows?.length || 0) > 0;
        const ventilation = activeRoom.internalGains.ventilation.type !== 'none';
        const walls = (activeRoom.walls?.length || 0) > 0;

        const isFormValid = baseValid && errors.length === 0 && !activeRoom.calculationError;

        return { 
            issues,
            baseValid, 
            infiltrationValid,
            internal, 
            windows, 
            ventilation, 
            walls,
            isFormValid 
        };
    }, [state.projectName, activeRoom.input, activeRoom.internalGains, activeRoom.windows, activeRoom.walls, activeRoom.accumulation, activeRoom.calculationError]);

    const roomFeedback = getRoomFeedback(activeRoom, validation.issues, state.projectName, Boolean(state.allData));

    const navigateToIssue = (path: string) => {
        if (path === 'projectName') {
            if (window.innerWidth < 1024 && !state.isSidebarOpen) dispatch({ type: 'TOGGLE_SIDEBAR' });
            document.getElementById('project-name')?.focus();
            return;
        }
        const field = path.slice('input.'.length);
        if (path.startsWith('input.') && (field === 'roomArea' || field === 'tInternal' || field === 'rhInternal')) {
            dispatch({ type: 'FOCUS_ROOM_INPUT', payload: field });
        } else {
            dispatch({ type: 'SET_ACTIVE_TAB', payload: getIssueTab(path) });
        }
    };
    
    const performCalculation = useCallback((month: string, customMessage?: string) => {
        if (!state.allData) return;

        const tExtProfile = generateTemperatureProfile(month, state.allData);
            
        const resultsWithShading = calculateGainsForMonth(activeRoom.windows || [], activeRoom.walls || [], activeRoom.input, tExtProfile, month, state.allData, activeRoom.accumulation, activeRoom.internalGains, false);
        const resultsWithoutShading = calculateGainsForMonth(activeRoom.windows || [], activeRoom.walls || [], activeRoom.input, tExtProfile, month, state.allData, activeRoom.accumulation, activeRoom.internalGains, true);

        const { monthlyPeaks, yearlyMatrix, solarMatrix, solarInstantMatrix } = calculateWorstMonth(
            activeRoom.windows || [], 
            activeRoom.walls || [],
            state.allData, 
            activeRoom.input, 
            activeRoom.accumulation, 
            activeRoom.internalGains,
            !state.isShadingViewActive
        );

        dispatch({ type: 'SET_RESULTS', payload: { 
            results: { withShading: resultsWithShading, withoutShading: resultsWithoutShading },
            month: month,
            tExtProfile,
            message: customMessage,
            monthlyPeaks,
            yearlyMatrix,
            solarMatrix,
            solarInstantMatrix
        }});
    }, [state.allData, activeRoom.windows, activeRoom.walls, activeRoom.input, activeRoom.accumulation, activeRoom.internalGains, state.isShadingViewActive]);


    const handleCalculate = useCallback(async () => {
        if (!state.allData) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Dane aplikacji nie zostały jeszcze załadowane.', type: 'danger' } });
            return;
        }
        setIsCalculating(true);
        try {
            // First pass: calculate yearly matrices for all rooms to find the building's worst month
            const roomCalculations = state.rooms.map(room => {
                return calculateWorstMonth(
                    room.windows || [], 
                    room.walls || [],
                    state.allData!, 
                    room.input, 
                    room.accumulation, 
                    room.internalGains,
                    !state.isShadingViewActive
                );
            });

            // Sum yearly matrices to find building's worst month
            let buildingMaxPeak = -Infinity;
            let buildingWorstMonth = '7';

            for (let m = 0; m < 12; m++) {
                // Only consider months in the ANALYSIS_MONTHS range
                if (m >= ANALYSIS_MONTHS.START - 1 && m <= ANALYSIS_MONTHS.END - 1) {
                    for (let h = 0; h < 24; h++) {
                        let hourlySum = 0;
                        for (let r = 0; r < roomCalculations.length; r++) {
                            hourlySum += roomCalculations[r].yearlyMatrix[m][h];
                        }
                        if (hourlySum > buildingMaxPeak) {
                            buildingMaxPeak = hourlySum;
                            buildingWorstMonth = (m + 1).toString();
                        }
                    }
                }
            }

            const monthName = MONTH_NAMES[parseInt(buildingWorstMonth, 10) - 1];
            const now = new Date();
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            const message = `Przeliczono automatycznie o ${timeString} dla całego budynku.`;

            // Second pass: generate results for the building's worst month
            const newRooms = state.rooms.map((room, index) => {
                const calc = roomCalculations[index];
                const tExtProfile = generateTemperatureProfile(buildingWorstMonth, state.allData!);
                const resultsWithShading = calculateGainsForMonth(room.windows || [], room.walls || [], room.input, tExtProfile, buildingWorstMonth, state.allData!, room.accumulation, room.internalGains, false);
                const resultsWithoutShading = calculateGainsForMonth(room.windows || [], room.walls || [], room.input, tExtProfile, buildingWorstMonth, state.allData!, room.accumulation, room.internalGains, true);

                const newResults = { withShading: resultsWithShading, withoutShading: resultsWithoutShading };

                return {
                    ...room,
                    currentMonth: buildingWorstMonth,
                    calculationError: undefined,
                    calculatedInputKey: roomInputKey(room),
                    tExtProfile,
                    results: newResults,
                    activeResults: state.isShadingViewActive ? newResults.withShading : newResults.withoutShading,
                    resultMessage: message,
                    monthlyPeaks: calc.monthlyPeaks,
                    yearlyMatrix: calc.yearlyMatrix,
                    solarMatrix: calc.solarMatrix,
                    solarInstantMatrix: calc.solarInstantMatrix
                };
            });

            dispatch({ type: 'SET_STATE', payload: { rooms: newRooms } });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Obliczenia dla wszystkich pomieszczeń zakończone!', type: 'success' } });
        } catch(error) {
            console.error("Calculation failed:", error);
            dispatch({ type: 'ADD_TOAST', payload: { message: error instanceof Error ? error.message : 'Wystąpił błąd podczas obliczeń.', type: 'danger' } });
        } finally {
            setIsCalculating(false);
        }
    }, [state.allData, state.rooms, state.projectName, state.isShadingViewActive]);
    
    // Effect to recalculate automatically on changes and update the message
    useEffect(() => {
        if (state.allData && state.activeRoomId !== 'aggregate') {
            if (validateRoom(activeRoom).some(issue => issue.severity === 'error')) return;
            const handler = setTimeout(() => {
                try {
                    assertRoomValid(activeRoom);
                    performCalculation(activeRoom.currentMonth || '7', 'Wyniki aktualne.');
                } catch (error) {
                    dispatch({ type: 'SET_STATE', payload: { rooms: state.rooms.map(r => r.id !== activeRoom.id ? r : { ...r, activeResults: null, calculationError: error instanceof Error ? error.message : 'Nie udało się obliczyć wyniku.' }) } });
                }
            }, 300);
            return () => clearTimeout(handler);
        }
    }, [activeRoom.windows, activeRoom.walls, activeRoom.input, activeRoom.accumulation, activeRoom.internalGains, performCalculation, state.allData, state.isShadingViewActive, state.activeRoomId]);

    // Auto calculate ALL rooms when entering Aggregate Analysis.
    // SET_SHADING_VIEW refreshes selected-month results and yearly matrices itself;
    // keep a manually selected month when comparing shading variants in the dashboard.
    useEffect(() => {
        if (state.activeRoomId === 'aggregate' && state.allData) {
            if (state.rooms.some(room => validateRoom(room).some(issue => issue.severity === 'error'))) return;
            handleCalculate();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.activeRoomId, state.allData]);

    const handleGenerateReport = async () => {
        if (!validation.isFormValid || !activeRoom.activeResults || activeRoom.calculatedInputKey !== roomInputKey(activeRoom)) {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Najpierw wykonaj obliczenia!', type: 'info' } });
            return;
        }
        dispatch({ type: 'SET_GENERATING_REPORT', payload: true });
        dispatch({ type: 'ADD_TOAST', payload: { message: 'Rozpoczynam generowanie raportu...', type: 'info' } });
        try {
            await generatePdfReport(state, activeRoom);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Raport PDF wygenerowany!', type: 'success' } });
        } catch (error) {
            console.error("PDF generation failed:", error);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Błąd podczas generowania raportu.', type: 'danger' } });
        } finally {
            dispatch({ type: 'SET_GENERATING_REPORT', payload: false });
        }
    };

    const enhancedDispatch = useCallback((action: Action) => {
        try {
        if (action.type === 'SAVE_PROJECT') {
            // Legacy save
            const projectData = createProjectSnapshot({
                projectName: state.projectName,
                rooms: state.rooms,
                activeRoomId: state.activeRoomId,
                systems: state.systems,
            });
            localStorage.setItem('heatGainProject', JSON.stringify(projectData));
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Projekt zapisany (szybki zapis)!', type: 'success' } });
        } else if (action.type === 'LOAD_PROJECT') {
            // Legacy load
            const savedProject = localStorage.getItem('heatGainProject');
            if (savedProject) {
                try {
                    const projectData = parseProjectDataJson(savedProject);
                    dispatch({ type: 'SET_STATE', payload: projectData });
                    dispatch({ type: 'ADD_TOAST', payload: { message: 'Projekt wczytany i sprawdzony.', type: 'success' } });
                } catch (error) {
                    console.error('Failed to load quick save', error);
                    dispatch({ type: 'ADD_TOAST', payload: { message: 'Szybki zapis jest uszkodzony lub ma nieprawidłowy format.', type: 'danger' } });
                }
            } else {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Nie znaleziono szybkiego zapisu.', type: 'info' } });
            }
        } else if (action.type === 'SAVE_PROJECT_AS') {
            storage.save(action.payload);
        } else if (action.type === 'LOAD_PROJECT_FROM_LIST') {
            const project = storage.find(action.payload);
            if (project) {
                const projectData = sanitizeProjectData(project.data);
                dispatch({ type: 'SET_STATE', payload: { ...projectData, savedProjectId: project.id } });
                dispatch({ type: 'ADD_TOAST', payload: { message: projectData.draft ? 'Wczytano szkic — wymaga uzupełnienia.' : 'Projekt wczytany i sprawdzony.', type: 'success' } });
            }
        } else if (action.type === 'DELETE_PROJECT') {
            void storage.remove(action.payload).catch(error => dispatch({ type: 'ADD_TOAST', payload: { message: error.message, type: 'danger' } }));
        } else if (action.type === 'SYNC_PROJECT') {
            void storage.sync(action.payload);
        } else if (action.type === 'RESOLVE_PROJECT_CONFLICT') {
            storage.resolve(action.payload.id, action.payload.choice);
        } else if (action.type === 'GENERATE_SHARE_LINK') {
            // Strip out massive calculated arrays to keep the URL short
            const projectData = createProjectSnapshot({
                projectName: state.projectName,
                rooms: state.rooms,
                activeRoomId: state.activeRoomId,
                systems: state.systems,
            });
            const json = JSON.stringify(projectData);
            const compressed = LZString.compressToEncodedURIComponent(json);
            if (compressed.length > MAX_SHARE_PAYLOAD_LENGTH) throw new Error('Projekt jest zbyt duży do udostępnienia linkiem.');
            
            // Use hash instead of query param to avoid server-side URL length limits
            const url = `${window.location.origin}${window.location.pathname}#data=${compressed}`;
            
            navigator.clipboard.writeText(url).then(() => {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Link skopiowany do schowka!', type: 'success' } });
            }).catch(() => {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Nie udało się skopiować linku.', type: 'danger' } });
            });

        } else if (action.type === 'RESET_PROJECT') {
            dispatch({ type: 'SET_STATE', payload: {
                savedProjectId: undefined,
                projectName: initialState.projectName,
                rooms: [createInitialRoomState()],
                activeRoomId: initialState.activeRoomId,
                systems: initialState.systems,
            }});
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Ustawienia zostały zresetowane.', type: 'info' } });
        } else if (['SET_INPUT', 'SET_ACCUMULATION', 'SET_INTERNAL_GAINS', 'ADD_WINDOW', 'UPDATE_WINDOW', 'DELETE_WINDOW', 'DUPLICATE_WINDOW', 'ADD_WALL', 'UPDATE_WALL', 'DELETE_WALL', 'DUPLICATE_WALL', 'UPDATE_ALL_SHADING', 'ADD_EQUIPMENT_ITEM', 'DELETE_EQUIPMENT_ITEM', 'SET_VENTILATION_GAINS'].includes(action.type)) {
            dispatch(action);
        } else {
            dispatch(action);
        }
        } catch (error) {
            dispatch({ type: "ADD_TOAST", payload: { message: error instanceof Error ? error.message : "Operacja nie powiodła się. Dane zachowane.", type: "danger" } });
        }
    }, [state, activeRoom, storage]);

    const legacyState = {
        ...state,
        windows: activeRoom.windows || [],
        walls: activeRoom.walls || [],
        input: { ...activeRoom.input, projectName: state.projectName },
        accumulation: activeRoom.accumulation,
        internalGains: activeRoom.internalGains,
        results: activeRoom.results,
        activeResults: activeRoom.activeResults,
        calculationError: activeRoom.calculationError,
        currentMonth: activeRoom.currentMonth,
        resultMessage: activeRoom.resultMessage,
        tExtProfile: activeRoom.tExtProfile,
        monthlyPeaks: activeRoom.monthlyPeaks,
        yearlyMatrix: activeRoom.yearlyMatrix,
        solarMatrix: activeRoom.solarMatrix,
        solarInstantMatrix: activeRoom.solarInstantMatrix,
    };

    const value = { state: legacyState as any, dispatch: enhancedDispatch, theme: state.theme, toggleTheme, handleCalculate, isCalculating, toasts: state.toasts, handleGenerateReport, validation, roomFeedback, navigateToIssue };

    return (
        <CalculatorContext.Provider value={value}>
            {children}
        </CalculatorContext.Provider>
    );
};

export const useCalculator = () => useContext(CalculatorContext);
