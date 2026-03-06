import React, { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import ChartDataLabels from 'chartjs-plugin-datalabels';

Chart.register(ChartDataLabels);

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
                    },
                    datalabels: {
                        color: '#fff',
                        font: {
                            weight: 'bold',
                            size: 14
                        },
                        formatter: (value, context) => {
                            const dataset = context.chart.data.datasets[0];
                            const total = dataset.data.reduce((acc: number, curr: any) => acc + curr, 0);
                            const percentage = ((value / total) * 100).toFixed(1) + '%';
                            return percentage;
                        },
                        textShadowBlur: 4,
                        textShadowColor: 'rgba(0,0,0,0.8)'
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