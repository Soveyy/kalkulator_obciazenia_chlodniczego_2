import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import WindowCard from './WindowCard';
import Button from './ui/Button';
import { PlusIcon } from './Icons';

const WindowConfigurator: React.FC = () => {
  const { state, dispatch } = useCalculator();

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-md flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
          Konfiguracja Okien
          {state.windows.length > 0 && <span className="text-base font-normal text-slate-500 dark:text-slate-400 ml-2">({state.windows.length})</span>}
        </h2>
        <div className="flex gap-2">
           <Button onClick={() => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'editWindow', data: null } })} className="py-1.5 px-3 text-sm flex items-center gap-1">
              <PlusIcon className="w-4 h-4" /> Dodaj
            </Button>
           <Button onClick={() => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'bulkShading' } })} variant="secondary" className="py-1.5 px-3 text-sm">
              Wszystkie osłony
           </Button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 min-h-[300px] max-h-[calc(100vh-22rem)]">
        {state.windows.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8">
            <h3 className="text-lg font-semibold mb-2">Brak zdefiniowanych okien</h3>
            <p>Kliknij przycisk "Dodaj", aby rozpocząć konfigurację.</p>
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-2">
            {state.windows.map(win => (
              <WindowCard key={win.id} window={win} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WindowConfigurator;