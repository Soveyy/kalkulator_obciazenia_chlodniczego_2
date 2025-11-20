
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import { MONTH_NAMES } from '../constants';

function normalizePolishChars(text: string): string {
    const polishChars: { [key: string]: string } = {
        'ą': 'a', 'ć': 'c', 'ę': 'e', 'ł': 'l', 'ń': 'n', 'ó': 'o', 'ś': 's', 'ź': 'z', 'ż': 'z',
        'Ą': 'A', 'Ć': 'C', 'Ę': 'E', 'Ł': 'L', 'Ń': 'N', 'Ó': 'O', 'Ś': 'S', 'Ź': 'Z', 'Ż': 'Z',
    };
    return String(text).replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, char => polishChars[char] || char);
}

const reorderDataForLocalTime = (data: number[], offset: number): number[] => {
    if (!data) return Array(24).fill(0);
    return Array.from({ length: 24 }, (_, i) => data[(i - offset + 24) % 24] || 0);
};

const outlabelsLinePlugin = {
  id: 'outlabelsLine',
  afterDraw: (chart: Chart) => {
    const { ctx, chartArea: { width, height } } = chart;
    if ((chart.config as any).type !== 'pie') return;

    const dataset = chart.data.datasets[0];
    const meta = chart.getDatasetMeta(0);
    const total = (dataset.data as number[]).reduce((a, b) => a + b, 0);
    
    ctx.save();
    
    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
    const outerRadius = meta.data[0] ? (meta.data[0] as any).outerRadius : width / 3;

    ctx.font = '10px Arial';
    ctx.textBaseline = 'middle';
    
    meta.data.forEach((element, index) => {
      const dataValue = dataset.data[index] as number;
      if (dataValue <= 0) return;

      const { startAngle, endAngle } = element as any;
      const midAngle = startAngle + (endAngle - startAngle) / 2;

      const x = centerX + (outerRadius + 10) * Math.cos(midAngle);
      const y = centerY + (outerRadius + 10) * Math.sin(midAngle);
      
      const x2 = centerX + (outerRadius + 25) * Math.cos(midAngle);
      const y2 = centerY + (outerRadius + 25) * Math.sin(midAngle);
      
      const isLeft = midAngle > Math.PI / 2 && midAngle < 3 * Math.PI / 2;
      ctx.textAlign = isLeft ? 'right' : 'left';
      const x3 = x2 + (isLeft ? -5 : 5);

      ctx.strokeStyle = (dataset.backgroundColor as string[])[index];
      ctx.fillStyle = '#333';
      ctx.lineWidth = 1;
      
      ctx.beginPath();
      ctx.moveTo(centerX + outerRadius * Math.cos(midAngle), centerY + outerRadius * Math.sin(midAngle));
      ctx.lineTo(x, y);
      ctx.lineTo(x3 + (isLeft ? 3 : -3), y2);
      ctx.stroke();

      const percentage = total > 0 ? ((dataValue / total) * 100).toFixed(1) : '0.0';
      const label = (chart.data.labels as string[])[index].split(' (')[0];
      
      ctx.fillText(`${label} (${percentage}%)`, x3, y2);
    });

    ctx.restore();
  }
};


async function createTempChart(config: any, plugins: any[] = []): Promise<string> {
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 1000;
    offscreenCanvas.height = 500;
    const chart = new Chart(offscreenCanvas, { ...config, plugins });
    await new Promise(resolve => setTimeout(resolve, 500));
    const dataUrl = chart.canvas.toDataURL('image/png');
    chart.destroy();
    return dataUrl;
}

