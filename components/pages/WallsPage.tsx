import React from 'react';
import WallConfigurator from '../WallConfigurator';
import CompassHelper from '../CompassHelper';
import { useCalculator } from '../../contexts/CalculatorContext';

const WallsPage: React.FC = () => {
    const { state } = useCalculator();
    
    return (
        <div className="flex flex-col lg:flex-row gap-6">
            <div className="w-full lg:w-2/3">
                <WallConfigurator />
            </div>
            <div className="w-full lg:w-1/3">
                <div className="sticky top-6">
                    <CompassHelper />
                </div>
            </div>
        </div>
    );
};

export default WallsPage;
