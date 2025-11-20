import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import { MONTH_NAMES } from '../constants';
import Card from './ui/Card';

const PeakSummary: React.FC = () => {
    const { state, dispatch } = useCalculator();
    if (!state.activeResults) return null;

    const { finalGains, loadComponents } = state.activeResults;
    const month = parseInt(state.currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;
    const timeZoneNotice = isSummerTime ? 'UTC+2' : 'UTC+1';
    
    const maxTotalCS = Math.max(...finalGains.clearSky.total);
    const hourTotalCS_UTC = finalGains.clearSky.total.indexOf(maxTotalCS);
    const hourTotalCS_Local = (hourTotalCS_UTC + offset) % 24;

    const sensibleAtPeak = finalGains.clearSky.sensible[hourTotalCS_UTC] || 0;
    const latentAtPeak = finalGains.clearSky.latent[hourTotalCS_UTC] || 0;
    
    const solarLoadPeak = loadComponents.solar[hourTotalCS_UTC] || 0;
    const conductionLoadPeak = loadComponents.conduction[hourTotalCS_UTC] || 0;
    const internalSensibleLoadPeak = loadComponents.internalSensible[hourTotalCS_UTC] || 0;
    const ventilationSensibleLoadPeak = loadComponents.ventilationSensible[hourTotalCS_UTC] || 0;
    
    const internalLatentAtPeak = state.activeResults.components.internalGainsLatent[hourTotalCS_UTC] || 0;
    const ventilationLatentAtPeak = state.activeResults.ventilationLoad.latent[hourTotalCS_UTC] || 0;

    const anyShadingEnabled = state.windows.some(win => win.shading && win.shading.enabled);

    // FIX: Calculate total daily energy in kWh from hourly data in Watts.
    const totalKWhCS = finalGains.clearSky.total.reduce((sum, val) => sum + val, 0) / 1000;
    const totalKWhGlobal = finalGains.global.total.reduce((sum, val) => sum + val, 0) / 1000;

    return (
        <Card>
            <h3 className="text-lg font-semibold mb-2 text-slate-800 dark:text-white">Podsumowanie dla: {MONTH_NAMES[month-1]}</h3>
            <p className="text-center font-semibold text-red-500">Maksymalne <strong>całkowite</strong> obciążenie chłodnicze</p>
            <div className="text-4xl font-bold text-center text-red-500 my-2">{maxTotalCS.toFixed(0)} W</div>
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mb-2">(o godz. {String(hourTotalCS_Local).padStart(2, '0')}:00 {timeZoneNotice})</p>
            
            <div className="mt-4 text-sm text-slate-600 dark:text-slate-300 grid grid-cols-2 gap-x-4">
                <div>
                    <p className="font-semibold text-orange-500">Obciążenie jawne:</p>
                    <p className="text-2xl font-bold">{sensibleAtPeak.toFixed(0)} W</p>
                    <div className="text-xs pl-2">
                        <p>→ Słoneczne: {solarLoadPeak.toFixed(0)} W</p>
                        <p>→ Przewodzenie: {conductionLoadPeak.toFixed(0)} W</p>
                        <p>→ Wewnętrzne: {internalSensibleLoadPeak.toFixed(0)} W</p>
                        <p>→ Wentylacja: {ventilationSensibleLoadPeak.toFixed(0)} W</p>
                    </div>
                </div>
                 <div>
                    <p className="font-semibold text-blue-500">Obciążenie utajone:</p>
                     <p className="text-2xl font-bold">{latentAtPeak.toFixed(0)} W</p>
                     <div className="text-xs pl-2">
                        <p>→ Wewnętrzne: {internalLatentAtPeak.toFixed(0)} W</p>
                        <p>→ Wentylacja: {ventilationLatentAtPeak.toFixed(0)} W</p>
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">Suma dobowa energii chłodniczej:</h4>
                <div className="flex justify-between items-baseline text-sm">
                    <span>Projektowa (Clear Sky):</span>
                    <span className="font-bold text-lg text-orange-500">{totalKWhCS.toFixed(1)} kWh</span>
                </div>
                <div className="flex justify-between items-baseline text-sm">
                    <span>Typowa (Global):</span>
                    <span className="font-bold text-lg text-blue-500">{totalKWhGlobal.toFixed(1)} kWh</span>
                </div>
            </div>

             {anyShadingEnabled && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <span>Wyniki z osłonami:</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={state.isShadingViewActive} onChange={(e) => dispatch({type: 'SET_SHADING_VIEW', payload: e.target.checked})} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                    </label>
                </div>
            )}
        </Card>
    );
};

export default PeakSummary;