import React from 'react';
import { loginWithGoogle } from '../firebase';
import { LogIn } from 'lucide-react';

export const LoginOverlay: React.FC = () => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-8 max-w-md w-full text-center space-y-6">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Kalkulator HVAC</h2>
                <p className="text-slate-600 dark:text-slate-400">
                    Zaloguj się, aby uzyskać dostęp do aplikacji. Twoje projekty będą bezpiecznie przechowywane w chmurze i dostępne na wielu urządzeniach.
                </p>
                
                <button 
                    onClick={loginWithGoogle}
                    className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
                >
                    <LogIn size={20} />
                    Zaloguj się przez Google
                </button>
            </div>
        </div>
    );
};
