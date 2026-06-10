import React from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { TrashIcon } from '../Icons';
import { Cloud, Monitor, CloudUpload } from 'lucide-react';

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

    const handleSync = (name: string) => {
        dispatch({ type: 'SYNC_PROJECT', payload: name });
    }

    const handleBulkSync = () => {
        savedProjects.forEach(project => {
            if (project.isLocal && !project.isCloud) {
                dispatch({ type: 'SYNC_PROJECT', payload: project.name });
            }
        });
    }

    const localOnlyProjectsCount = savedProjects.filter(p => p.isLocal && !p.isCloud).length;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Moje Projekty">
            <div className="space-y-4">
                {localOnlyProjectsCount > 0 && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center justify-between border border-blue-100 dark:border-blue-800">
                        <span className="text-sm text-blue-700 dark:text-blue-300">
                            Masz {localOnlyProjectsCount} projekt(ów) zapisanych tylko lokalnie.
                        </span>
                        <Button size="sm" onClick={handleBulkSync} variant="secondary" className="flex items-center gap-2">
                            <CloudUpload size={14} /> Synchronizuj do chmury
                        </Button>
                    </div>
                )}
                {savedProjects.length === 0 ? (
                    <p className="text-center text-slate-500 py-4">Brak zapisanych projektów.</p>
                ) : (
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {savedProjects.map((project) => (
                            <div key={project.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-semibold text-slate-800 dark:text-white">{project.name}</h4>
                                        <div className="flex items-center gap-1">
                                            {project.isLocal && <Monitor size={14} className="text-slate-400" title="Zapisano lokalnie" />}
                                            {project.isCloud && <Cloud size={14} className="text-blue-500" title="Zapisano w chmurze" />}
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {new Date(project.date).toLocaleString()}
                                    </p>
                                </div>
                                <div className="flex gap-2 items-center">
                                    {project.isLocal && !project.isCloud && (
                                        <button 
                                            onClick={() => handleSync(project.name)}
                                            className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                            title="Synchronizuj z chmurą"
                                        >
                                            <CloudUpload className="w-4 h-4" />
                                        </button>
                                    )}
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
