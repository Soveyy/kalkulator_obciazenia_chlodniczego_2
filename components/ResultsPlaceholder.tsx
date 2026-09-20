import React from 'react';
import { AlertTriangle, ClipboardList, Loader2 } from 'lucide-react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';
import Button from './ui/Button';

const ResultsPlaceholder: React.FC = () => {
    const { roomFeedback, navigateToIssue } = useCalculator();
    const busy = roomFeedback.status === 'loading' || roomFeedback.status === 'updating';
    const firstError = roomFeedback.issues.find(issue => issue.severity === 'error');
    const Icon = busy ? Loader2 : roomFeedback.status === 'error' ? AlertTriangle : ClipboardList;
    const title = busy ? roomFeedback.message
        : roomFeedback.status === 'error' ? 'Nie udało się obliczyć wyniku'
        : roomFeedback.hasPreviousResult ? 'Wynik wymaga aktualizacji' : 'Uzupełnij dane pomieszczenia';

    return (
        <Card className="min-h-[300px] flex flex-col items-center justify-center text-center !p-8">
            <div className="mb-4 rounded-full bg-blue-50 p-3 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <Icon size={28} className={busy ? 'motion-safe:animate-spin' : ''} aria-hidden="true" />
            </div>
            <h2 role="status" className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
            <p className="mt-2 max-w-lg text-sm text-slate-600 dark:text-slate-300">
                {busy ? 'Wyniki pojawią się automatycznie.' : firstError?.message ?? roomFeedback.message}
            </p>
            {!busy && firstError && <Button className="mt-4" onClick={() => navigateToIssue(firstError.path)}>Przejdź do danych</Button>}
        </Card>
    );
};

export default ResultsPlaceholder;
