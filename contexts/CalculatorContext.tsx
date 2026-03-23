
import React, { createContext, useReducer, useContext, useEffect, useCallback, useState, ReactNode } from 'react';
import { Window, AccumulationSettings, CalculationResults, AllData, Shading, InternalGains, EquipmentGains, InputState, AppTab, VentilationGains, SavedProject, State, Action, RoomState } from '../types';
import { calculateWorstMonth, calculateGainsForMonth, generateTemperatureProfile } from '../services/calculationService';
import { loadAllData } from '../services/dataService';
import { generatePdfReport } from '../services/reportGenerator';
import { MONTH_NAMES } from '../constants';
import LZString from 'lz-string';

const initialRoomState: RoomState = {
    id: 'room-1',
    name: 'Pomieszczenie 1',
    windows: [],
    input: { tInternal: '24', rhInternal: '50', roomArea: '' },
    accumulation: {
        include: true,
        thermalMass: 'very_heavy',
        floorType: 'panels',
        glassPercentage: 50
    },
    internalGains: {
        people: {
            enabled: false,
            count: 1,
            activityLevel: 'seated_very_light',
            startHour: 8,
            endHour: 16,
        },
        lighting: {
            enabled: false,
            type: 'led_troffer',
            powerDensity: 8.0,
            startHour: 8,
            endHour: 16,
        },
        equipment: [],
        ventilation: {
            enabled: false,
            type: 'none',
            airflow: 150,
            exchangerType: 'counterflow_hrv',
            naturalVentilationAirflow: 150,
            includeInfiltration: false,
            exteriorWallPerimeter: '',
            roomHeight: 2.7,
            buildingStories: '1',
            tightnessClass: 'average',
            shieldingClass: '3',
            windSpeed: 3.4,
        },
    },
    results: null,
    activeResults: null,
    currentMonth: '7',
    resultMessage: '',
    tExtProfile: [],
    monthlyPeaks: [],
    yearlyMatrix: null,
    solarMatrix: null,
    solarInstantMatrix: null,
};

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
    activeTab: 'internal',
    selectedDirection: null,
    hoveredDirection: null,
    isSidebarOpen: false,
    isGeneratingReport: false,
    savedProjects: [],
    tutorialMode: false,
    hasSeenWelcome: false,
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

