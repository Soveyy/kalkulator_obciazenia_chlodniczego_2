import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCalculator } from '../../contexts/CalculatorContext';

const RtsVisualizerModal: React.FC = () => {
    const { state, dispatch, theme } = useCalculator();
    const { isOpen, type } = state.modal;
    const isModalOpen = isOpen && type === 'rtsVisualizer';

    const [viewType, setViewType] = useState<'solar' | 'nonsolar'>('solar');
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    const handleClose = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });

    useEffect(() => {
        if (!isModalOpen || !chartRef.current || !state.allData) return;

        const ctx = chartRef.current.getContext('2d');
        if (!ctx) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }
        
        const { floorType, glassPercentage } = state.accumulation;
        let selectedGlassP: 10 | 50 | 90 = 50;
        if (glassPercentage <= 30) selectedGlassP = 10;
        else if (glassPercentage <= 70) selectedGlassP = 50;
        else selectedGlassP = 90;

        const thermalMassTypes: ('light' | 'medium' | 'heavy' | 'very_heavy')[] = ['light', 'medium', 'heavy', 'very_heavy'];
        const massLabels: { [key: string]: string } = {
            light: 'Lekka',
            medium: 'Średnia',
            heavy: 'Ciężka',
            very_heavy: 'Bardzo ciężka'
        };

        const colors = [
            '#3498db', // blue
            '#2ecc71', // green
            '#f1c40f', // yellow
            '#e74c3c'  // red
        ];

        const datasets = thermalMassTypes.map((mass, index) => {
            const data = state.allData?.rts?.[mass]?.[floorType]?.[selectedGlassP]?.[viewType] || [];
            return {
                label: `Masa ${massLabels[mass]}`,
                data: data,
                borderColor: colors[index],
                backgroundColor: `${colors[index]}33`,
                fill: false,
                tension: 0.2,
                borderWidth: 2
            };
        });

        const labels = Array.from({ length: 24 }, (_, i) => `${i}`);
        const isDarkMode = theme === 'dark';
        const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        const textColor = isDarkMode ? '#ecf0f1' : '#333';
        
        chartInstanceRef.current = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        title: { display: true, text: 'Godziny po wystąpieniu zysku ciepła', color: textColor, font: { size: 14 } },
                        ticks: { color: textColor },
                        grid: { color: gridColor }
                    },
                    y: {
                        title: { display: true, text: 'Współczynnik RTS', color: textColor, font: { size: 14 } },
                        ticks: { color: textColor, callback: (value: string | number) => typeof value === 'number' ? value.toFixed(2) : value },
                        grid: { color: gridColor },
                        beginAtZero: true
                    }
                },
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { color: textColor, font: { size: 12 } }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };

    }, [isModalOpen, viewType, theme, state.accumulation, state.allData]);

    const title = `Wizualizacja Krzywych RTS (${viewType === 'solar' ? 'Słoneczne' : 'Niesłoneczne'})`;
    const explanationText = `Wykres pokazuje, jak 1000 W radiacyjnego zysku ciepła (o godz. 0) jest rozkładane w czasie przez masę termiczną budynku. Wyższa wartość o godzinie 0 oznacza większe natychmiastowe obciążenie. Bardziej płaska i "rozciągnięta" krzywa świadczy o lepszej zdolności akumulacyjnej budynku, co skutkuje niższym, ale dłużej trwającym obciążeniem szczytowym.`;

    const footerContent = (
        <div className="w-full flex justify-between items-center">
             <Button 
                variant="secondary" 
                onClick={() => setViewType(prev => prev === 'solar' ? 'nonsolar' : 'solar')}
            >
                Przełącz na {viewType === 'solar' ? 'Niesłoneczne' : 'Słoneczne'}
            </Button>
            <Button onClick={handleClose}>Zamknij</Button>
        </div>
    );

    return (
        <Modal 
            isOpen={isModalOpen} 
            onClose={handleClose} 
            title={title}
            maxWidth="max-w-6xl"
            footer={footerContent}
        >
            <div className="h-[75vh] flex flex-col">
                <div className="flex-grow relative">
                    <canvas ref={chartRef}></canvas>
                </div>
                 <p className="text-xs text-slate-500 dark:text-slate-400 mt-4 text-center px-4">
                    {explanationText}
                </p>
            </div>
        </Modal>
    );
};

export default RtsVisualizerModal;