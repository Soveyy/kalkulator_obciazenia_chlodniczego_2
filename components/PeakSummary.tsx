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

    const sensibleAtPeak = finalGains.clearSky.sensible?.[hourTotalCS_UTC] || 0;
    const latentAtPeak = finalGains.clearSky.latent?.[hourTotalCS_UTC] || 0;
    
    const solarLoadPeak = loadComponents.solar?.[hourTotalCS_UTC] || 0;
    const conductionLoadPeak = loadComponents.conduction?.[hourTotalCS_UTC] || 0;
    const internalSensibleLoadPeak = loadComponents.internalSensible?.[hourTotalCS_UTC] || 0;
    const ventilationSensibleLoadPeak = loadComponents.ventilationSensible?.[hourTotalCS_UTC] || 0;
    const infiltrationSensibleLoadPeak = loadComponents.infiltrationSensible?.[hourTotalCS_UTC] || 0;
    
    const internalLatentAtPeak = state.activeResults.components.internalGainsLatent?.[hourTotalCS_UTC] || 0;
    const ventilationLatentAtPeak = state.activeResults.ventilationLoad.latent?.[hourTotalCS_UTC] || 0;
    const infiltrationLatentAtPeak = state.activeResults.infiltrationLoad.latent?.[hourTotalCS_UTC] || 0;

    const anyShadingEnabled = state.windows.some(win => win.shading && win.shading.enabled);
    
    const isNaturalVentWithInf = state.internalGains.ventilation.enabled && 
                                state.internalGains.ventilation.type === 'natural' && 
                                state.internalGains.ventilation.includeInfiltration;

    // FIX: Calculate total daily energy in kWh from hourly data in Watts.
    const totalKWhCS = finalGains.clearSky.total.reduce((sum, val) => sum + val, 0) / 1000;

    return (
        <Card className="flex-grow flex flex-col !p-0 overflow-hidden">
            <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-center items-center text-center">
                <h3 className="font-semibold text-slate-800 dark:text-white">
                    Podsumowanie dla: <span className="capitalize text-blue-600 dark:text-blue-400">{MONTH_NAMES[month-1]}</span>
                </h3>
            </div>
            
            <div className="p-6 flex-grow flex flex-col">
                <div className="flex flex-col items-center mb-8">
                    <p className="font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-xs mb-1 text-center">Maksymalne całkowite obciążenie chłodnicze</p>
                    <div className="text-5xl font-bold text-red-500">{(maxTotalCS / 1000).toFixed(2)} kW</div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">(o godz. {String(hourTotalCS_Local).padStart(2, '0')}:00 {timeZoneNotice})</p>
                </div>
                
                <div className="text-sm text-slate-600 dark:text-slate-300 flex flex-col sm:flex-row gap-6 sm:gap-0 w-full mb-6">
                    <div className="flex-1 flex flex-col items-center">
                        <p className="font-medium text-orange-500 uppercase tracking-wide text-xs mb-1">Obciążenie jawne</p>
                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">{(sensibleAtPeak / 1000).toFixed(2)} <span className="text-lg font-normal text-slate-500">kW</span></p>
                        
                        <div className="text-xs flex flex-col gap-1.5 w-48 text-left">
                            <div className="flex justify-between items-center w-full border-b border-slate-50 dark:border-slate-700/50 pb-1">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-slate-300 dark:text-slate-600">→</span> Słoneczne</span>
                                <span className="font-medium">{(solarLoadPeak / 1000).toFixed(2)} kW</span>
                            </div>
                            <div className="flex justify-between items-center w-full border-b border-slate-50 dark:border-slate-700/50 pb-1">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-slate-300 dark:text-slate-600">→</span> Przewodzenie</span>
                                <span className="font-medium">{(conductionLoadPeak / 1000).toFixed(2)} kW</span>
                            </div>
                            <div className="flex justify-between items-center w-full border-b border-slate-50 dark:border-slate-700/50 pb-1">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-slate-300 dark:text-slate-600">→</span> Wewnętrzne</span>
                                <span className="font-medium">{(internalSensibleLoadPeak / 1000).toFixed(2)} kW</span>
                            </div>
                            <div className="flex justify-between items-center w-full border-b border-slate-50 dark:border-slate-700/50 pb-1">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-slate-300 dark:text-slate-600">→</span> Wentylacja</span>
                                <span className="font-medium">{(ventilationSensibleLoadPeak / 1000).toFixed(2)} kW</span>
                            </div>
                            {!isNaturalVentWithInf && (
                                <div className="flex justify-between items-center w-full pb-1">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-slate-300 dark:text-slate-600">→</span> Infiltracja</span>
                                    <span className="font-medium">{(infiltrationSensibleLoadPeak / 1000).toFixed(2)} kW</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="hidden sm:block w-px bg-slate-200 dark:bg-slate-700 mx-2"></div>
                    
                    <div className="flex-1 flex flex-col items-center">
                        <p className="font-medium text-blue-500 uppercase tracking-wide text-xs mb-1">Obciążenie utajone</p>
                        <p className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-3">{(latentAtPeak / 1000).toFixed(2)} <span className="text-lg font-normal text-slate-500">kW</span></p>
                        
                        <div className="text-xs flex flex-col gap-1.5 w-48 text-left">
                            <div className="flex justify-between items-center w-full border-b border-slate-50 dark:border-slate-700/50 pb-1">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-slate-300 dark:text-slate-600">→</span> Wewnętrzne</span>
                                <span className="font-medium">{(internalLatentAtPeak / 1000).toFixed(2)} kW</span>
                            </div>
                            <div className="flex justify-between items-center w-full border-b border-slate-50 dark:border-slate-700/50 pb-1">
                                <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-slate-300 dark:text-slate-600">→</span> Wentylacja</span>
                                <span className="font-medium">{(ventilationLatentAtPeak / 1000).toFixed(2)} kW</span>
                            </div>
                            {!isNaturalVentWithInf && (
                                <div className="flex justify-between items-center w-full pb-1">
                                    <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5"><span className="text-slate-300 dark:text-slate-600">→</span> Infiltracja</span>
                                    <span className="font-medium">{(infiltrationLatentAtPeak / 1000).toFixed(2)} kW</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
    
                <div className="mt-auto bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4 border border-slate-100 dark:border-slate-700">
                    <div className="flex justify-between items-center sm:flex-row flex-col gap-2 text-center sm:text-left">
                        <span className="font-medium text-slate-600 dark:text-slate-300">Suma dobowa energii chłodniczej</span>
                        <span className="font-bold text-xl text-orange-500">{totalKWhCS.toFixed(1)} <span className="text-sm">kWh</span></span>
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
            </div>
        </Card>
    );
};

export default PeakSummary;