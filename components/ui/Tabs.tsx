import React from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import { AppTab } from '../../types';

interface Tab {
  id: AppTab;
  label: string;
}

const Tabs: React.FC = () => {
  const { state, dispatch, progress } = useCalculator();

  const tabs: { id: AppTab; label: string; status: boolean }[] = [
    { id: 'internal', label: '1. Zyski wewnętrzne', status: progress.internal },
    { id: 'windows', label: '2. Okna', status: progress.windows },
    { id: 'ventilation', label: '3. Wentylacja', status: progress.ventilation },
    { id: 'summary', label: '4. Podsumowanie', status: progress.total === 100 },
    { id: 'rts', label: '5. Analiza akumulacji', status: state.results !== null },
  ];

  return (
    <div className="mb-6 pt-4">
      <nav className="flex space-x-2 overflow-x-auto scrollbar-hide pb-2 pt-1" aria-label="Tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
            className={`whitespace-nowrap py-3 px-5 rounded-xl font-medium text-sm transition-all duration-200 flex items-center gap-2 border
              ${state.activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 border-blue-500 text-blue-600 dark:text-blue-400 shadow-md transform -translate-y-0.5'
                : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg hover:-translate-y-1'
              }`}
          >
            <span className={`w-2 h-2 rounded-full transition-colors ${tab.status ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]' : 'bg-slate-300 dark:bg-slate-600'}`} />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;