export const generatePdfReport = async (state: any) => {
    const { input, activeResults, currentMonth } = state;
    if (!activeResults) return;

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPos = margin;

    const addHeader = (title: string) => {
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text(normalizePolishChars(title), pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
    };

    const addFooter = () => {
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(normalizePolishChars(`Strona ${i} z ${pageCount}`), pageWidth - margin, pageHeight - 10, { align: 'right' });
            doc.text(normalizePolishChars(`Zaawansowany Kalkulator Zyskow Ciepla © ${new Date().getFullYear()}`), margin, pageHeight - 10);
        }
    };
    
    const { finalGains, loadComponents } = activeResults;
    const month = parseInt(currentMonth, 10);
    const isSummerTime = (month >= 4 && month <= 10);
    const offset = isSummerTime ? 2 : 1;
    const timeZoneNotice = isSummerTime ? 'UTC+2' : 'UTC+1';

    const maxTotalCS = Math.max(...finalGains.clearSky.total);
    const hourTotalCS_UTC = finalGains.clearSky.total.indexOf(maxTotalCS);
    const hourTotalCS_Local = (hourTotalCS_UTC + offset) % 24;

    const sensibleAtPeak = finalGains.clearSky.sensible[hourTotalCS_UTC] || 0;
    const latentAtPeak = finalGains.clearSky.latent[hourTotalCS_UTC] || 0;
    
    const solarLoadPeak = loadComponents.solar[hourTotalCS_UTC] || 0;
    const conductionLoadPeak = loadComponents.conduction[hourTotalCS_UTC] || 0;
    const internalSensibleLoadPeak = loadComponents.internalSensible[hourTotalCS_UTC] || 0;
    const ventilationSensibleLoadPeak = loadComponents.ventilationSensible[hourTotalCS_UTC] || 0;
    
    const internalLatentAtPeak = state.activeResults.components.internalGainsLatent[hourTotalCS_UTC] || 0;
    const ventilationLatentAtPeak = state.activeResults.ventilationLoad.latent[hourTotalCS_UTC] || 0;
    
    const totalKWhCS = finalGains.clearSky.total.reduce((sum: number, val: number) => sum + Math.max(0, val), 0) / 1000;
    const totalKWhGlobal = finalGains.global.total.reduce((sum: number, val: number) => sum + Math.max(0, val), 0) / 1000;

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(normalizePolishChars('Raport Obciazenia Chlodniczego'), pageWidth / 2, 60, { align: 'center' });
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizePolishChars(`Nazwa Projektu: ${input.projectName}`), pageWidth / 2, 80, { align: 'center' });
    doc.setFontSize(10);
    doc.text(normalizePolishChars(`Data wygenerowania: ${new Date().toLocaleDateString('pl-PL')}`), pageWidth / 2, 90, { align: 'center' });
    yPos = 110;
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(normalizePolishChars('Glowne Parametry Projektowe'), margin, yPos);
    yPos += 8;

    const params = [
        [normalizePolishChars('Miesiac analizy'), normalizePolishChars(MONTH_NAMES[parseInt(currentMonth, 10) - 1])],
        [normalizePolishChars('Temperatura wewnetrzna'), `${input.tInternal} °C`],
        [normalizePolishChars('Wilgotnosc wewnetrzna'), `${input.rhInternal} %`],
        [normalizePolishChars('Temperatura zewnetrzna (projektowa)'), `${input.tExternal} °C`],
        [normalizePolishChars('Temperatura punktu rosy zewn.'), `${input.tDewPoint} °C`],
        [normalizePolishChars('Powierzchnia pomieszczenia'), `${input.roomArea} m²`],
    ];
    
    autoTable(doc, {
        startY: yPos,
        head: [[normalizePolishChars('Parametr'), normalizePolishChars('Wartosc')]],
        body: params,
        theme: 'grid',
        headStyles: { fillColor: [22, 160, 133] },
        margin: { left: margin, right: margin }
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizePolishChars('Maksymalne calkowite obciazenie chlodnicze'), pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;

    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(231, 76, 60);
    doc.text(`${maxTotalCS.toFixed(0)} W`, pageWidth / 2, yPos, { align: 'center' });
    yPos += 8;
    doc.setTextColor(40);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(normalizePolishChars(`(o godz. ${String(hourTotalCS_Local).padStart(2, '0')}:00 ${timeZoneNotice})`), pageWidth / 2, yPos, { align: 'center' });
    yPos += 10;
    
    const sensibleBody = [
        [normalizePolishChars('Sloneczne'), `${solarLoadPeak.toFixed(0)} W`],
        [normalizePolishChars('Przewodzenie'), `${conductionLoadPeak.toFixed(0)} W`],
        [normalizePolishChars('Wewnetrzne'), `${internalSensibleLoadPeak.toFixed(0)} W`],
        [normalizePolishChars('Wentylacja'), `${ventilationSensibleLoadPeak.toFixed(0)} W`],
    ];

    const latentBody = [
        [normalizePolishChars('Wewnetrzne'), `${internalLatentAtPeak.toFixed(0)} W`],
        [normalizePolishChars('Wentylacja'), `${ventilationLatentAtPeak.toFixed(0)} W`],
    ];

    autoTable(doc, {
        startY: yPos,
        head: [[normalizePolishChars(`Obciazenie jawne: ${sensibleAtPeak.toFixed(0)} W`)]],
        body: sensibleBody,
        theme: 'grid',
        headStyles: { fillColor: [230, 126, 34], textColor: 255 },
        margin: { left: margin, right: pageWidth / 2 + 2 },
        tableWidth: pageWidth / 2 - margin - 2,
    });
    
    autoTable(doc, {
        startY: yPos,
        head: [[normalizePolishChars(`Obciazenie utajone: ${latentAtPeak.toFixed(0)} W`)]],
        body: latentBody,
        theme: 'grid',
        headStyles: { fillColor: [52, 152, 219], textColor: 255 },
        margin: { left: pageWidth / 2 + 2 },
        tableWidth: pageWidth / 2 - margin - 2,
    });
    yPos = (doc as any).lastAutoTable.finalY + 8;
    
    autoTable(doc, {
        startY: yPos,
        head: [[normalizePolishChars('Suma dobowa energii chlodniczej')]],
        body: [
            [normalizePolishChars('Projektowa (Clear Sky)'), `${totalKWhCS.toFixed(1)} kWh`],
            [normalizePolishChars('Typowa (Global)'), `${totalKWhGlobal.toFixed(1)} kWh`],
        ],
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
        margin: { left: margin, right: margin }
    });

    
    doc.addPage();
    yPos = margin;
    addHeader(normalizePolishChars(`Udzial Skladowych w Szczycie (${String(hourTotalCS_Local).padStart(2, '0')}:00)`));

    const pieChartDataValues = [solarLoadPeak, conductionLoadPeak, internalSensibleLoadPeak, ventilationSensibleLoadPeak, latentAtPeak].map(v => Math.max(0, v));
    
    const pieChartData = {
        labels: ['Sloneczne', 'Przewodzenie', 'Wewn. Jawne', 'Wentylacja Jawna', 'Utajone'],
        datasets: [{
            data: pieChartDataValues,
            backgroundColor: ['#f1c40f', '#e67e22', '#e74c3c', '#8e44ad', '#3498db'],
            borderColor: '#fff',
            borderWidth: 2,
        }]
    };
    
    const pieChartImg = await createTempChart({
        type: 'pie',
        data: pieChartData,
        options: {
            responsive: false,
            layout: {
                padding: {
                    top: 40, bottom: 40, left: 80, right: 80
                }
            },
            plugins: {
                title: { display: true, text: normalizePolishChars('Udzial skladowych w szczytowym obciazeniu calkowitym') },
                legend: { display: true, position: 'right' },
            }
        },
    }, [outlabelsLinePlugin]);

    doc.addImage(pieChartImg, 'PNG', margin, yPos, 180, 100);
    yPos += 110;
    
    doc.addPage();
    yPos = margin;
    addHeader('Wykresy Godzinowe Obciazenia Chlodniczego');

    const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);

    const lineChartImg = await createTempChart({
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: normalizePolishChars('Projektowe (CS)'), data: reorderDataForLocalTime(finalGains.clearSky.total, offset), borderColor: '#e74c3c', backgroundColor: 'rgba(231, 76, 60, 0.2)', fill: true, tension: 0.3, yAxisID: 'yLoad' },
                { label: normalizePolishChars('Temperatura zewn.'), data: reorderDataForLocalTime(state.tExtProfile, offset), borderColor: '#64748b', backgroundColor: 'transparent', borderDash: [5, 5], tension: 0.3, yAxisID: 'yTemp' }
            ]
        },
        options: {
            responsive: false,
            plugins: { title: { display: true, text: normalizePolishChars('Calkowite obciazenie chlodnicze (Projektowe)') } },
            scales: {
                x: { title: { display: true, text: normalizePolishChars(`Godzina (czas lokalny)`) } },
                yLoad: { position: 'left', title: { display: true, text: normalizePolishChars('Obciazenie (W)') } },
                yTemp: { position: 'right', title: { display: true, text: normalizePolishChars('Temperatura (°C)') }, grid: { drawOnChartArea: false } }
            }
        }
    });
    doc.addImage(lineChartImg, 'PNG', margin, yPos, 180, 80);
    yPos += 90;

    const barChartImg = await createTempChart({
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: normalizePolishChars('Sloneczne'), data: reorderDataForLocalTime(loadComponents.solar, offset), backgroundColor: 'rgba(241, 196, 15, 0.7)', stack: 'a' },
                { label: normalizePolishChars('Przewodzenie'), data: reorderDataForLocalTime(loadComponents.conduction, offset), backgroundColor: 'rgba(230, 126, 34, 0.7)', stack: 'a' },
                { label: normalizePolishChars('Wewn. Jawne'), data: reorderDataForLocalTime(loadComponents.internalSensible, offset), backgroundColor: 'rgba(231, 76, 60, 0.7)', stack: 'a' },
                { label: normalizePolishChars('Wentylacja Jawna'), data: reorderDataForLocalTime(loadComponents.ventilationSensible, offset), backgroundColor: 'rgba(142, 68, 173, 0.7)', stack: 'a' },
                { label: normalizePolishChars('Utajone (wewn. + went.)'), data: reorderDataForLocalTime(finalGains.clearSky.latent, offset), backgroundColor: 'rgba(52, 152, 219, 0.7)', stack: 'a' }
            ]
        },
        options: {
            responsive: false,
            plugins: { title: { display: true, text: normalizePolishChars('Skladowe obciazenia chlodniczego (Clear Sky)') } },
            scales: { 
                x: { stacked: true, title: {display: true, text: normalizePolishChars(`Godzina (czas lokalny)`)} }, 
                y: { stacked: true, title: {display: true, text: normalizePolishChars('Obciazenie (W)')} } 
            },
        }
    });

    if (yPos + 85 > pageHeight - margin) {
        doc.addPage();
        yPos = margin;
    }
    doc.addImage(barChartImg, 'PNG', margin, yPos, 180, 80);
    yPos += 90;

    doc.addPage();
    yPos = margin;
    addHeader('Tabela Wynikow Godzinowych (Clear Sky)');
    
    const tableData = Array.from({ length: 24 }, (_, localHour) => {
        const utcHour = (localHour - offset + 24) % 24;
        return [
            `${String(localHour).padStart(2,'0')}:00`,
            finalGains.clearSky.sensible[utcHour].toFixed(0),
            finalGains.clearSky.latent[utcHour].toFixed(0),
            finalGains.clearSky.total[utcHour].toFixed(0)
        ]
    });

    autoTable(doc, {
        startY: yPos,
        head: [[
            normalizePolishChars('Godzina'), 
            normalizePolishChars('Obc. jawne [W]'), 
            normalizePolishChars('Obc. utajone [W]'), 
            normalizePolishChars('Obc. calkowite [W]')
        ]],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [44, 62, 80] },
    });

    addFooter();
    doc.save(normalizePolishChars(`${input.projectName.replace(/ /g, '_')}_raport.pdf`));
};