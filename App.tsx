
import React, { useEffect, useState } from 'react';
import { CalculatorProvider, useCalculator } from './contexts/CalculatorContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Tabs from './components/ui/Tabs';
import RoomTabs from './components/ui/RoomTabs';
import InputParamsPage from './components/pages/InputParamsPage';
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
    const { state, dispatch, validation } = useCalculator();

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
        case 'input':
          return <InputParamsPage key="input" />;
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

    return (
      <div className="min-h-screen text-slate-800 dark:text-slate-200 transition-colors duration-300 flex">
        <WelcomeModal 
            isOpen={!state.hasSeenWelcome} 
            onClose={handleWelcomeClose} 
        />
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 bg-slate-100 dark:bg-slate-950">
          <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-6 pb-24 lg:pb-24">
            <div id="app-header">
                <Header />
            </div>

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
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={{ duration: 0.12, ease: "easeInOut" }}
                    >
                        {renderActiveTab()}
                    </motion.div>
                </AnimatePresence>
            </div>
          </main>
        </div>
        <CompassHelper />
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
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-500">Ładowanie...</div>;
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
