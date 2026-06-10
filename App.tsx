
import React, { useEffect, useState } from 'react';
import { CalculatorProvider, useCalculator } from './contexts/CalculatorContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Tabs from './components/ui/Tabs';
import RoomTabs from './components/ui/RoomTabs';
import InternalGainsPage from './components/pages/InternalGainsPage';
import WindowsPage from './components/pages/WindowsPage';
import WallsPage from './components/pages/WallsPage';
import VentilationPage from './components/pages/VentilationPage';
import SummaryPage from './components/pages/SummaryPage';
import RtsAnalysisPage from './components/pages/RtsAnalysisPage';
import MethodologyModal from './components/modals/MethodologyModal';
import WindowEditModal from './components/modals/WindowEditModal';
import WallEditModal from './components/modals/WallEditModal';
import BulkShadingModal from './components/modals/BulkShadingModal';
import RtsVisualizerModal from './components/modals/RtsVisualizerModal';
import CompassHelper from './components/CompassHelper';
import KPIDashboard from './components/KPIDashboard';
import ProjectListModal from './components/modals/ProjectListModal';
import ToastContainer from './components/ToastContainer';
import { LoginOverlay } from './components/LoginOverlay';
import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

import { motion, AnimatePresence } from 'motion/react';

import AggregateAnalysisPage from './components/pages/AggregateAnalysisPage';
import WelcomeModal from './components/WelcomeModal';
import { createTutorial } from './services/tutorialService';

const AppContent: React.FC = () => {
    const { state, dispatch, progress } = useCalculator();

    const handleWelcomeClose = (startTour: boolean, dontAskAgain: boolean) => {
        dispatch({ type: 'SET_HAS_SEEN_WELCOME', payload: dontAskAgain });
        if (startTour) {
            const tour = createTutorial(() => {
                // Tour finished
            });
            tour.drive();
        }
    };
  
    const renderActiveTab = () => {
      if (state.activeRoomId === 'aggregate') {
          return <AggregateAnalysisPage key="aggregate" />;
      }

      switch (state.activeTab) {
        case 'internal':
          return <InternalGainsPage key="internal" />;
        case 'windows':
          return <WindowsPage key="windows" />;
        case 'walls':
          return <WallsPage key="walls" />;
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
        <WelcomeModal 
            isOpen={!state.hasSeenWelcome} 
            onClose={handleWelcomeClose} 
        />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 pb-24 lg:pb-24">
            <div id="app-header">
                <Header />
            </div>
            
            {/* Project Progress Bar */}
            {state.activeRoomId !== 'aggregate' && (
                <div className="mb-2">
                    <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            Kompletność danych pomieszczenia
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
            )}

            <RoomTabs />
            {state.activeRoomId !== 'aggregate' && (
                <div id="main-tabs">
                    <Tabs />
                </div>
            )}
            
            <div className="relative overflow-hidden min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={state.activeRoomId === 'aggregate' ? 'aggregate' : state.activeTab}
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-500">Ładowanie...</div>;
  }

  if (user && user.email?.toLowerCase() === 'xevenx11@gmail.com') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-red-500/10 dark:bg-red-900/20 pointer-events-none" />
        <div className="max-w-md w-full bg-white dark:bg-slate-800 border-4 border-red-500 dark:border-yellow-500 rounded-2xl p-8 text-center shadow-2xl relative z-10">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6 flex-shrink-0">
            <svg className="w-10 h-10 text-red-600 dark:text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider">
            Dostęp zablokowany
          </h1>
          <p className="text-lg text-slate-700 dark:text-slate-300 font-medium mb-8">
            Wpłać 10 zł BLIKIEM na nr <br/>
            <span className="text-2xl font-bold font-mono text-red-600 dark:text-yellow-400 my-2 block">603 230 307</span>
            żeby odblokować.
          </p>
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <button 
              onClick={() => auth.signOut()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              Wyloguj się
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <CalculatorProvider>
      {!user && <LoginOverlay />}
      {user && (
        <>
          <AppContent />
          <MethodologyModal />
          <WindowEditModal />
          <WallEditModal />
          <BulkShadingModal />
          <RtsVisualizerModal />
          <ProjectListModal />
          <ToastContainer />
        </>
      )}
    </CalculatorProvider>
  );
};

export default App;
