import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import WallCard from './WallCard';
import Button from './ui/Button';
import { PlusIcon } from './Icons';
import { Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const WallConfigurator: React.FC = () => {
  const { state, dispatch } = useCalculator();
  const activeRoom = state.rooms.find(r => r.id === state.activeRoomId) || state.rooms[0];
  const walls = activeRoom.walls || [];

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-lg shadow-md flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <h2 className="text-xl font-semibold text-slate-800 dark:text-white">
          Konfiguracja Ścian
          {walls.length > 0 && <span className="text-base font-normal text-slate-500 dark:text-slate-400 ml-2">({walls.length})</span>}
        </h2>
        {state.tutorialMode && (
            <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800 animate-fade-in">
                <Sparkles size={14} />
                <span>Wskazówka: Ściany zewnętrzne i stropodachy wpływają na zyski ciepła przez przenikanie.</span>
            </div>
        )}
        <div className="flex gap-2 w-full sm:w-auto">
           <Button fullWidth onClick={() => dispatch({ type: 'SET_MODAL', payload: { isOpen: true, type: 'editWall', data: null } })} className="py-1.5 px-3 text-sm flex items-center justify-center gap-1">
              <PlusIcon className="w-4 h-4" /> Dodaj
            </Button>
        </div>
      </div>
      <div className="flex-grow overflow-y-auto pr-2 -mr-2 min-h-[300px] max-h-[calc(100vh-22rem)]">
        {walls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 dark:text-slate-400 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-8">
            <h3 className="text-lg font-semibold mb-2">Brak zdefiniowanych ścian</h3>
            <p>Kliknij przycisk "Dodaj", aby rozpocząć konfigurację.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-4 p-2">
            <AnimatePresence>
              {walls.map(wall => (
                <motion.div
                  key={wall.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: -20 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 25 }}
                >
                  <WallCard wall={wall} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default WallConfigurator;
