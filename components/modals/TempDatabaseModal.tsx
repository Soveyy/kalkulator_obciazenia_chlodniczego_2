
import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCalculator } from '../../contexts/CalculatorContext';
import { MONTH_NAMES, AVG_MAX_TEMPERATURES, RECORD_TEMPERATURES } from '../../constants';

const TempDatabaseModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const isOpen = state.modal.isOpen && state.modal.type === 'tempDatabase';

    const handleClose = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });
    
    const handleUseTemp = (temp: number) => {
        dispatch({ type: 'SET_INPUT', payload: { ...state.input, tExternal: temp.toString() } });
        handleClose();
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Baza Temperatur dla Warszawy"
            maxWidth="max-w-lg"
            footer={<Button onClick={handleClose}>Zamknij</Button>}
        >
            <p className="text-sm mb-4">Wybierz wartość, której chcesz użyć w obliczeniach. Zostanie ona wstawiona do pola "Temperatura zewnętrzna".</p>
            <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700 dark:text-slate-300">
                    <tr>
                        <th scope="col" className="px-6 py-3">Miesiąc</th>
                        <th scope="col" className="px-6 py-3">Średnia temp. maksymalna</th>
                        <th scope="col" className="px-6 py-3">Rekordowa temp. maksymalna</th>
                    </tr>
                </thead>
                <tbody>
                    {MONTH_NAMES.map((month, index) => (
                        <tr key={month} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700">
                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{month}</th>
                            <td className="px-6 py-4 flex items-center justify-between">
                                {AVG_MAX_TEMPERATURES[index + 1].toFixed(1)} °C 
                                <Button onClick={() => handleUseTemp(AVG_MAX_TEMPERATURES[index + 1])} className="py-1 px-2 text-xs">Użyj</Button>
                            </td>
                            <td className="px-6 py-4 flex items-center justify-between">
                                {RECORD_TEMPERATURES[index + 1].toFixed(1)} °C 
                                <Button onClick={() => handleUseTemp(RECORD_TEMPERATURES[index + 1])} className="py-1 px-2 text-xs">Użyj</Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Modal>
    );
};

export default TempDatabaseModal;
