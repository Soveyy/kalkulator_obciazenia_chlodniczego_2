import React from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import { AppTab } from '../../types';

interface Tab {
  id: AppTab;
  label: string;
}

const Tabs: React.FC = () => {
  const { state, dispatch } = useCalculator();

  const tabs: Tab[] = [
    { id: 'internal', label: '1. Zyski wewnętrzne' },
    { id: 'windows', label: '2. Okna' },
    { id: 'ventilation', label: '3. Wentylacja' },
    { id: 'summary', label: '4. Podsumowanie' },
  ];

  return (
    <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
      <nav className="-mb-px flex space-x-6" aria-label="Tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors
              ${state.activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Tabs;