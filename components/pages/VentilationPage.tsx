import React from 'react';
import VentilationPanel from '../VentilationPanel';
import VentilationGainsChart from '../VentilationGainsChart';
import VentilationSummary from '../VentilationSummary';

const VentilationPage: React.FC = () => {
    return (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            <div className="flex flex-col gap-6">
                <VentilationPanel />
                <VentilationSummary />
            </div>
            <VentilationGainsChart />
        </div>
    );
};

export default VentilationPage;
