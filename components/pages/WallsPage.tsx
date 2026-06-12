import React from 'react';
import WallConfigurator from '../WallConfigurator';
import WallGainsChart from '../WallGainsChart';
import CompassHelper from '../CompassHelper';
import { useCalculator } from '../../contexts/CalculatorContext';
import { MONTH_NAMES } from '../../constants';
import Card from '../ui/Card';

const WallsPage: React.FC = () => {
    const { state } = useCalculator();
    
    return (
        <div className="flex flex-col xl:flex-row gap-6 items-start">
            <div className="w-full xl:w-[640px] 2xl:w-[960px] flex-shrink-0 flex flex-col gap-6">
                {state.results && (
                     <Card>
                        <p className="text-sm">
                            Miesiąc analizy: <strong className="font-semibold text-blue-600 dark:text-blue-400">{MONTH_NAMES[parseInt(state.currentMonth) - 1]}</strong>
                        </p>
                    </Card>
                )}
                <WallConfigurator />
            </div>
            <div className="w-full flex-1 flex flex-col gap-6">
                <CompassHelper />
                <WallGainsChart />
            </div>
        </div>
    );
};

export default WallsPage;
