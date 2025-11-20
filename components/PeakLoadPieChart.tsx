import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface PeakLoadPieChartProps {
    data: {
        labels: string[];
        datasets: {
            data: number[];
            backgroundColor: string[];
        }[];
    };
    onRender: (canvas: HTMLCanvasElement) => void;
}

const PeakLoadPieChart: React.FC<PeakLoadPieChartProps> = ({ data, onRender }) => {
    const chartRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!chartRef.current) return;

        const chart = new Chart(chartRef.current, {
            type: 'pie',
            data: data,
            options: {
                responsive: false, // Important for off-screen rendering
                animation: {
                    duration: 0 // Disable animation for instant rendering
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Udział składowych w szczytowym obciążeniu jawnym',
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'right'
                    }
                }
            }
        });
        
        // Use a timeout to ensure the chart has fully rendered before capturing
        const timer = setTimeout(() => {
             if (chartRef.current) {
                onRender(chartRef.current);
             }
             chart.destroy();
        }, 500); // Small delay to ensure render is complete

        return () => {
            clearTimeout(timer);
            if(chart) {
                chart.destroy();
            }
        };
    }, [data, onRender]);

    return (
        <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
            <canvas ref={chartRef} width="800" height="400"></canvas>
        </div>
    );
};

export default PeakLoadPieChart;