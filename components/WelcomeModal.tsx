
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X, Play, CheckCircle2 } from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: (startTour: boolean, dontAskAgain: boolean) => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 dark:border-slate-800"
        >
          <div className="relative p-8">
            <button
              onClick={() => onClose(false, dontAskAgain)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                <HelpCircle className="text-blue-600 dark:text-blue-400" size={32} />
              </div>

              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                Witaj w Kalkulatorze obciążenia chłodniczego!
              </h2>
              
              <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
                To narzędzie pomoże Ci precyzyjnie obliczyć zyski ciepła i obciążenie chłodnicze budynku zgodnie ze standardami ASHRAE. Czy chcesz przejść krótki przewodnik po aplikacji?
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mb-8">
                <button
                  onClick={() => onClose(true, dontAskAgain)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20"
                >
                  <Play size={18} />
                  Uruchom przewodnik
                </button>
                <button
                  onClick={() => onClose(false, dontAskAgain)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all"
                >
                  Pomiń na razie
                </button>
              </div>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={dontAskAgain}
                    onChange={(e) => setDontAskAgain(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 border-2 rounded transition-all flex items-center justify-center ${
                    dontAskAgain 
                      ? 'bg-blue-600 border-blue-600' 
                      : 'border-slate-300 dark:border-slate-600 group-hover:border-blue-500'
                  }`}>
                    {dontAskAgain && <CheckCircle2 size={14} className="text-white" />}
                  </div>
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                  Nie pytaj mnie więcej przy starcie
                </span>
              </label>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WelcomeModal;
