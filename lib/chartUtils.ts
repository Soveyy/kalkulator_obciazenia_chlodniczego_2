import Chart from 'chart.js/auto';

export const CHART_COLORS = {
    solar: 'rgba(234, 179, 8, 0.8)', // yellow-500
    conduction: 'rgba(234, 88, 12, 0.8)', // orange-600
    internal: 'rgba(239, 68, 68, 0.8)', // red-500
    people: 'rgba(244, 63, 94, 0.8)', // rose-500
    lighting: 'rgba(132, 204, 22, 0.8)', // lime-500
    equipment: 'rgba(168, 85, 247, 0.8)', // purple-500
    ventilation: 'rgba(59, 130, 246, 0.8)', // blue-500
    infiltration: 'rgba(6, 182, 212, 0.8)', // cyan-500
    
    // Fallbacks / aggregates
    totalSensible: 'rgba(239, 68, 68, 0.8)', // red-500
    totalLatent: 'rgba(14, 165, 233, 0.8)', // sky-500
};

export const createHatchPattern = (color: string) => {
    if (typeof document === 'undefined') return color;
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    const ctx = canvas.getContext('2d');
    if (!ctx) return color;
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.lineTo(8, 0);
    ctx.moveTo(-4, 4);
    ctx.lineTo(4, -4);
    ctx.moveTo(4, 12);
    ctx.lineTo(12, 4);
    ctx.stroke();
    
    return ctx.createPattern(canvas, 'repeat') || color;
};

export const getChartColor = (category: keyof typeof CHART_COLORS, isLatent: boolean = false) => {
    const baseColor = CHART_COLORS[category] || CHART_COLORS.solar;
    if (isLatent) {
        return createHatchPattern(baseColor);
    }
    return baseColor;
};

export function updateChartSmoothly(chartInstance: Chart | null, newConfig: any) {
    if (!chartInstance) return;

    if (newConfig.data && newConfig.data.labels) {
        chartInstance.data.labels = newConfig.data.labels;
    }

    const currentDatasets = chartInstance.data.datasets || [];
    const newDatasets = newConfig.data?.datasets || [];

    if (currentDatasets.length === newDatasets.length) {
        for (let i = 0; i < currentDatasets.length; i++) {
            const currentDataset = currentDatasets[i] as any;
            const newDataset = newDatasets[i];

            currentDataset.data = newDataset.data;
            
            if (newDataset.label !== undefined) currentDataset.label = newDataset.label;
            if (newDataset.backgroundColor !== undefined) currentDataset.backgroundColor = newDataset.backgroundColor;
            if (newDataset.borderColor !== undefined) currentDataset.borderColor = newDataset.borderColor;
            if (newDataset.borderWidth !== undefined) currentDataset.borderWidth = newDataset.borderWidth;
            if (newDataset.borderDash !== undefined) currentDataset.borderDash = newDataset.borderDash;
            if (newDataset.fill !== undefined) currentDataset.fill = newDataset.fill;
            if (newDataset.tension !== undefined) currentDataset.tension = newDataset.tension;
            if (newDataset.stack !== undefined) currentDataset.stack = newDataset.stack;
            if (newDataset.type !== undefined) currentDataset.type = newDataset.type;
            if (newDataset._meta !== undefined) (currentDataset as any)._meta = newDataset._meta;
        }
    } else {
        const datasetMap = new Map(currentDatasets.map(d => [d.label, d]));
        const mergedDatasets = newDatasets.map((newDataset: any) => {
            const existing = datasetMap.get(newDataset.label);
            if (existing) {
                existing.data = newDataset.data;
                if (newDataset.backgroundColor !== undefined) existing.backgroundColor = newDataset.backgroundColor;
                if (newDataset.borderColor !== undefined) existing.borderColor = newDataset.borderColor;
                if (newDataset.stack !== undefined) existing.stack = newDataset.stack;
                if (newDataset.type !== undefined) existing.type = newDataset.type;
                return existing;
            }
            return newDataset;
        });
        chartInstance.data.datasets = mergedDatasets;
    }

    if (newConfig.options) {
        chartInstance.options = {
            ...chartInstance.options,
            ...newConfig.options,
            scales: {
                ...chartInstance.options.scales,
                ...newConfig.options.scales
            },
            plugins: {
                ...chartInstance.options.plugins,
                ...newConfig.options.plugins
            }
        };
    }

    chartInstance.update();
}
