import React from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import ResultsArea from '../ResultsArea';
import Button from '../ui/Button';
import Card from '../ui/Card';

const SummaryPage: React.FC = () => {
    const { state, handleCalculate, isCalculating, handleGenerateReport } = useCalculator();
    
    if (state.results) {
        return (
            <>
                <ResultsArea />
                 <div className="text-center mt-6">
                    <Button variant="primary" onClick={handleGenerateReport} disabled={state.isGeneratingReport}>
                        {state.isGeneratingReport ? 'Generowanie raportu...' : 'Eksportuj do PDF'}
                    </Button>
                </div>
            </>
        );
    }

    return (
        <Card>
            <div className="text-center p-8">
                <h2 className="text-xl font-semibold mb-4">Gotowy do obliczeń?</h2>
                <p className="text-slate-600 dark:text-slate-400 mb-6">
                    Skonfigurowałeś już parametry pomieszczenia i źródła zysków ciepła. Kliknij poniższy przycisk, aby uruchomić pełną symulację. 
                    Kalkulator znajdzie miesiąc z największymi zyskami słonecznymi i przedstawi szczegółowe wyniki.
                </p>
                <Button variant="action" onClick={handleCalculate} disabled={isCalculating}>
                    {isCalculating ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Obliczanie...
                        </span>
                    ) : 'Oblicz obciążenie chłodnicze'}
                </Button>
            </div>
        </Card>
    );
};

export default SummaryPage;