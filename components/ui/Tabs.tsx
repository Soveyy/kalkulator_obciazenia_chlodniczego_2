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
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
      <nav className="-mb-px flex space-x-6 overflow-x-auto scrollbar-hide" aria-label="Tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2
              ${state.activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'
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