import React from 'react';
import InternalGainsPanel from '../InternalGainsPanel';
import InternalGainsChart from '../InternalGainsChart';
import InternalGainsSummary from '../InternalGainsSummary';

const InternalGainsPage: React.FC = () => {
    return (
        <div className="flex flex-col gap-6">
            <InternalGainsPanel />
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                <InternalGainsSummary />
                <InternalGainsChart />
            </div>
        </div>
    );
};

export default InternalGainsPage;
