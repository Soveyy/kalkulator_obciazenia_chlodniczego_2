import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import { MONTH_NAMES } from '../constants';
import { calculateWorstMonth } from './calculationService';

// Helper to fetch font as base64
async function fetchFont(url: string): Promise<string> {
    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

// Plugin do rysowania etykiet na wykresie kołowym
const pieLabelsPlugin = {
    id: 'pieLabels',
    afterDatasetsDraw(chart: any) {
        const { ctx, data } = chart;
        chart.data.datasets.forEach((dataset: any, i: number) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((element: any, index: number) => {
                const labelText = data.labels[index];
                const percentMatch = labelText.match(/\((\d+)%\)/);
                
                if (percentMatch) {
                    const percent = parseInt(percentMatch[1], 10);
                    if (percent > 4) {
                        const { x, y } = element.tooltipPosition();
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 18px Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                        ctx.shadowBlur = 4;
                        ctx.fillText(`${percent}%`, x, y);
                        ctx.shadowBlur = 0;
                    }
                }
            });
        });
    }
};

// Plugin do białego tła (wymagany dla JPEG)
const whiteBackgroundPlugin = {
    id: 'customCanvasBackgroundColor',
    beforeDraw: (chart: any, args: any, options: any) => {
        const { ctx } = chart;
        ctx.save();
        ctx.globalCompositeOperation = 'destination-over';
        ctx.fillStyle = options.color || '#ffffff';
        ctx.fillRect(0, 0, chart.width, chart.height);
        ctx.restore();
    }
};

// Funkcja pomocnicza do tworzenia obrazu wykresu
async function createTempChart(config: any, width: number, height: number): Promise<string> {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    
    const defaults = Chart.defaults;
    defaults.font.family = 'Arial, sans-serif';

    const chartConfig = {
        ...config,
        options: {
            ...config.options,
            animation: false,
            animations: { colors: false, x: false, y: false },
            transitions: { active: { animation: { duration: 0 } } },
            responsive: false,
            maintainAspectRatio: false,
            devicePixelRatio: 3, // Increased for better quality
            plugins: {
                ...config.options?.plugins,
                customCanvasBackgroundColor: {
                    color: '#ffffff', // Force white background
                }
            }
        },
        plugins: [...(config.plugins || []), whiteBackgroundPlugin]
    };

    const chart = new Chart(offscreenCanvas, chartConfig);
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Export as JPEG with 0.95 quality
    const dataUrl = chart.canvas.toDataURL('image/jpeg', 0.95);
    chart.destroy();
    return dataUrl;
}

