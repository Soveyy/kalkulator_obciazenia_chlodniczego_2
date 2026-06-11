import React from 'react';
import { useCalculator } from '../contexts/CalculatorContext';
import { PEOPLE_ACTIVITY_LEVELS } from '../constants';
import Card from './ui/Card';
import { ADVANCED_APPLIANCES } from '../data/advancedAppliances';

const InternalGainsSummary: React.FC = () => {
    const { state } = useCalculator();
    const { people, lighting, equipment, advancedAppliances } = state.internalGains;
    const { tInternal } = state.input;

    let peopleSensible = 0;
    let peopleLatent = 0;

    if (people.enabled) {
        const count = Number(people.count) || 0;
        const activity = PEOPLE_ACTIVITY_LEVELS[people.activityLevel];
        if (activity) {
            const baseSensible = count * activity.sensible;
            const baseLatent = count * activity.latent;

            if (parseFloat(tInternal) >= 27) {
                const reduction = baseSensible * 0.20;
                peopleSensible = baseSensible - reduction;
                peopleLatent = baseLatent + reduction;
            } else {
                peopleSensible = baseSensible;
                peopleLatent = baseLatent;
            }
        }
    }

    const lightingPower = lighting.enabled ? (parseFloat(state.input.roomArea) || 0) * (Number(lighting.powerDensity) || 0) : 0;

    const equipmentPower = equipment.reduce((acc, item) => acc + ((Number(item.power) || 0) * (Number(item.quantity) || 0)), 0);

    let advancedSensible = 0;
    let advancedLatent = 0;

    if (advancedAppliances && advancedAppliances.length > 0) {
        advancedAppliances.forEach(item => {
            const catalogItem = ADVANCED_APPLIANCES.find(a => a.id === item.catalogId);
            if (!catalogItem) return;

            const quantity = Number(item.quantity) || 0;
            let rad = 0;
            let conv = 0;
            let lat = 0;

            if (item.isHoodedOverride && catalogItem.qRadHoodedW !== undefined) {
                rad = catalogItem.qRadHoodedW * quantity;
                conv = 0;
                lat = 0;
            } else if (catalogItem.qRadW !== undefined && catalogItem.qRadW !== null) {
                rad = catalogItem.qRadW * quantity;
                conv = (catalogItem.qConvW || 0) * quantity;
                lat = (catalogItem.qLatW || 0) * quantity;
            } else {
                const total = (catalogItem.avgW !== undefined && catalogItem.avgW !== null)
                    ? catalogItem.avgW 
                    : (catalogItem.qTotalW || 0);
                const fr = item.radiantFractionOverride !== undefined 
                    ? item.radiantFractionOverride 
                    : (catalogItem.radiantFraction !== undefined && catalogItem.radiantFraction !== null 
                        ? catalogItem.radiantFraction 
                        : 0.3);
                rad = total * fr * quantity;
                conv = total * (1 - fr) * quantity;
                lat = (catalogItem.qLatW || 0) * quantity;
            }

            advancedSensible += (rad + conv);
            advancedLatent += lat;
        });
    }

    const totalSensible = peopleSensible + lightingPower + equipmentPower + advancedSensible;
    const totalLatent = peopleLatent + advancedLatent;
    const total = totalSensible + totalLatent;

    const hasNoInternalGains = !people.enabled && !lighting.enabled && equipment.length === 0 && (!advancedAppliances || advancedAppliances.length === 0);

    return (
        <Card>
            <h3 className="text-lg font-semibold mb-4 text-slate-800 dark:text-white">Podsumowanie Zysków Wewnętrznych</h3>

            {hasNoInternalGains ? (
                <p className="text-slate-500">Brak włączonych zysków wewnętrznych.</p>
            ) : (
                <div className="space-y-4">
                    {people.enabled && (
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Ludzie:</span>
                            <span className="font-bold text-lg text-slate-800 dark:text-white">
                                {peopleSensible.toFixed(0)} W (jawne) + {peopleLatent.toFixed(0)} W (utajone)
                            </span>
                        </div>
                    )}
                    {lighting.enabled && (
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Oświetlenie:</span>
                            <span className="font-bold text-lg text-slate-800 dark:text-white">{lightingPower.toFixed(0)} W</span>
                        </div>
                    )}
                    {equipment.length > 0 && (
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Urządzenia (podstawowe):</span>
                            <span className="font-bold text-lg text-slate-800 dark:text-white">{equipmentPower.toFixed(0)} W</span>
                        </div>
                    )}
                    {advancedSensible + advancedLatent > 0 && (
                        <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">Urządzenia zaawansowane (ASHRAE):</span>
                            <span className="font-bold text-lg text-slate-800 dark:text-white">
                                {advancedSensible.toFixed(0)} W (jawne)
                                {advancedLatent > 0 && ` + ${advancedLatent.toFixed(0)} W (utajone)`}
                            </span>
                        </div>
                    )}

                    <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-baseline mb-2">
                             <span className="font-semibold text-orange-500">Suma zysków jawnych:</span>
                             <span className="font-bold text-xl text-orange-500">{totalSensible.toFixed(0)} W</span>
                        </div>
                         <div className="flex justify-between items-baseline mb-2">
                             <span className="font-semibold text-blue-500">Suma zysków utajonych:</span>
                             <span className="font-bold text-xl text-blue-500">{totalLatent.toFixed(0)} W</span>
                        </div>
                        <div className="flex justify-between items-baseline mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                             <span className="font-semibold text-red-500 text-lg">Całkowite zyski wewnętrzne:</span>
                             <span className="font-bold text-2xl text-red-500">{total.toFixed(0)} W</span>
                        </div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Powyższe wartości reprezentują maksymalne, chwilowe zyski ciepła. Obciążenie chłodnicze (widoczne na wykresie) będzie inne ze względu na akumulację ciepła w masie termicznej budynku (efekt opóźnienia).</p>
                </div>
            )}
        </Card>
    );
};

export default InternalGainsSummary;
