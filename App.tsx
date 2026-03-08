
import React from 'react';
import { CalculatorProvider, useCalculator } from './contexts/CalculatorContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Tabs from './components/ui/Tabs';
import InternalGainsPage from './components/pages/InternalGainsPage';
import WindowsPage from './components/pages/WindowsPage';
import VentilationPage from './components/pages/VentilationPage';
import SummaryPage from './components/pages/SummaryPage';
import RtsAnalysisPage from './components/pages/RtsAnalysisPage';
import MethodologyModal from './components/modals/MethodologyModal';
import WindowEditModal from './components/modals/WindowEditModal';
import BulkShadingModal from './components/modals/BulkShadingModal';
import RtsVisualizerModal from './components/modals/RtsVisualizerModal';
import CompassHelper from './components/CompassHelper';
import KPIDashboard from './components/KPIDashboard';
import ProjectListModal from './components/modals/ProjectListModal';
import ToastContainer from './components/ToastContainer';

import { motion, AnimatePresence } from 'motion/react';

const AppContent: React.FC = () => {
    const { state, progress } = useCalculator();
  
    const renderActiveTab = () => {
      switch (state.activeTab) {
        case 'internal':
          return <InternalGainsPage key="internal" />;
        case 'windows':
          return <WindowsPage key="windows" />;
        case 'ventilation':
          return <VentilationPage key="ventilation" />;
        case 'summary':
          return <SummaryPage key="summary" />;
        case 'rts':
          return <RtsAnalysisPage key="rts" />;
        default:
          return null;
      }
    }

    const getProgressColor = (total: number) => {
        if (total <= 25) return 'bg-red-500';
        if (total <= 75) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
      <div className="min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-24">
            <Header />
            
            {/* Project Progress Bar */}
            <div className="mb-2">
                <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        Kompletność danych projektu
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getProgressColor(progress.total)} text-white`}>
                        {progress.total}%
                    </span>
                </div>
                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${progress.total}%` }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className={`h-full ${getProgressColor(progress.total)} shadow-[0_0_10px_rgba(0,0,0,0.1)]`}
                    />
                </div>
            </div>

            <Tabs />
            
            <div className="relative overflow-hidden min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={state.activeTab}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2, ease: "easeInOut" }}
                    >
                        {renderActiveTab()}
                    </motion.div>
                </AnimatePresence>
            </div>
          </main>
        </div>
        <CompassHelper />
        <KPIDashboard />
      </div>
    );
};

const App: React.FC = () => {
  return (
    <CalculatorProvider>
      <AppContent />
      <MethodologyModal />
      <WindowEditModal />
      <BulkShadingModal />
      <RtsVisualizerModal />
      <ProjectListModal />
      <ToastContainer />
    </CalculatorProvider>
  );
};

export default App;