export const generateAggregatePdfReport = async (state: any, aggregateData: any, currentMonth: string) => {
    const projectName = state.projectName || 'Projekt';

    if (!aggregateData || aggregateData.roomProfiles.length === 0) return;

    // Load Fonts
    const fontRegular = await fetchFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf');
    const fontBold = await fetchFont('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf');

    // Enable PDF compression
    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
    });
    
    // Register Fonts
    doc.addFileToVFS('Roboto-Regular.ttf', fontRegular);
    doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
    
    doc.addFileToVFS('Roboto-Bold.ttf', fontBold);
    doc.addFont('Roboto-Bold.ttf', 'Roboto', 'bold');

    // Set Default Font
    doc.setFont('Roboto', 'normal');

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    // --- Helpers ---
    const addHeader = (title: string) => {
        if (yPos > pageHeight - 40) {
            doc.addPage();
            yPos = margin;
        }
        doc.setFontSize(14);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(26, 86, 219); // Brand Blue
        doc.text(title, margin, yPos);
        yPos += 8;
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
        yPos += 5;
    };

    const addFooter = () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('Roboto', 'normal');
            doc.setTextColor(150);
            doc.text(`Strona ${i} z ${pageCount}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
            doc.text(`Raport Zbiorczy: ${new Date().toLocaleDateString('pl-PL')}`, margin, pageHeight - 10);
            doc.text(`Projekt: ${projectName || 'Bez nazwy'}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
        }
    };

    // --- Data Preparation ---
    const month = parseInt(currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;
    const timeZoneNotice = isSummerTime ? 'UTC+2' : 'UTC+1';

    // --- PAGE 1: Summary ---
    
    // Title
    doc.setFontSize(22);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('Raport Zbiorczy Obciążenia Chłodniczego', margin, yPos);
    yPos += 10;

    // Subtitle / Info
    doc.setFontSize(12);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text(`Projekt: ${projectName}`, margin, yPos);
    yPos += 6;
    doc.text(`Miesiąc analizy zbiorczej: ${MONTH_NAMES[month - 1]}`, margin, yPos);
    yPos += 6;
    doc.text(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`, margin, yPos);
    yPos += 12;

    addHeader('Podsumowanie Całkowite');

    // Key metrics boxes
    const boxWidth = (pageWidth - 2 * margin - 10) / 3;
    const boxHeight = 25;
    
    // Box 1
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Całkowite obciążenie (Peak)', margin + 5, yPos + 8);
    doc.setFontSize(16);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(37, 99, 235); // blue-600
    doc.text(`${Math.round(aggregateData.aggregatePeak)} W`, margin + 5, yPos + 18);
    
    // Box 2
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + boxWidth + 5, yPos, boxWidth, boxHeight, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text('Suma szczytów (niejednoczesna)', margin + boxWidth + 10, yPos + 8);
    doc.setFontSize(16);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(51, 65, 85); // slate-700
    doc.text(`${Math.round(aggregateData.sumOfPeaks)} W`, margin + boxWidth + 10, yPos + 18);

    // Box 3
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 2 * boxWidth + 10, yPos, boxWidth, boxHeight, 2, 2, 'F');
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text('Współczynnik jednoczesności', margin + 2 * boxWidth + 15, yPos + 8);
    doc.setFontSize(16);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(`${(aggregateData.diversityFactor * 100).toFixed(1)} %`, margin + 2 * boxWidth + 15, yPos + 18);

    yPos += boxHeight + 15;

    // Aggregate Chart
    addHeader('Zbiorczy profil obciążenia chłodniczego');
    
    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    
    const datasets = [
        {
            label: 'Całkowite obciążenie (Suma)',
            data: reorderDataForLocalTime(aggregateData.hourlyTotal, offset),
            borderColor: '#3b82f6',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            order: 1,
        },
        ...aggregateData.roomProfiles.map((room: any, index: number) => {
            const colors = [
                '#f87171', // red-400
                '#34d399', // emerald-400
                '#fbbf24', // amber-400
                '#a78bfa', // violet-400
                '#06b6d4', // cyan-400
                '#f97316', // orange-400
                '#ec4899', // pink-400
                '#14b8a6', // teal-400
                '#6366f1', // indigo-400
                '#d946ef', // fuchsia-400
            ];
            return {
                label: room.name,
                data: reorderDataForLocalTime(room.profile, offset),
                borderColor: colors[index % colors.length],
                backgroundColor: 'transparent',
                borderWidth: 2,
                borderDash: [5, 5],
                tension: 0.4,
                order: 2,
            };
        })
    ];

    const lineChartDataUrl = await createTempChart({
        type: 'line',
        data: { labels, datasets },
        options: {
            plugins: {
                legend: {
                    position: 'top',
                    labels: { font: { size: 14, family: 'Arial, sans-serif' }, padding: 20 }
                }
            },
            scales: {
                x: { ticks: { font: { size: 12, family: 'Arial, sans-serif' } } },
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Obciążenie [W]', font: { size: 14, weight: 'bold', family: 'Arial, sans-serif' } },
                    ticks: { font: { size: 12, family: 'Arial, sans-serif' } }
                }
            }
        }
    }, 1200, 600);

    doc.addImage(lineChartDataUrl, 'JPEG', margin, yPos, pageWidth - 2 * margin, 90);
    yPos += 95;
    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(150);
    doc.text(`Czas: lokalny (${timeZoneNotice})`, margin, yPos);
    yPos += 15;

    // Table of rooms
    addHeader('Zestawienie pomieszczeń (Miesiąc zbiorczy)');
    
    const tableData = aggregateData.roomProfiles.map((room: any) => [
        room.name,
        `${Math.round(room.peak)} W`,
        `${aggregateData.sumOfPeaks > 0 ? ((room.peak / aggregateData.sumOfPeaks) * 100).toFixed(1) : 0}%`
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Pomieszczenie', 'Szczytowe obciążenie', 'Udział w sumie szczytów']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246], font: 'Roboto', fontStyle: 'bold' },
        styles: { font: 'Roboto', fontSize: 10 },
        margin: { left: margin, right: margin }
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // --- PAGE 2+: Room Breakdown ---
    
    for (const roomProfile of aggregateData.roomProfiles) {
        // Find the full room object in state
        const roomState = state.rooms.find((r: any) => r.id === roomProfile.id);
        if (!roomState) continue;

        // Add new page for each room
        doc.addPage();
        yPos = margin;

        doc.setFontSize(18);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Szczegóły: ${roomProfile.name}`, margin, yPos);
        yPos += 10;

        // Find individual worst month
        let worstMonthPeak = 0;
        let worstMonth = '7';
        
        let peaksToUse = roomState.monthlyPeaks;
        
        // If monthlyPeaks is missing (e.g. user used manual calculation option), calculate it now
        if (!peaksToUse || peaksToUse.length === 0) {
            if (state.allData) {
                const calc = calculateWorstMonth(
                    roomState.windows,
                    state.allData,
                    roomState.input,
                    roomState.accumulation,
                    roomState.internalGains,
                    !state.isShadingViewActive
                );
                peaksToUse = calc.monthlyPeaks;
            }
        }

        if (peaksToUse && peaksToUse.length > 0) {
            const maxPeakObj = peaksToUse.reduce((prev: any, current: any) => (prev.peak > current.peak) ? prev : current);
            worstMonthPeak = maxPeakObj.peak;
            worstMonth = maxPeakObj.month;
        }

        // Compare aggregate month peak vs individual worst month peak
        const boxWidth2 = (pageWidth - 2 * margin - 5) / 2;
        
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, yPos, boxWidth2, boxHeight, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont('Roboto', 'normal');
        doc.text(`W analizowanym miesiącu (${MONTH_NAMES[month - 1]})`, margin + 5, yPos + 8);
        doc.setFontSize(16);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(37, 99, 235);
        doc.text(`${Math.round(roomProfile.peak)} W`, margin + 5, yPos + 18);

        doc.setFillColor(254, 242, 242); // red-50
        doc.roundedRect(margin + boxWidth2 + 5, yPos, boxWidth2, boxHeight, 2, 2, 'F');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.setFont('Roboto', 'normal');
        doc.text(`W najgorszym miesiącu (${MONTH_NAMES[parseInt(worstMonth, 10) - 1]})`, margin + boxWidth2 + 10, yPos + 8);
        doc.setFontSize(16);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(220, 38, 38); // red-600
        doc.text(`${Math.round(worstMonthPeak)} W`, margin + boxWidth2 + 10, yPos + 18);

        yPos += boxHeight + 15;

        // We need the components at the peak hour of the *aggregate month* for this room
        // roomState.activeResults contains the results for the aggregate month (because RECALCULATE_ALL_ROOMS was called)
        if (roomState.activeResults) {
            const finalGains = roomState.activeResults.finalGains;
            const loadComponents = roomState.activeResults.loadComponents;
            
            const maxTotalCS = Math.max(...finalGains.clearSky.total);
            
            // Find all hours where the room reaches its peak
            const peakIndices = finalGains.clearSky.total.reduce((acc: number[], val: number, idx: number) => {
                if (Math.abs(val - maxTotalCS) < 0.1) acc.push(idx);
                return acc;
            }, []);
            
            // If there's a tie (common for rooms without windows), pick the hour closest to the aggregate peak hour
            const aggregatePeakHourUTC = aggregateData.peakHour;
            const hourTotalCS_UTC = peakIndices.length > 0 
                ? peakIndices.reduce((prev, curr) => 
                    Math.abs(curr - aggregatePeakHourUTC) < Math.abs(prev - aggregatePeakHourUTC) ? curr : prev
                  )
                : finalGains.clearSky.total.indexOf(maxTotalCS);

            const hourTotalCS_Local = (hourTotalCS_UTC + offset) % 24;

            const solarLoadPeak = loadComponents.solar[hourTotalCS_UTC] || 0;
            const conductionLoadPeak = loadComponents.conduction[hourTotalCS_UTC] || 0;
            const internalSensibleLoadPeak = loadComponents.internalSensible[hourTotalCS_UTC] || 0;
            const ventilationSensibleLoadPeak = loadComponents.ventilationSensible[hourTotalCS_UTC] || 0;
            const infiltrationSensibleLoadPeak = loadComponents.infiltrationSensible[hourTotalCS_UTC] || 0;
            
            const internalLatentAtPeak = roomState.activeResults.components.internalGainsLatent[hourTotalCS_UTC] || 0;
            const ventilationLatentAtPeak = roomState.activeResults.ventilationLoad.latent[hourTotalCS_UTC] || 0;
            const infiltrationLatentAtPeak = roomState.activeResults.infiltrationLoad.latent[hourTotalCS_UTC] || 0;

            const sensibleAtPeak = finalGains.clearSky.sensible[hourTotalCS_UTC] || 0;
            const latentAtPeak = finalGains.clearSky.latent[hourTotalCS_UTC] || 0;

            addHeader(`Struktura obciążenia w miesiącu zbiorczym (godz. ${String(hourTotalCS_Local).padStart(2, '0')}:00)`);

            const pieChartValues = [
                { label: 'Słoneczne', val: solarLoadPeak, color: '#f59e0b' },
                { label: 'Przewodzenie', val: conductionLoadPeak, color: '#f97316' },
                { label: 'Wewn. Jawne', val: internalSensibleLoadPeak, color: '#ef4444' },
                { label: 'Wentylacja', val: ventilationSensibleLoadPeak, color: '#a855f7' },
                { label: 'Infiltracja', val: infiltrationSensibleLoadPeak, color: '#10b981' },
                { label: 'Utajone', val: latentAtPeak, color: '#3b82f6' }
            ].filter(item => item.val > 0);

            const totalForPie = pieChartValues.reduce((acc, curr) => acc + curr.val, 0);

            const pieChartDataUrl = await createTempChart({
                type: 'pie',
                data: {
                    labels: pieChartValues.map(d => `${d.label} (${Math.round(d.val/totalForPie*100)}%)`),
                    datasets: [{
                        data: pieChartValues.map(d => d.val),
                        backgroundColor: pieChartValues.map(d => d.color),
                        borderColor: '#ffffff',
                        borderWidth: 2
                    }]
                },
                options: {
                    layout: { padding: 20 },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'bottom',
                            labels: { font: { size: 18, family: 'Arial, sans-serif' }, padding: 20 }
                        }
                    }
                },
                plugins: [pieLabelsPlugin]
            }, 1000, 1000);

            const pieSize = 100;
            const xOffsetPie = (pageWidth - pieSize) / 2;
            doc.addImage(pieChartDataUrl, 'JPEG', xOffsetPie, yPos, pieSize, pieSize);
            yPos += pieSize + 15;

            // Bar chart for components over 24h
            addHeader('Składowe obciążenia w ciągu doby');
            
            const barChartDataUrl = await createTempChart({
                type: 'bar',
                data: {
                    labels,
                    datasets: [
                        { label: 'Słoneczne', data: reorderDataForLocalTime(loadComponents.solar, offset), backgroundColor: '#f59e0b', stack: 'a' },
                        { label: 'Przewodzenie', data: reorderDataForLocalTime(loadComponents.conduction, offset), backgroundColor: '#f97316', stack: 'a' },
                        { label: 'Wewn. Jawne', data: reorderDataForLocalTime(loadComponents.internalSensible, offset), backgroundColor: '#ef4444', stack: 'a' },
                        { label: 'Wentylacja', data: reorderDataForLocalTime(loadComponents.ventilationSensible, offset), backgroundColor: '#a855f7', stack: 'a' },
                        { label: 'Infiltracja', data: reorderDataForLocalTime(loadComponents.infiltrationSensible, offset), backgroundColor: '#10b981', stack: 'a' },
                        { label: 'Utajone', data: reorderDataForLocalTime(finalGains.clearSky.latent, offset), backgroundColor: '#3b82f6', stack: 'a' }
                    ]
                },
                options: {
                    layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
                    scales: {
                        y: { 
                            stacked: true,
                            beginAtZero: true,
                            title: { display: true, text: 'Moc [W]', font: { size: 18, family: 'Arial, sans-serif' } },
                            ticks: { font: { size: 16, family: 'Arial, sans-serif' } }
                        },
                        x: {
                            stacked: true,
                            ticks: { font: { size: 14, family: 'Arial, sans-serif' }, maxRotation: 45 }
                        }
                    },
                    plugins: { 
                        legend: { labels: { font: { size: 14, family: 'Arial, sans-serif' } } }
                    }
                }
            }, 1200, 500);

            doc.addImage(barChartDataUrl, 'JPEG', margin, yPos, pageWidth - 2 * margin, 75);
            yPos += 80;
        }
    }

    addFooter();
    
    const fileName = `Raport_Zbiorczy_${projectName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};
