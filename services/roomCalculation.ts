import type { Action, AllData, RoomState, RoomCalculationTicket } from '../types';
import { calculateGainsForMonth, calculateWorstMonth, generateTemperatureProfile } from './calculationService';
import { roomInputKey } from './validationService';

export type CalculationRoom = Pick<RoomState, 'id' | 'windows' | 'walls' | 'input' | 'accumulation' | 'internalGains'>;
export type RoomCalculationResult = Extract<Action, { type: 'SET_RESULTS' }>['payload'];
export type CalculationJob = { id: number; ticket: RoomCalculationTicket; room: CalculationRoom };
export type CalculationRequest = { type: 'init'; data: AllData } | { type: 'calculate'; job: CalculationJob };
export type CalculationResponse = { id: number; ticket: RoomCalculationTicket } & (
    { type: 'result'; result: RoomCalculationResult } | { type: 'error'; error: string }
);

export function calculateRoom(room: CalculationRoom, data: AllData, month: string, shading: boolean): RoomCalculationResult {
    const tExtProfile = generateTemperatureProfile(month, data);
    const calculate = (withoutShading: boolean) => calculateGainsForMonth(
        room.windows, room.walls, room.input, tExtProfile, month, data, room.accumulation, room.internalGains, withoutShading,
    );
    const annual = calculateWorstMonth(room.windows, room.walls, data, room.input, room.accumulation, room.internalGains, !shading);
    return {
        results: { withShading: calculate(false), withoutShading: calculate(true) },
        month, tExtProfile, message: 'Wyniki aktualne.',
        monthlyPeaks: annual.monthlyPeaks, yearlyMatrix: annual.yearlyMatrix,
        solarMatrix: annual.solarMatrix, solarInstantMatrix: annual.solarInstantMatrix,
    };
}

// A response must still describe the exact input, month and shading variant it calculated.
export function matchesCalculation(room: RoomState, ticket: RoomCalculationTicket, shading: boolean) {
    return room.id === ticket.roomId && roomInputKey(room) === ticket.inputKey
        && room.currentMonth === ticket.month && shading === ticket.shading;
}
