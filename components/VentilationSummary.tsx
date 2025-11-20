import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';

const VentilationSummary: React.FC = () => {
    const { state } = useCalculator();
    
    if (!state.internalGains.ventilation.enabled) {
        return (
            <Card>
                <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-white">Podsumowanie Wentylacji</h3>
                <p className="text-slate-500">Kalkulacja zysków od wentylacji jest wyłączona.</p>
            </Card>
        );
    }
    
    if (!state.activeResults) {
        return (
             <Card>
                <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-white">Podsumowanie Wentylacji</h3>
                <p className="text-slate-500">Uruchom obliczenia w zakładce "Podsumowanie", aby zobaczyć wyniki.</p>
            </Card>
        );
    }

    const { ventilationLoad } = state.activeResults;

    const maxTotal = Math.max(...ventilationLoad.total);
    const hourOfMax = ventilationLoad.total.indexOf(maxTotal);
    const sensibleAtPeak = ventilationLoad.sensible[hourOfMax] || 0;
    const latentAtPeak = ventilationLoad.latent[hourOfMax] || 0;

    return (
        <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Podsumowanie Zysków od Wentylacji</h3>

            <div className="space-y-4">
                 <div className="flex justify-between items-baseline mb-2">
                     <span className="font-semibold text-orange-500">Maksymalne obc. jawne:</span>
                     <span className="font-bold text-xl text-orange-500">{Math.max(...ventilationLoad.sensible).toFixed(0)} W</span>
                </div>
                 <div className="flex justify-between items-baseline mb-2">
                     <span className="font-semibold text-blue-500">Maksymalne obc. utajone:</span>
                     <span className="font-bold text-xl text-blue-500">{Math.max(...ventilationLoad.latent).toFixed(0)} W</span>
                </div>
                <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                     <span className="font-semibold text-red-500 text-lg">Maksymalne obc. całkowite:</span>
                     <span className="font-bold text-2xl text-red-500">{maxTotal.toFixed(0)} W</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Powyższe wartości reprezentują maksymalne, chwilowe obciążenia od wentylacji mechanicznej. Nie podlegają one akumulacji.</p>
            </div>
        </Card>
    );
};

export default VentilationSummary;
