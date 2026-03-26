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
                const percentMatch = labelText.match(/\(([\d.]+)%\)/);
                
                if (percentMatch) {
                    const percent = parseFloat(percentMatch[1]);
                    if (percent > 4) {
                        const { x, y } = element.tooltipPosition();
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 18px Arial, sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                        ctx.shadowBlur = 4;
                        ctx.fillText(`${percent.toFixed(1)}%`, x, y);
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
            doc.text(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`, margin, pageHeight - 10);
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
    doc.text('Raport Sumaryczny Obciążenia Chłodniczego', pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Subtitle / Info - Centered
    doc.setFontSize(14);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text(`Projekt: ${projectName}`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;

    // Key metrics boxes (4x1 grid) - Taller and centered
    const boxWidth = (pageWidth - 2 * margin - 15) / 4;
    const boxHeight = 32;
    const gap = 5;
    
    const totalArea = aggregateData.roomProfiles.reduce((sum: number, r: any) => sum + (r.area || 0), 0);
    const aggregateDensity = totalArea > 0 ? aggregateData.aggregatePeak / totalArea : 0;
    const sumOfPeaksDensity = totalArea > 0 ? aggregateData.sumOfPeaks / totalArea : 0;

    // Box 1: Całkowite obciążenie
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(margin, yPos, boxWidth, boxHeight, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Obciążenie (Peak)', margin + boxWidth / 2, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(37, 99, 235); // blue-600
    const peakText = `${(aggregateData.aggregatePeak / 1000).toFixed(2)} kW`;
    doc.text(peakText, margin + boxWidth / 2, yPos + 17, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text(`(${aggregateDensity.toFixed(1)} W/m²)`, margin + boxWidth / 2, yPos + 26, { align: 'center' });
    
    // Box 2: Suma szczytów
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + boxWidth + gap, yPos, boxWidth, boxHeight, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text('Suma szczytów', margin + boxWidth + gap + boxWidth / 2, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(51, 65, 85); // slate-700
    const sumPeaksText = `${(aggregateData.sumOfPeaks / 1000).toFixed(2)} kW`;
    doc.text(sumPeaksText, margin + boxWidth + gap + boxWidth / 2, yPos + 17, { align: 'center' });
    
    doc.setFontSize(9);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text(`(${sumOfPeaksDensity.toFixed(1)} W/m²)`, margin + boxWidth + gap + boxWidth / 2, yPos + 26, { align: 'center' });

    // Box 3: Powierzchnia całkowita
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 2 * (boxWidth + gap), yPos, boxWidth, boxHeight, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Powierzchnia całkowita', margin + 2 * (boxWidth + gap) + boxWidth / 2, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(15, 118, 110); // teal-700
    doc.text(`${totalArea.toFixed(1)} m²`, margin + 2 * (boxWidth + gap) + boxWidth / 2, yPos + 17, { align: 'center' });

    // Box 4: Współczynnik jednoczesności
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(margin + 3 * (boxWidth + gap), yPos, boxWidth, boxHeight, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(100);
    doc.text('Wsp. jednoczesności', margin + 3 * (boxWidth + gap) + boxWidth / 2, yPos + 7, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(`${(aggregateData.diversityFactor * 100).toFixed(1)} %`, margin + 3 * (boxWidth + gap) + boxWidth / 2, yPos + 17, { align: 'center' });

    yPos += boxHeight + 12;

    // Aggregate Chart
    addHeader(`Sumaryczny profil obciążenia chłodniczego - ${MONTH_NAMES[month - 1].toUpperCase()}`);
    
    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    
    const datasets = [
        {
            label: 'Całkowite obciążenie (Suma)',
            data: reorderDataForLocalTime(aggregateData.hourlyTotal, offset).map(v => v / 1000),
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
                data: reorderDataForLocalTime(room.profile, offset).map(v => v / 1000),
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
                    labels: { font: { size: 16, family: 'Arial, sans-serif' }, padding: 20 }
                }
            },
            scales: {
                x: { ticks: { font: { size: 14, family: 'Arial, sans-serif' } } },
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Obciążenie [kW]', font: { size: 16, weight: 'bold', family: 'Arial, sans-serif' } },
                    ticks: { font: { size: 14, family: 'Arial, sans-serif' } }
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
    addHeader(`Zestawienie pomieszczeń (Miesiąc: ${MONTH_NAMES[month - 1]})`);
    
    const tableData = aggregateData.roomProfiles.map((room: any) => [
        room.name,
        `${(room.peak / 1000).toFixed(2)} kW`,
        `${(room.area || 0).toFixed(1)} m²`,
        `${(room.peak / (room.area || 1)).toFixed(1)} W/m²`,
        `${aggregateData.sumOfPeaks > 0 ? ((room.peak / aggregateData.sumOfPeaks) * 100).toFixed(1) : 0}%`
    ]);

    autoTable(doc, {
        startY: yPos,
        head: [['Pomieszczenie', 'Obciążenie [kW]', 'Pow. [m²]', 'Wskaźnik', 'Udział [%]']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
            fillColor: [59, 130, 246], 
            font: 'Roboto', 
            fontStyle: 'bold'
        },
        styles: { font: 'Roboto', fontSize: 9 },
        columnStyles: {
            0: { halign: 'left' },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' }
        },
        didParseCell: (data) => {
            // Force header alignment to match column alignment
            if (data.section === 'head') {
                if (data.column.index === 0) data.cell.styles.halign = 'left';
                else data.cell.styles.halign = 'right';
            }
        },
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

        doc.setFontSize(16);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(`Szczegóły: ${roomProfile.name}`, margin, yPos);
        yPos += 7;

        // Find individual worst month
        let worstMonthPeak = 0;
        let worstMonth = '7';
        
        let peaksToUse = roomState.monthlyPeaks;
        
        // If monthlyPeaks is missing (e.g. user used manual calculation option), calculate it now
        if (!peaksToUse || peaksToUse.length === 0) {
            if (state.allData) {
                const calc = calculateWorstMonth(
                    roomState.windows,
                    roomState.walls,
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
        const roomBoxHeight = 28;
        
        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, yPos, boxWidth2, roomBoxHeight, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('Roboto', 'normal');
        doc.text(`W analizowanym miesiącu (${MONTH_NAMES[month - 1]})`, margin + boxWidth2 / 2, yPos + 7, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(37, 99, 235);
        const roomPeakText = `${(roomProfile.peak / 1000).toFixed(2)} kW`;
        doc.text(roomPeakText, margin + boxWidth2 / 2, yPos + 16, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('Roboto', 'normal');
        doc.setTextColor(100);
        doc.text(`(${(roomProfile.peak / (roomProfile.area || 1)).toFixed(1)} W/m²)`, margin + boxWidth2 / 2, yPos + 23, { align: 'center' });

        doc.setFillColor(254, 242, 242); // red-50
        doc.roundedRect(margin + boxWidth2 + 5, yPos, boxWidth2, roomBoxHeight, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(100);
        doc.setFont('Roboto', 'normal');
        doc.text(`W najgorszym miesiącu (${MONTH_NAMES[parseInt(worstMonth, 10) - 1]})`, margin + boxWidth2 + 5 + boxWidth2 / 2, yPos + 7, { align: 'center' });
        doc.setFontSize(14);
        doc.setFont('Roboto', 'bold');
        doc.setTextColor(220, 38, 38); // red-600
        const worstPeakText = `${(worstMonthPeak / 1000).toFixed(2)} kW`;
        doc.text(worstPeakText, margin + boxWidth2 + 5 + boxWidth2 / 2, yPos + 16, { align: 'center' });
        
        doc.setFontSize(9);
        doc.setFont('Roboto', 'normal');
        doc.setTextColor(100);
        doc.text(`(${(worstMonthPeak / (roomProfile.area || 1)).toFixed(1)} W/m²)`, margin + boxWidth2 + 5 + boxWidth2 / 2, yPos + 23, { align: 'center' });

        yPos += roomBoxHeight + 12;

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
                    labels: pieChartValues.map(d => `${d.label} (${(d.val/totalForPie*100).toFixed(1)}%)`),
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
                            title: { display: true, text: 'Moc [kW]', font: { size: 18, family: 'Arial, sans-serif' } },
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
    
    const fileName = `Raport_Sumaryczny_${projectName.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
};
