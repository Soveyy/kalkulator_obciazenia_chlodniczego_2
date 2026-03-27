import React, { useState, useRef, useEffect } from 'react';
import { useCalculator } from '../../contexts/CalculatorContext';
import { PlusIcon, XIcon, DocumentDuplicateIcon, PencilIcon, CheckIcon } from '../Icons';
import Tooltip from './Tooltip';

const RoomTabs: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (editingRoomId && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editingRoomId]);

    const handleAddRoom = () => {
        if (state.rooms.length < 6) {
            dispatch({ type: 'ADD_ROOM' });
        } else {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Maksymalna liczba pomieszczeń to 6.', type: 'danger' } });
        }
    };

    const handleSwitchRoom = (id: string) => {
        dispatch({ type: 'SWITCH_ROOM', payload: id });
    };

    const handleDeleteRoom = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.rooms.length > 1) {
            dispatch({ type: 'DELETE_ROOM', payload: id });
        }
    };

    const handleDuplicateRoom = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (state.rooms.length < 6) {
            dispatch({ type: 'DUPLICATE_ROOM', payload: id });
        } else {
            dispatch({ type: 'ADD_TOAST', payload: { message: 'Maksymalna liczba pomieszczeń to 6.', type: 'danger' } });
        }
    };

    const startEditing = (id: string, name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setEditingRoomId(id);
        setEditName(name);
    };

    const saveEdit = () => {
        if (editingRoomId && editName.trim()) {
            dispatch({ type: 'UPDATE_ROOM_NAME', payload: { id: editingRoomId, name: editName.trim() } });
        }
        setEditingRoomId(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            saveEdit();
        } else if (e.key === 'Escape') {
            setEditingRoomId(null);
        }
    };

    return (
        <div id="room-tabs-container" className="mb-0 flex flex-nowrap overflow-x-auto overflow-y-hidden scrollbar-hide gap-2 items-center border-b border-slate-200 dark:border-slate-700 pb-0">
            {state.rooms.map(room => (
                <div
                    key={room.id}
                    onClick={() => handleSwitchRoom(room.id)}
                    className={`
                        relative group flex items-center gap-2 px-4 py-2 rounded-t-lg cursor-pointer transition-all border-b-2 flex-shrink-0
                        ${state.activeRoomId === room.id 
                            ? 'bg-white dark:bg-slate-800 border-blue-500 text-blue-600 dark:text-blue-400 font-semibold' 
                            : 'bg-slate-50 dark:bg-slate-800/50 border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}
                    `}
                >
                    {editingRoomId === room.id ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                                ref={inputRef}
                                type="text"
                                value={editName}
                                onChange={e => setEditName(e.target.value)}
                                onBlur={saveEdit}
                                onKeyDown={handleKeyDown}
                                className="px-2 py-0.5 text-sm border rounded border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white w-24 sm:w-32"
                            />
                            <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-100 rounded dark:hover:bg-green-900/30">
                                <CheckIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <span className="text-sm truncate max-w-[80px] sm:max-w-[120px] md:max-w-[150px]">{room.name}</span>
                            <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${state.activeRoomId === room.id ? 'opacity-100' : ''}`}>
                                <button 
                                    onClick={(e) => startEditing(room.id, room.name, e)}
                                    className="p-1 text-slate-400 hover:text-blue-500 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                                    title="Zmień nazwę"
                                >
                                    <PencilIcon className="w-3.5 h-3.5" />
                                </button>
                                {state.rooms.length < 6 && (
                                    <button 
                                        onClick={(e) => handleDuplicateRoom(room.id, e)}
                                        className="p-1 text-slate-400 hover:text-green-500 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                                        title="Duplikuj"
                                    >
                                        <DocumentDuplicateIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                                {state.rooms.length > 1 && (
                                    <button 
                                        onClick={(e) => handleDeleteRoom(room.id, e)}
                                        className="p-1 text-slate-400 hover:text-red-500 rounded hover:bg-slate-200 dark:hover:bg-slate-600"
                                        title="Usuń"
                                    >
                                        <XIcon className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            ))}

            {state.rooms.length < 6 && (
                <Tooltip text="Dodaj nowe pomieszczenie (max 6)" position="top">
                    <button
                        onClick={handleAddRoom}
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-slate-700 transition-colors"
                    >
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </Tooltip>
            )}

            {state.rooms.length > 1 && (
                <div className="ml-auto flex-shrink-0">
                    <button
                        onClick={() => handleSwitchRoom('aggregate')}
                        className={`
                            px-4 py-2 rounded-lg cursor-pointer transition-all border-2 text-sm font-bold
                            ${state.activeRoomId === 'aggregate'
                                ? 'bg-indigo-100 dark:bg-indigo-900/50 border-indigo-700 dark:border-indigo-400 text-indigo-800 dark:text-indigo-200 shadow-md'
                                : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-600 dark:border-indigo-500 text-indigo-700 dark:text-indigo-300 animate-breathe hover:bg-indigo-100 dark:hover:bg-indigo-900/40'}
                        `}
                    >
                        Analiza Zbiorcza
                    </button>
                </div>
            )}
        </div>
    );
};

export default RoomTabs;