function calculatorReducer(state: State, action: Action): State {
    const activeRoom = state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0];

    switch (action.type) {
        case 'ADD_ROOM': {
            const newId = `room-${Date.now()}`;
            const newRoom: RoomState = {
                ...initialRoomState,
                id: newId,
                name: `Pomieszczenie ${state.rooms.length + 1}`
            };
            return {
                ...state,
                rooms: [...state.rooms, newRoom],
                activeRoomId: newId
            };
        }
        case 'SWITCH_ROOM':
            return { ...state, activeRoomId: action.payload };
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
                activeRoomId: newActiveRoomId
            };
        }
        case 'DUPLICATE_ROOM': {
            const roomToDuplicate = state.rooms.find(r => r.id === action.payload);
            if (!roomToDuplicate) return state;
            const newId = `room-${Date.now()}`;
            const duplicatedRoom: RoomState = {
                ...roomToDuplicate,
                id: newId,
                name: `${roomToDuplicate.name} (Kopia)`
            };
            return {
                ...state,
                rooms: [...state.rooms, duplicatedRoom],
                activeRoomId: newId
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
        case 'SET_RESULTS':
            return updateActiveRoom(state, room => ({
                ...room,
                results: action.payload.results,
                currentMonth: action.payload.month,
                tExtProfile: action.payload.tExtProfile,
                resultMessage: action.payload.message,
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
            const newState = updateActiveRoom(state, room => {
                if (!room.results) return room;
                return {
                    ...room,
                    activeResults: action.payload ? room.results.withShading : room.results.withoutShading,
                };
            });
            return {
                ...newState,
                isShadingViewActive: action.payload
            };
        }
        case 'RECALCULATE_VIEW': {
            if (!state.allData || !activeRoom.results) return state;
            const newMonth = action.payload;
            const tExtProfile = generateTemperatureProfile(newMonth, state.allData);
            const resultsWithShading = calculateGainsForMonth(activeRoom.windows, activeRoom.input, tExtProfile, newMonth, state.allData, activeRoom.accumulation, activeRoom.internalGains, false);
            const resultsWithoutShading = calculateGainsForMonth(activeRoom.windows, activeRoom.input, tExtProfile, newMonth, state.allData, activeRoom.accumulation, activeRoom.internalGains, true);

            const newResults = { withShading: resultsWithShading, withoutShading: resultsWithoutShading };
            
            return updateActiveRoom(state, room => ({
                ...room,
                currentMonth: newMonth,
                tExtProfile: tExtProfile,
                results: newResults,
                activeResults: state.isShadingViewActive ? newResults.withShading : newResults.withoutShading,
            }));
        }
        case 'RECALCULATE_ALL_ROOMS': {
            if (!state.allData) return state;
            const newMonth = action.payload;
            const monthName = MONTH_NAMES[parseInt(newMonth, 10) - 1];
            const message = `Wyniki dla wszystkich pomieszczeń obliczone dla wybranego miesiąca: <strong>${monthName}</strong>.`;

            const newRooms = state.rooms.map(room => {
                const tExtProfile = generateTemperatureProfile(newMonth, state.allData!);
                const resultsWithShading = calculateGainsForMonth(room.windows, room.input, tExtProfile, newMonth, state.allData!, room.accumulation, room.internalGains, false);
                const resultsWithoutShading = calculateGainsForMonth(room.windows, room.input, tExtProfile, newMonth, state.allData!, room.accumulation, room.internalGains, true);

                const newResults = { withShading: resultsWithShading, withoutShading: resultsWithoutShading };

                return {
                    ...room,
                    currentMonth: newMonth,
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
        default:
            return state;
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
    toasts: any[];
    progress: {
        base: boolean;
        internal: boolean;
        windows: boolean;
        ventilation: boolean;
        total: number;
    };
}>({
    state: initialState,
    dispatch: () => null,
    theme: 'light',
    toggleTheme: () => {},
    handleCalculate: () => {},
    handleGenerateReport: () => {},
    isCalculating: false,
    toasts: [],
    progress: { base: false, internal: false, windows: false, ventilation: false, total: 0 }
});

export const CalculatorProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [state, dispatch] = useReducer(calculatorReducer, initialState);
    const [isCalculating, setIsCalculating] = useState(false);
    const [initialCalculationDone, setInitialCalculationDone] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        
        const savedTutorialMode = localStorage.getItem('hvac_tutorial_mode');
        const initialTutorialMode = savedTutorialMode ? JSON.parse(savedTutorialMode) : false;
        
        const savedHasSeenWelcome = localStorage.getItem('hvac_has_seen_welcome');
        const initialHasSeenWelcome = savedHasSeenWelcome ? JSON.parse(savedHasSeenWelcome) : false;

        dispatch({ type: 'SET_STATE', payload: { 
            theme: initialTheme,
            tutorialMode: initialTutorialMode,
            hasSeenWelcome: initialHasSeenWelcome
        }});
        document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    }, []);
    
    // Load saved projects list on mount
    useEffect(() => {
        const savedProjectsStr = localStorage.getItem('hvac_saved_projects');
        if (savedProjectsStr) {
            try {
                const savedProjects = JSON.parse(savedProjectsStr);
                dispatch({ type: 'SET_SAVED_PROJECTS', payload: savedProjects });
            } catch (e) {
                console.error("Failed to parse saved projects", e);
            }
        }
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
                const decompressed = LZString.decompressFromEncodedURIComponent(data);
                if (decompressed) {
                    const projectData = JSON.parse(decompressed);
                    dispatch({ type: 'SET_STATE', payload: projectData });
                    dispatch({ type: 'ADD_TOAST', payload: { message: 'Projekt wczytany z linku!', type: 'success' } });
                    
                    // Clean URL
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            } catch (e) {
                console.error("Failed to load project from URL", e);
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Nie udało się wczytać projektu z linku.', type: 'danger' } });
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

    const progress = React.useMemo(() => {
        const base = 
            state.projectName.trim() !== '' && 
            activeRoom.input.roomArea !== '' && 
            activeRoom.input.tInternal !== '' && 
            activeRoom.input.rhInternal !== '';
            
        const internal = activeRoom.internalGains.people.enabled || activeRoom.internalGains.lighting.enabled || activeRoom.internalGains.equipment.length > 0;
        const windows = activeRoom.windows.length > 0;
        const ventilation = activeRoom.internalGains.ventilation.type !== 'none';
        
        const sections = [base, internal, windows, ventilation];
        const completed = sections.filter(Boolean).length;
        const total = Math.round((completed / sections.length) * 100);

        return { base, internal, windows, ventilation, total };
    }, [state.projectName, activeRoom.input, activeRoom.internalGains, activeRoom.windows]);
    
    const performCalculation = useCallback((month: string, customMessage?: string) => {
        if (!state.allData) return;

        const tExtProfile = generateTemperatureProfile(month, state.allData);
            
        const resultsWithShading = calculateGainsForMonth(activeRoom.windows, activeRoom.input, tExtProfile, month, state.allData, activeRoom.accumulation, activeRoom.internalGains, false);
        const resultsWithoutShading = calculateGainsForMonth(activeRoom.windows, activeRoom.input, tExtProfile, month, state.allData, activeRoom.accumulation, activeRoom.internalGains, true);

        const { monthlyPeaks, yearlyMatrix, solarMatrix, solarInstantMatrix } = calculateWorstMonth(
            activeRoom.windows, 
            state.allData, 
            activeRoom.input, 
            activeRoom.accumulation, 
            activeRoom.internalGains
        );

        const message = customMessage || activeRoom.resultMessage;

        dispatch({ type: 'SET_RESULTS', payload: { 
            results: { withShading: resultsWithShading, withoutShading: resultsWithoutShading },
            month: month,
            tExtProfile,
            message,
            monthlyPeaks,
            yearlyMatrix,
            solarMatrix,
            solarInstantMatrix
        }});
    }, [state.allData, activeRoom.windows, activeRoom.input, state.projectName, activeRoom.accumulation, activeRoom.internalGains, activeRoom.resultMessage]);


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
                    room.windows, 
                    state.allData!, 
                    room.input, 
                    room.accumulation, 
                    room.internalGains
                );
            });

            // Sum yearly matrices to find building's worst month
            let buildingMaxPeak = -Infinity;
            let buildingWorstMonth = '7';

            for (let m = 0; m < 12; m++) {
                // Only consider April to September (indices 3 to 8)
                if (m >= 3 && m <= 8) {
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
            const message = `Miesiąc z największym obciążeniem chłodniczym dla całego budynku: <strong>${monthName}</strong>.`;

            // Second pass: generate results for the building's worst month
            const newRooms = state.rooms.map((room, index) => {
                const calc = roomCalculations[index];
                const tExtProfile = generateTemperatureProfile(buildingWorstMonth, state.allData!);
                const resultsWithShading = calculateGainsForMonth(room.windows, room.input, tExtProfile, buildingWorstMonth, state.allData!, room.accumulation, room.internalGains, false);
                const resultsWithoutShading = calculateGainsForMonth(room.windows, room.input, tExtProfile, buildingWorstMonth, state.allData!, room.accumulation, room.internalGains, true);

                const newResults = { withShading: resultsWithShading, withoutShading: resultsWithoutShading };

                return {
                    ...room,
                    currentMonth: buildingWorstMonth,
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
            setInitialCalculationDone(true);
        } catch(error) {
            console.error("Calculation failed:", error);
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Wystąpił błąd podczas obliczeń.', type: 'danger' } });
        } finally {
            setIsCalculating(false);
        }
    }, [state.allData, state.rooms, state.projectName, state.isShadingViewActive]);
    
    // Effect to recalculate automatically on changes and update the message
    useEffect(() => {
        if (initialCalculationDone && state.allData) {
            const handler = setTimeout(() => {
                // Find the worst month based on current settings
                const { worstMonth, monthlyPeaks } = calculateWorstMonth(
                    activeRoom.windows, 
                    state.allData!, 
                    activeRoom.input, 
                    activeRoom.accumulation, 
                    activeRoom.internalGains
                );
                const worstMonthName = MONTH_NAMES[parseInt(worstMonth, 10) - 1];
                
                // Only show critical month message
                const message = `Miesiąc z największym obciążeniem chłodniczym dla obecnych ustawień: <strong>${worstMonthName}</strong>.`;
                
                // Recalculate for current viewing month (don't force switch)
                performCalculation(activeRoom.currentMonth, message);
            }, 500);
            return () => clearTimeout(handler);
        }
    }, [activeRoom.windows, activeRoom.input, state.projectName, activeRoom.accumulation, activeRoom.internalGains, initialCalculationDone, performCalculation, state.allData, activeRoom.currentMonth]);

    const handleGenerateReport = async () => {
        if (!activeRoom.activeResults) {
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
        if (action.type === 'SAVE_PROJECT') {
            // Legacy save
            const projectData = {
                projectName: state.projectName,
                rooms: state.rooms,
                activeRoomId: state.activeRoomId,
            };
            localStorage.setItem('heatGainProject', JSON.stringify(projectData));
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Projekt zapisany (szybki zapis)!', type: 'success' } });
        } else if (action.type === 'LOAD_PROJECT') {
            // Legacy load
            const savedProject = localStorage.getItem('heatGainProject');
            if (savedProject) {
                const projectData = JSON.parse(savedProject);
                setInitialCalculationDone(false);
                dispatch({ type: 'SET_STATE', payload: projectData });
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Projekt wczytany!', type: 'success' } });
            } else {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Nie znaleziono szybkiego zapisu.', type: 'info' } });
            }
        } else if (action.type === 'SAVE_PROJECT_AS') {
            const name = action.payload;
            const projectData = {
                projectName: name,
                rooms: state.rooms,
                activeRoomId: state.activeRoomId,
            };
            
            const newProject: SavedProject = {
                name,
                date: new Date().toISOString(),
                data: projectData
            };

            const updatedProjects = [...state.savedProjects.filter(p => p.name !== name), newProject];
            localStorage.setItem('hvac_saved_projects', JSON.stringify(updatedProjects));
            
            dispatch({ type: 'SET_SAVED_PROJECTS', payload: updatedProjects });
            dispatch({ type: 'SET_INPUT', payload: { ...activeRoom.input, projectName: name } });
            dispatch({ type: 'ADD_TOAST', payload: { message: `Projekt "${name}" zapisany!`, type: 'success' } });

        } else if (action.type === 'LOAD_PROJECT_FROM_LIST') {
            const project = state.savedProjects.find(p => p.name === action.payload);
            if (project) {
                setInitialCalculationDone(false);
                dispatch({ type: 'SET_STATE', payload: project.data });
                dispatch({ type: 'ADD_TOAST', payload: { message: `Projekt "${project.name}" wczytany!`, type: 'success' } });
            }
        } else if (action.type === 'DELETE_PROJECT') {
            const updatedProjects = state.savedProjects.filter(p => p.name !== action.payload);
            localStorage.setItem('hvac_saved_projects', JSON.stringify(updatedProjects));
            dispatch({ type: 'SET_SAVED_PROJECTS', payload: updatedProjects });
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Projekt usunięty.', type: 'info' } });

        } else if (action.type === 'GENERATE_SHARE_LINK') {
            // Strip out massive calculated arrays to keep the URL short
            const strippedRooms = state.rooms.map(room => ({
                ...room,
                results: null,
                activeResults: null,
                tExtProfile: [],
                monthlyPeaks: [],
                yearlyMatrix: null,
                solarMatrix: null,
                solarInstantMatrix: null,
                resultMessage: ''
            }));

            const projectData = {
                projectName: state.projectName,
                rooms: strippedRooms,
                activeRoomId: state.activeRoomId,
            };
            const json = JSON.stringify(projectData);
            const compressed = LZString.compressToEncodedURIComponent(json);
            
            // Use hash instead of query param to avoid server-side URL length limits
            const url = `${window.location.origin}${window.location.pathname}#data=${compressed}`;
            
            navigator.clipboard.writeText(url).then(() => {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Link skopiowany do schowka!', type: 'success' } });
            }).catch(() => {
                dispatch({ type: 'ADD_TOAST', payload: { message: 'Nie udało się skopiować linku.', type: 'danger' } });
            });

        } else if (action.type === 'RESET_PROJECT') {
            setInitialCalculationDone(false);
            dispatch({ type: 'SET_STATE', payload: {
                projectName: initialState.projectName,
                rooms: initialState.rooms,
                activeRoomId: initialState.activeRoomId,
            }});
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Ustawienia zostały zresetowane.', type: 'info' } });
        } else if (['SET_INPUT', 'SET_ACCUMULATION', 'SET_INTERNAL_GAINS', 'ADD_WINDOW', 'UPDATE_WINDOW', 'DELETE_WINDOW', 'DUPLICATE_WINDOW', 'UPDATE_ALL_SHADING', 'ADD_EQUIPMENT_ITEM', 'DELETE_EQUIPMENT_ITEM', 'SET_VENTILATION_GAINS'].includes(action.type)) {
             if (initialCalculationDone) {
                 dispatch(action);
             } else {
                dispatch({ ...action, type: 'CLEAR_RESULTS' });
                dispatch(action);
             }
        } else {
            dispatch(action);
        }
    }, [state, initialCalculationDone, activeRoom]);

    const legacyState = {
        ...state,
        windows: activeRoom.windows,
        input: { ...activeRoom.input, projectName: state.projectName },
        accumulation: activeRoom.accumulation,
        internalGains: activeRoom.internalGains,
        results: activeRoom.results,
        activeResults: activeRoom.activeResults,
        currentMonth: activeRoom.currentMonth,
        resultMessage: activeRoom.resultMessage,
        tExtProfile: activeRoom.tExtProfile,
        monthlyPeaks: activeRoom.monthlyPeaks,
        yearlyMatrix: activeRoom.yearlyMatrix,
        solarMatrix: activeRoom.solarMatrix,
        solarInstantMatrix: activeRoom.solarInstantMatrix,
    };

    const value = { state: legacyState as any, dispatch: enhancedDispatch, theme: state.theme, toggleTheme, handleCalculate, isCalculating, toasts: state.toasts, handleGenerateReport, progress };

    return (
        <CalculatorContext.Provider value={value}>
            {children}
        </CalculatorContext.Provider>
    );
};

export const useCalculator = () => useContext(CalculatorContext);
