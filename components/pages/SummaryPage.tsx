import React from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import ResultsArea from '../ResultsArea';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

const SummaryPage: React.FC = () => {
    const { state, handleGenerateReport, validation } = useCalculator();

    const bottomRightContent = (
        <Card className="px-5 py-4 flex flex-col justify-center gap-4 flex-grow-0 shrink-0">
            <div className="flex items-center gap-x-4 gap-y-2 flex-wrap justify-center overflow-x-auto">
                <div className="flex items-center gap-1.5" title={validation.baseValid && validation.infiltrationValid ? "Wszystkie wymagane parametry zostały uzupełnione." : "Brak wymaganych parametrów (np. powierzchnia, temperatura)."}>
                    {validation.baseValid && validation.infiltrationValid ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Dane podstawowe</span>
                </div>
                <div className="flex items-center gap-1.5" title={validation.internal ? "Źródła zysków wewnętrznych dodane." : "Brak dodatkowych zysków."}>
                    {validation.internal ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 opacity-50" />
                    )}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Zyski wewn.</span>
                </div>
                <div className="flex items-center gap-1.5" title={validation.windows ? "Okna zdefiniowane." : "Pomijasz zyski przez okna."}>
                    {validation.windows ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                        <Info className="w-5 h-5 text-orange-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Okna</span>
                </div>
                <div className="flex items-center gap-1.5" title={validation.ventilation ? "Wentylacja zdefiniowana." : "Pomijasz zyski z wentylacji."}>
                    {validation.ventilation ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                        <Info className="w-5 h-5 text-orange-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Wentylacja</span>
                </div>
                <div className="flex items-center gap-1.5" title={validation.walls ? "Zdefiniowano ściany." : "Pomijasz zyski ze ścian."}>
                    {validation.walls ? (
                        <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                    ) : (
                        <Info className="w-5 h-5 text-orange-400 shrink-0" />
                    )}
                    <span className="text-sm font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">Ściany</span>
                </div>
            </div>
            
            <div className="flex items-center justify-center pt-3 border-t border-slate-100 dark:border-slate-700">
                <Button 
                    variant="primary" 
                    onClick={handleGenerateReport} 
                    disabled={state.isGeneratingReport || !validation.isFormValid} 
                    className="w-full justify-center"
                >
                    {state.isGeneratingReport ? 'Generowanie...' : (!validation.isFormValid ? 'Uzupełnij dane' : 'Generuj raport PDF')}
                </Button>
            </div>
        </Card>
    );

    return (
        <div className="space-y-6">
            <ResultsArea bottomRightContent={bottomRightContent} />
        </div>
    );
};

export default SummaryPage;