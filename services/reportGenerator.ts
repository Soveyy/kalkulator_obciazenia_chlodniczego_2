
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import { MONTH_NAMES } from '../constants';

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
                        ctx.font = 'bold 12px Arial, sans-serif';
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
            devicePixelRatio: 2, // Keep retina quality
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
    
    // Export as JPEG with 0.75 quality (significantly smaller than PNG)
    const dataUrl = chart.canvas.toDataURL('image/jpeg', 0.75);
    chart.destroy();
    return dataUrl;
}

export const generatePdfReport = async (state: any) => {
    const { input, activeResults, currentMonth } = state;
    if (!activeResults) return;

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
            doc.text(`Raport wygenerowany: ${new Date().toLocaleDateString('pl-PL')}`, margin, pageHeight - 10);
        }
    };

    // --- Data Preparation ---
    const { finalGains, loadComponents } = activeResults;
    const month = parseInt(currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;
    const timeZoneNotice = isSummerTime ? 'UTC+2' : 'UTC+1';

    // Find peaks
    const maxTotalCS = Math.max(...finalGains.clearSky.total);
    const hourTotalCS_UTC = finalGains.clearSky.total.indexOf(maxTotalCS);
    const hourTotalCS_Local = (hourTotalCS_UTC + offset) % 24;

    const sensibleAtPeak = finalGains.clearSky.sensible[hourTotalCS_UTC] || 0;
    const latentAtPeak = finalGains.clearSky.latent[hourTotalCS_UTC] || 0;
    
    // Components at peak
    const solarLoadPeak = loadComponents.solar[hourTotalCS_UTC] || 0;
    const conductionLoadPeak = loadComponents.conduction[hourTotalCS_UTC] || 0;
    const internalSensibleLoadPeak = loadComponents.internalSensible[hourTotalCS_UTC] || 0;
    const ventilationSensibleLoadPeak = loadComponents.ventilationSensible[hourTotalCS_UTC] || 0;
    
    const internalLatentAtPeak = state.activeResults.components.internalGainsLatent[hourTotalCS_UTC] || 0;
    const ventilationLatentAtPeak = state.activeResults.ventilationLoad.latent[hourTotalCS_UTC] || 0;
    
    // Daily energy estimation
    const totalKWhCS = finalGains.clearSky.total.reduce((sum: number, val: number) => sum + Math.max(0, val), 0) / 1000;
    const totalKWhGlobal = finalGains.global.total.reduce((sum: number, val: number) => sum + Math.max(0, val), 0) / 1000;


    // --- PAGE 1 ---
    
    // Main Title
    doc.setFontSize(24);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(30);
    doc.text('Raport Obciążenia Chłodniczego', pageWidth / 2, yPos + 10, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.setFont('Roboto', 'normal');
    doc.text(`Projekt: ${input.projectName || 'Bez nazwy'}`, pageWidth / 2, yPos + 22, { align: 'center' });
    
    yPos += 40;

    // 1. Parameters Table
    addHeader('1. Parametry Projektowe');
    
    const params = [
        ['Miesiąc obliczeniowy', MONTH_NAMES[parseInt(currentMonth, 10) - 1]],
        ['Temperatura wewnętrzna', `${input.tInternal} °C`],
        ['Wilgotność wewnętrzna', `${input.rhInternal} %`],
        ['Temperatura zewnętrzna (projektowa)', `${input.tExternal} °C`],
        ['Powierzchnia pomieszczenia', `${input.roomArea} m²`],
    ];
    
    autoTable(doc, {
        startY: yPos,
        head: [['Parametr', 'Wartość']],
        body: params,
        theme: 'grid',
        headStyles: { fillColor: [241, 245, 249], textColor: 50, fontStyle: 'bold', lineColor: 200, font: 'Roboto' },
        bodyStyles: { textColor: 50, font: 'Roboto' },
        styles: { fontSize: 10, cellPadding: 3, font: 'Roboto' },
        margin: { left: margin, right: margin }
    });
    yPos = (doc as any).lastAutoTable.finalY + 15;

    // 2. Peak Load Results
    addHeader('2. Wyniki - Szczytowe Obciążenie (Clear Sky)');
    
    // Highlight Box
    doc.setFillColor(254, 242, 242); // Light red/orange bg
    doc.setDrawColor(252, 165, 165); // Red border
    doc.roundedRect(margin, yPos, pageWidth - (2 * margin), 35, 3, 3, 'FD');
    
    doc.setFontSize(11);
    doc.setTextColor(153, 27, 27);
    doc.text('Maksymalne Całkowite Obciążenie Chłodnicze:', pageWidth / 2, yPos + 8, { align: 'center' });
    
    doc.setFontSize(30);
    doc.setFont('Roboto', 'bold');
    doc.setTextColor(220, 38, 38); // Strong Red
    doc.text(`${maxTotalCS.toFixed(0)} W`, pageWidth / 2, yPos + 22, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(120);
    doc.text(`Występuje o godzinie: ${String(hourTotalCS_Local).padStart(2, '0')}:00 (${timeZoneNotice})`, pageWidth / 2, yPos + 30, { align: 'center' });
    
    yPos += 45;

    // Detailed Tables
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text('Szczegółowy bilans mocy w godzinie szczytu:', margin, yPos);
    yPos += 6;

    const sensibleBody = [
        ['Słoneczne (okna)', `${solarLoadPeak.toFixed(0)} W`],
        ['Przewodzenie (okna)', `${conductionLoadPeak.toFixed(0)} W`],
        ['Wewnętrzne (ludzie, sprzęt)', `${internalSensibleLoadPeak.toFixed(0)} W`],
        ['Wentylacja mechaniczna', `${ventilationSensibleLoadPeak.toFixed(0)} W`],
    ];

    const latentBody = [
        ['Wewnętrzne (ludzie)', `${internalLatentAtPeak.toFixed(0)} W`],
        ['Wentylacja mechaniczna', `${ventilationLatentAtPeak.toFixed(0)} W`],
    ];

    // Left Table (Sensible)
    autoTable(doc, {
        startY: yPos,
        head: [[`Zyski Jawne (Razem: ${sensibleAtPeak.toFixed(0)} W)`, '']],
        body: sensibleBody,
        theme: 'plain',
        headStyles: { fillColor: [255, 237, 213], textColor: [194, 65, 12], fontStyle: 'bold', font: 'Roboto' },
        bodyStyles: { textColor: 20, fontSize: 9, font: 'Roboto' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' } },
        margin: { left: margin, right: pageWidth / 2 + 5 },
        tableWidth: (pageWidth - 2 * margin) / 2 - 5,
        tableLineColor: 200,
        tableLineWidth: 0.1,
        styles: { font: 'Roboto' }
    });

    const finalY1 = (doc as any).lastAutoTable.finalY;

    // Right Table (Latent)
    autoTable(doc, {
        startY: yPos,
        head: [[`Zyski Utajone (Razem: ${latentAtPeak.toFixed(0)} W)`, '']],
        body: latentBody,
        theme: 'plain',
        headStyles: { fillColor: [219, 234, 254], textColor: [30, 64, 175], fontStyle: 'bold', font: 'Roboto' },
        bodyStyles: { textColor: 20, fontSize: 9, font: 'Roboto' },
        columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 25, halign: 'right', fontStyle: 'bold' } },
        margin: { left: pageWidth / 2 + 5, right: margin },
        tableWidth: (pageWidth - 2 * margin) / 2 - 5,
        tableLineColor: 200,
        tableLineWidth: 0.1,
        styles: { font: 'Roboto' }
    });

    const finalY2 = (doc as any).lastAutoTable.finalY;
    yPos = Math.max(finalY1, finalY2) + 15;

    // Energy Estimation
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, yPos, pageWidth - 2*margin, 25, 2, 2, 'FD');
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont('Roboto', 'bold');
    doc.text('Szacunkowe dobowe zużycie energii chłodniczej:', margin + 5, yPos + 7);
    
    doc.setFontSize(10);
    doc.setFont('Roboto', 'normal');
    doc.setTextColor(50);
    doc.text(`- Warunki projektowe (bezchmurne niebo, najgorszy możliwy przypadek): ${totalKWhCS.toFixed(1)} kWh`, margin + 5, yPos + 14);
    doc.text(`- Warunki typowe (uśrednione zachmurzenie): ${totalKWhGlobal.toFixed(1)} kWh`, margin + 5, yPos + 20);


    // --- PAGE 2: Pie Chart ---
    doc.addPage();
    yPos = margin;
    
    addHeader('3. Struktura Zysków Ciepła');
    
    // Prepare Pie Data
    const pieChartValues = [
        { label: 'Słoneczne', val: solarLoadPeak, color: '#f59e0b' },
        { label: 'Przewodzenie', val: conductionLoadPeak, color: '#f97316' },
        { label: 'Wewn. Jawne', val: internalSensibleLoadPeak, color: '#ef4444' },
        { label: 'Wentylacja Jawna', val: ventilationSensibleLoadPeak, color: '#a855f7' },
        { label: 'Utajone', val: latentAtPeak, color: '#3b82f6' }
    ].filter(item => item.val > 0);

    const totalVal = pieChartValues.reduce((acc, curr) => acc + curr.val, 0);

    const pieChartData = {
        labels: pieChartValues.map(d => `${d.label} (${Math.round(d.val/totalVal*100)}%)`),
        datasets: [{
            data: pieChartValues.map(d => d.val),
            backgroundColor: pieChartValues.map(d => d.color),
            borderColor: '#ffffff',
            borderWidth: 2,
        }]
    };
    
    // Generate Pie Chart Image with Labels (JPEG for smaller size)
    const pieChartImg = await createTempChart({
        type: 'pie',
        data: pieChartData,
        options: {
            layout: { padding: 20 },
            plugins: {
                legend: { 
                    display: true, 
                    position: 'bottom',
                    labels: { font: { size: 14, family: 'Arial' }, padding: 20 }
                },
                title: { 
                    display: true, 
                    text: 'Składowe obciążenia w szczycie', 
                    font: { size: 18, family: 'Arial' },
                    padding: { bottom: 10 }
                }
            }
        },
        plugins: [pieLabelsPlugin]
    }, 800, 800);

    const pieSize = 160; 
    const xOffsetPie = (pageWidth - pieSize) / 2;
    doc.addImage(pieChartImg, 'JPEG', xOffsetPie, yPos, pieSize, pieSize);
    yPos += pieSize + 15;


    // --- PAGE 3: Daily Charts ---
    doc.addPage();
    yPos = margin;
    addHeader('4. Przebieg Dobowy Obciążenia');

    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    // 1. Line Chart
    const lineChartImg = await createTempChart({
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                { 
                    label: 'Obciążenie Chłodnicze [W]', 
                    data: reorderDataForLocalTime(finalGains.clearSky.total, offset), 
                    borderColor: '#ef4444', 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    fill: true, 
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.3
                },
                { 
                    label: 'Temp. Zewnętrzna [°C]', 
                    data: reorderDataForLocalTime(state.tExtProfile, offset), 
                    borderColor: '#94a3b8', 
                    borderWidth: 2,
                    borderDash: [5, 5], 
                    pointRadius: 0,
                    tension: 0.3,
                    yAxisID: 'yTemp' 
                }
            ]
        },
        options: {
            layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
            scales: {
                y: { 
                    beginAtZero: true,
                    title: { display: true, text: 'Moc [W]', font: { size: 14, family: 'Arial' } },
                    ticks: { font: { size: 12, family: 'Arial' } }
                },
                yTemp: { 
                    position: 'right', 
                    grid: { display: false }, 
                    title: { display: true, text: 'Temp [°C]', font: { size: 14, family: 'Arial' } },
                    ticks: { font: { size: 12, family: 'Arial' } }
                },
                x: {
                    ticks: { font: { size: 10, family: 'Arial' }, maxRotation: 45 }
                }
            },
            plugins: { 
                legend: { labels: { font: { size: 12, family: 'Arial' } } },
                title: { display: true, text: 'Całkowite obciążenie w czasie', font: { size: 16, family: 'Arial' } }
            }
        },
    }, 1000, 400);

    doc.addImage(lineChartImg, 'JPEG', margin, yPos, pageWidth - 2*margin, 70);
    yPos += 80;

    // 2. Bar Chart (Stacked Components)
    const barChartImg = await createTempChart({
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                { label: 'Słoneczne', data: reorderDataForLocalTime(loadComponents.solar, offset), backgroundColor: '#f59e0b', stack: 'a' },
                { label: 'Przewodzenie', data: reorderDataForLocalTime(loadComponents.conduction, offset), backgroundColor: '#f97316', stack: 'a' },
                { label: 'Wewn. Jawne', data: reorderDataForLocalTime(loadComponents.internalSensible, offset), backgroundColor: '#ef4444', stack: 'a' },
                { label: 'Went. Jawna', data: reorderDataForLocalTime(loadComponents.ventilationSensible, offset), backgroundColor: '#a855f7', stack: 'a' },
                { label: 'Utajone', data: reorderDataForLocalTime(finalGains.clearSky.latent, offset), backgroundColor: '#3b82f6', stack: 'a' }
            ]
        },
        options: {
            layout: { padding: { left: 10, right: 10, top: 10, bottom: 10 } },
            scales: {
                y: { 
                    stacked: true,
                    beginAtZero: true,
                    title: { display: true, text: 'Moc [W]', font: { size: 14, family: 'Arial' } },
                    ticks: { font: { size: 12, family: 'Arial' } }
                },
                x: {
                    stacked: true,
                    ticks: { font: { size: 10, family: 'Arial' }, maxRotation: 45 }
                }
            },
            plugins: { 
                legend: { labels: { font: { size: 10, family: 'Arial' } } },
                title: { display: true, text: 'Składowe obciążenia w czasie', font: { size: 16, family: 'Arial' } }
            }
        },
    }, 1000, 400);

    doc.addImage(barChartImg, 'JPEG', margin, yPos, pageWidth - 2*margin, 70);
    yPos += 80;

    // Disclaimer
    doc.setFontSize(7);
    doc.setTextColor(150);
    const disclaimer = `KLAUZULA ODPOWIEDZIALNOŚCI:
    Niniejszy raport jest wynikiem symulacji komputerowej opartej na wprowadzonych danych oraz statystycznych modelach klimatycznych. Rzeczywiste zapotrzebowanie na chłód może różnić się w zależności od dokładności danych wejściowych, jakości wykonania budynku, sposobu użytkowania oraz lokalnych warunków mikroklimatycznych. Autor aplikacji nie ponosi odpowiedzialności za ewentualne błędy w doborze urządzeń na podstawie tego raportu. Zaleca się weryfikację wyników przez uprawnionego projektanta HVAC.`;
    
    const splitDisclaimer = doc.splitTextToSize(disclaimer, pageWidth - 2*margin);
    
    // Moved up to avoid overlapping with footer
    doc.text(splitDisclaimer, margin, pageHeight - 35);

    addFooter();
    doc.save(`Raport_Zyskow_Ciepla_${new Date().toISOString().slice(0, 10)}.pdf`);
};
