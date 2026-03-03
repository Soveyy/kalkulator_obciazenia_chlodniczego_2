import React from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { TrashIcon } from '../Icons';

const ProjectListModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const { modal, savedProjects } = state;

    const isOpen = modal.isOpen && modal.type === 'projectList';

    const handleClose = () => {
        dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });
    };

    const handleLoad = (name: string) => {
        dispatch({ type: 'LOAD_PROJECT_FROM_LIST', payload: name });
        handleClose();
    };

    const handleDelete = (name: string) => {
        if (window.confirm(`Czy na pewno chcesz usunąć projekt "${name}"?`)) {
            dispatch({ type: 'DELETE_PROJECT', payload: name });
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Zapisane Projekty">
            <div className="space-y-4">
                {savedProjects.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">Brak zapisanych projektów.</p>
                ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {savedProjects.map((project) => (
                            <div key={project.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-white">{project.name}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {new Date(project.date).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button size="sm" onClick={() => handleLoad(project.name)}>
                                        Wczytaj
                                    </Button>
                                    <button 
                                        onClick={() => handleDelete(project.name)}
                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                                        title="Usuń projekt"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-end">
                    <Button variant="secondary" onClick={handleClose}>Zamknij</Button>
                </div>
            </div>
        </Modal>
    );
};

export default ProjectListModal;
