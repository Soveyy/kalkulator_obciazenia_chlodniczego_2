import type { AllData } from '../types';
import { calculateRoom, type CalculationRequest, type CalculationResponse } from '../services/roomCalculation';

const worker = self as unknown as {
    onmessage: (event: MessageEvent<CalculationRequest>) => void;
    postMessage: (message: CalculationResponse) => void;
};
let data: AllData | null = null;

worker.onmessage = ({ data: request }) => {
    if (request.type === 'init') { data = request.data; return; }
    const { id, ticket, room } = request.job;
    try {
        if (!data) throw new Error('Dane do obliczeń nie zostały załadowane.');
        worker.postMessage({ id, ticket, type: 'result', result: calculateRoom(room, data, ticket.month, ticket.shading) });
    } catch (error) {
        worker.postMessage({ id, ticket, type: 'error', error: error instanceof Error ? error.message : 'Nie udało się obliczyć wyniku.' });
    }
};
