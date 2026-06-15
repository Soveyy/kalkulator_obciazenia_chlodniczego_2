
import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import { ANALYSIS_MONTHS } from '../constants';
import HeatGainChart from './HeatGainChart';
import PeakSummary from './PeakSummary';

import { ChartBarIcon, ChartLineIcon } from './Icons';

interface ResultsAreaProps {
    bottomRightContent?: React.ReactNode;
}

const ResultsArea: React.FC<ResultsAreaProps> = ({ bottomRightContent }) => {
    const { state, dispatch } = useCalculator();

    if (!state.results || !state.activeResults) {
        return null;
    }

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        dispatch({ type: 'RECALCULATE_VIEW', payload: e.target.value });
    };

    const availableMonths = ANALYSIS_MONTHS.ARRAY;

    return (
        <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 h-full flex flex-col">
            <div className="mb-4" dangerouslySetInnerHTML={{ __html: state.resultMessage }} />

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-stretch">
                <div className="lg:col-span-3 flex flex-col h-full">
                    <HeatGainChart />
                </div>
                <div className="lg:col-span-2 flex flex-col gap-4 h-full">
                    <PeakSummary />
                    {bottomRightContent}
                </div>
            </div>
        </div>
    );
};

export default ResultsArea;
