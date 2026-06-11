import React, { useState, useMemo } from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { PlusIcon } from '../Icons';
import { ADVANCED_APPLIANCES, CATEGORY_LABELS_PL, FUEL_LABELS_PL, CONDITION_LABELS_PL } from '../../data/advancedAppliances';

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const AdvancedAppliancesModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const { dispatch } = useCalculator();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [expandedRow, setExpandedRow] = useState<string | null>(null);

    const filteredAppliances = useMemo(() => {
        return ADVANCED_APPLIANCES.filter(app => {
            const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                  app.nameEn.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory]);

    const handleAdd = (app: any) => {
        dispatch({
            type: 'ADD_ADVANCED_APPLIANCE',
            payload: {
                id: `adv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                catalogId: app.id,
                quantity: 1,
                startHour: 8,
                endHour: 16,
            }
        });
        dispatch({ type: 'ADD_TOAST', payload: { message: `Dodano: ${app.name}`, type: 'success' } });
    };

    const categories = ['all', ...Array.from(new Set(ADVANCED_APPLIANCES.map(a => a.category)))];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Katalog urządzeń zaawansowanych (ASHRAE)" maxWidth="max-w-5xl">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
                <div className="flex-1">
                    <Input 
                        placeholder="Szukaj urządzenia (np. zmywarka, griddle)..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-full md:w-64">
                    <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat === 'all' ? 'Wszystkie kategorie' : CATEGORY_LABELS_PL[cat as keyof typeof CATEGORY_LABELS_PL] || cat}
                            </option>
                        ))}
                    </Select>
                </div>
            </div>

            <div className="overflow-x-auto max-h-[60vh]">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
                    <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800 text-xs uppercase font-semibold text-slate-500 dark:text-slate-400">
                        <tr>
                            <th className="px-3 py-2 rounded-tl">Nazwa</th>
                            <th className="px-3 py-2">Tryb</th>
                            <th className="px-3 py-2">Zasilanie</th>
                            <th className="px-3 py-2">Moc znam. [W]</th>
                            <th className="px-3 py-2">Q Rad [W]</th>
                            <th className="px-3 py-2">Q Conv [W]</th>
                            <th className="px-3 py-2">Q Lat [W]</th>
                            <th className="px-3 py-2">Q Tot [W]</th>
                            <th className="px-3 py-2 rounded-tr text-center">Akcje</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                        {filteredAppliances.map(app => (
                            <React.Fragment key={app.id}>
                                <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 group cursor-pointer transition-colors" onClick={() => setExpandedRow(expandedRow === app.id ? null : app.id)}>
                                    <td className="px-3 py-2 font-medium text-slate-900 dark:text-slate-100">
                                        {app.name}
                                        {app.qRadHoodedW !== undefined && (
                                            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">
                                                Opcja z okapem
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">{CONDITION_LABELS_PL[app.condition as keyof typeof CONDITION_LABELS_PL] || app.condition}</td>
                                    <td className="px-3 py-2">{FUEL_LABELS_PL[app.fuel as keyof typeof FUEL_LABELS_PL] || app.fuel}</td>
                                    <td className="px-3 py-2 font-mono text-xs">{app.ratedW !== null ? app.ratedW : '-'}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{app.qRadW !== null ? app.qRadW : <span className="text-slate-400 dark:text-slate-500" title={`Wyznaczane na podstawie ułamka promieniowania: ${app.radiantFraction ?? 0.3} z mocy średniej (${app.avgW ?? app.qTotalW} W)`}>-</span>}</td>
                                    <td className="px-3 py-2">{app.qConvW !== null ? app.qConvW : <span className="text-slate-400 dark:text-slate-500" title={`Wyznaczane jako pozostałe ciepło jawne konwekcyjne z mocy średniej`}>-</span>}</td>
                                    <td className="px-3 py-2">{app.qLatW}</td>
                                    <td className="px-3 py-2 font-semibold text-orange-600 dark:text-orange-400">{app.qTotalW}</td>
                                    <td className="px-3 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="secondary" className="!py-1 !px-2 text-xs" onClick={() => handleAdd(app)}>
                                            <PlusIcon className="w-3 h-3 mr-1 inline" /> Dodaj
                                        </Button>
                                    </td>
                                </tr>
                                {expandedRow === app.id && (
                                    <tr className="bg-slate-50 dark:bg-slate-800/80">
                                        <td colSpan={9} className="px-4 py-3 text-xs">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div><span className="text-slate-400">Moc znamionowa [W]:</span> <br/><span className="font-medium text-slate-700 dark:text-slate-300">{app.ratedW ?? '-'}</span></div>
                                                <div><span className="text-slate-400">Moc wejściowa [W]:</span> <br/><span className="font-medium text-slate-700 dark:text-slate-300">{app.inputW ?? '-'}</span></div>
                                                <div><span className="text-slate-400">Moc średnia [W]:</span> <br/><span className="font-medium text-slate-700 dark:text-slate-300">{app.avgW ?? '-'}</span></div>
                                                <div><span className="text-slate-400">Wsp. użycia (fu):</span> <br/><span className="font-medium text-slate-700 dark:text-slate-300">{app.fu ?? '-'}</span></div>
                                                <div><span className="text-slate-400">Wsp. promieniowania (fr):</span> <br/><span className="font-medium text-slate-700 dark:text-slate-300">{app.fr !== undefined ? app.fr : (app.radiantFraction || '-')}</span></div>
                                                <div className="col-span-2 md:col-span-3"><span className="text-slate-400">Nazwa ENG:</span> <br/><span className="font-medium text-slate-700 dark:text-slate-300">{app.nameEn}</span></div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
                {filteredAppliances.length === 0 && (
                    <div className="text-center py-8 text-slate-500">Nie znaleziono urządzeń pasujących do kryteriów.</div>
                )}
            </div>
            
            <div className="flex justify-end mt-4">
                <Button variant="secondary" onClick={onClose}>Zamknij</Button>
            </div>
        </Modal>
    );
};

export default AdvancedAppliancesModal;
