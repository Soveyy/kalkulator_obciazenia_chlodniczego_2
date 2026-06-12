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
