import jsPDF from 'jspdf';
import autoTable, { UserOptions } from 'jspdf-autotable';
import Chart from 'chart.js/auto';
import { APP_VERSION } from './appVersion';
import { formatNumber, kw, localSeries, roomReportData, REPORT_SOURCE_LABELS, WEATHER_ASSUMPTIONS, shadingAssumptions } from './reportPresentation';
import type { RoomState } from '../types';

const BLUE: [number, number, number] = [26, 86, 219];
const INK: [number, number, number] = [30, 41, 59];
const MUTED: [number, number, number] = [83, 99, 118];
const PALE: [number, number, number] = [241, 245, 249];

async function fetchBase64(url: string) {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Nie udało się pobrać czcionki lub grafiki raportu. Spróbuj ponownie.');
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return window.btoa(binary);
}
let fontsPromise: Promise<string[]> | undefined;
function loadFonts() {
    fontsPromise ??= Promise.all([
        fetchBase64('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Regular.ttf'),
        fetchBase64('https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.1.66/fonts/Roboto/Roboto-Medium.ttf'),
    ]).catch(error => { fontsPromise = undefined; throw error; });
    return fontsPromise;
}

/** One layout contract for both reports, including pages inserted by AutoTable. */
export class PdfLayout {
    readonly doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    readonly margin = 16;
    readonly width = 178;
    readonly top = 32;
    readonly bottom = 275;
    y = this.top;
    private logo?: string;
    private date = new Date().toLocaleDateString('pl-PL');

    private constructor(readonly project: string, readonly kind: string) {}

    static async create(project: string, kind: string) {
        const pdf = new PdfLayout(project || 'Bez nazwy', kind);
        const [regular, bold] = await loadFonts();
        pdf.doc.addFileToVFS('Roboto-Regular.ttf', regular);
        pdf.doc.addFont('Roboto-Regular.ttf', 'Roboto', 'normal');
        pdf.doc.addFileToVFS('Roboto-Medium.ttf', bold);
        pdf.doc.addFont('Roboto-Medium.ttf', 'Roboto', 'bold');
        pdf.doc.setFont('Roboto', 'normal');
        pdf.doc.setProperties({ title: kind + ' - ' + pdf.project, subject: 'Obciążenie chłodnicze', creator: 'Kalkulator HVAC ' + APP_VERSION });
        try { pdf.logo = await fetchBase64('/logo-1.png'); } catch { /* A logo failure must not discard a valid report. */ }
        return pdf;
    }

    newPage() { this.doc.addPage(); this.y = this.top; }
    ensure(height: number) { if (this.y + height > this.bottom) this.newPage(); }

    paragraph(text: string, size = 9, muted = true, bold = false, gap = 3) {
        const doc = this.doc;
        doc.setFont('Roboto', bold ? 'bold' : 'normal');
        doc.setFontSize(size);
        const lines: string[] = doc.splitTextToSize(text, this.width);
        const lineHeight = size * 0.44;
        this.ensure(lines.length * lineHeight + gap);
        doc.setTextColor(...(muted ? MUTED : INK));
        doc.text(lines, this.margin, this.y + size * 0.35, { lineHeightFactor: 1.25 });
        this.y += lines.length * lineHeight + gap;
    }

    title(title: string, subtitle?: string) {
        this.paragraph(title, 21, false, true, 4);
        if (subtitle) this.paragraph(subtitle, 10, true, false, 5);
    }

    section(title: string, nextHeight = 24) {
        this.doc.setFont('Roboto', 'bold');
        this.doc.setFontSize(12);
        const lines: string[] = this.doc.splitTextToSize(title, this.width);
        this.ensure(lines.length * 5.4 + 7 + nextHeight);
        this.doc.setTextColor(...BLUE);
        this.doc.text(lines, this.margin, this.y + 4.3, { lineHeightFactor: 1.25 });
        this.y += lines.length * 5.4 + 3;
        this.doc.setDrawColor(210, 220, 233);
        this.doc.setLineWidth(0.25);
        this.doc.line(this.margin, this.y, this.margin + this.width, this.y);
        this.y += 4;
    }

    weatherNotice(includeShading: boolean) {
        const doc = this.doc;
        doc.setFont('Roboto', 'normal'); doc.setFontSize(8.5);
        const lines: string[] = doc.splitTextToSize(WEATHER_ASSUMPTIONS + '\n' + shadingAssumptions(includeShading), this.width - 10);
        const height = 12 + lines.length * 3.8;
        this.ensure(height + 4);
        doc.setFillColor(239, 246, 255); doc.setDrawColor(191, 213, 245);
        doc.roundedRect(this.margin, this.y, this.width, height, 2, 2, 'FD');
        doc.setFont('Roboto', 'bold'); doc.setFontSize(9); doc.setTextColor(...BLUE);
        doc.text('Założenia obliczeniowe: nasłonecznienie i zacienienie', this.margin + 5, this.y + 6);
        doc.setFont('Roboto', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK);
        doc.text(lines, this.margin + 5, this.y + 11, { lineHeightFactor: 1.25 });
        this.y += height + 4;
    }

    hero(label: string, value: string, detail: string) {
        this.ensure(39);
        const doc = this.doc;
        doc.setFillColor(254, 242, 242);
        doc.setDrawColor(252, 190, 190);
        doc.roundedRect(this.margin, this.y, this.width, 35, 2, 2, 'FD');
        doc.setFont('Roboto', 'normal'); doc.setFontSize(10); doc.setTextColor(137, 45, 45);
        doc.text(label, 105, this.y + 7, { align: 'center' });
        doc.setFont('Roboto', 'bold'); doc.setFontSize(28); doc.setTextColor(203, 48, 48);
        doc.text(value, 105, this.y + 20, { align: 'center' });
        doc.setFont('Roboto', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED);
        doc.text(detail, 105, this.y + 29, { align: 'center' });
        this.y += 38;
    }

    metrics(items: { label: string; value: string; detail?: string }[]) {
        const boxWidth = (this.width - (items.length - 1) * 4) / items.length;
        const doc = this.doc;
        doc.setFont('Roboto', 'normal'); doc.setFontSize(8);
        const labels = items.map(item => doc.splitTextToSize(item.label, boxWidth - 8) as string[]);
        const labelHeight = Math.max(...labels.map(l => l.length)) * 3.5;
        const height = 15 + labelHeight + (items.some(i => i.detail) ? 5 : 0);
        this.ensure(height + 5);
        items.forEach((item, index) => {
            const x = this.margin + index * (boxWidth + 4);
            doc.setFillColor(...PALE); doc.roundedRect(x, this.y, boxWidth, height, 2, 2, 'F');
            doc.setFont('Roboto', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
            doc.text(labels[index], x + 4, this.y + 5, { lineHeightFactor: 1.25 });
            doc.setFont('Roboto', 'bold'); doc.setFontSize(15); doc.setTextColor(...INK);
            doc.text(item.value, x + 4, this.y + labelHeight + 11);
            if (item.detail) {
                doc.setFont('Roboto', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
                doc.text(item.detail, x + 4, this.y + height - 3);
            }
        });
        this.y += height + 5;
    }

    table(head: string[], body: string[][], options: UserOptions = {}) {
        this.ensure(22);
        autoTable(this.doc, {
            startY: this.y,
            head: head.length ? [head] : undefined, body,
            theme: 'grid', rowPageBreak: 'avoid', showHead: 'everyPage',
            margin: { left: this.margin, right: this.margin, top: this.top, bottom: 22 },
            headStyles: { fillColor: PALE, textColor: INK, fontStyle: 'bold', fontSize: 8 },
            alternateRowStyles: { fillColor: [250, 251, 253] },
            footStyles: { fillColor: PALE, textColor: INK, fontStyle: 'bold' },
            didParseCell: cell => {
                if (options.columnStyles?.[cell.column.index]?.halign === 'right') cell.cell.styles.halign = 'right';
            },
            ...options,
            styles: { font: 'Roboto', fontSize: 8.5, textColor: INK, cellPadding: 2.5, lineColor: [220, 227, 235], lineWidth: 0.15, overflow: 'linebreak', valign: 'middle', ...options.styles },
        });
        this.y = (this.doc as any).lastAutoTable.finalY + 5;
    }

    image(dataUrl: string, height: number) {
        this.ensure(height + 3);
        this.doc.addImage(dataUrl, 'PNG', this.margin, this.y, this.width, height);
        this.y += height + 3;
    }

    finish(fileName: string) {
        const doc = this.doc;
        const count = doc.getNumberOfPages();
        for (let page = 1; page <= count; page++) {
            doc.setPage(page);
            if (this.logo) doc.addImage('data:image/png;base64,' + this.logo, 'PNG', this.margin, 11, 36, 10.8);
            else { doc.setFont('Roboto', 'bold'); doc.setFontSize(11); doc.setTextColor(...BLUE); doc.text('Kalkulator HVAC', this.margin, 18); }
            doc.setFont('Roboto', 'normal'); doc.setFontSize(8); doc.setTextColor(...MUTED);
            doc.text(this.kind, 194, 14, { align: 'right' });
            doc.text(this.date + '  ·  wersja ' + APP_VERSION, 194, 20, { align: 'right' });
            doc.setDrawColor(220, 227, 235); doc.setLineWidth(0.2);
            doc.line(16, 26, 194, 26); doc.line(16, 281, 194, 281);
            doc.setFontSize(7.5);
            const projectLines: string[] = doc.splitTextToSize('Projekt: ' + this.project, 137);
            doc.text(projectLines, 16, 286, { lineHeightFactor: 1.2, maxWidth: 137 });
            doc.text('Strona ' + page + ' z ' + count, 194, 286, { align: 'right' });
        }
        doc.save(fileName);
    }
}

const whiteBackground = {
    id: 'reportWhiteBackground',
    beforeDraw(chart: any) {
        const ctx = chart.ctx;
        ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, chart.width, chart.height); ctx.restore();
    },
};

export function chartImage(config: any, width = 1100, height = 420): string {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const chart = new Chart(canvas, {
        ...config,
        options: {
            ...config.options, animation: false, responsive: false, maintainAspectRatio: false, devicePixelRatio: 2,
            font: { family: 'Arial, sans-serif' },
            plugins: { datalabels: false, ...config.options?.plugins },
        },
        plugins: [...(config.plugins ?? []), whiteBackground],
    });
    try { return canvas.toDataURL('image/png'); } finally { chart.destroy(); }
}

export const HOURS = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0') + ':00');
export const chartOptions = {
    locale: 'pl-PL',
    plugins: { legend: { position: 'bottom', labels: { font: { size: 15, family: 'Arial' }, boxWidth: 14, padding: 14 } } },
    scales: {
        x: { grid: { display: false }, ticks: { font: { size: 14 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { beginAtZero: true, title: { display: true, text: 'Obciążenie chłodnicze [kW]', font: { size: 15 } }, ticks: { font: { size: 14 } } },
    },
};

export function roomProfileImage(room: RoomState, height = 66) {
    const model = roomReportData(room);
    return chartImage({ type: 'line', data: { labels: HOURS, datasets: [
        { label: 'Obciążenie chłodnicze [kW]', data: localSeries(model.profile, room.currentMonth).map(v => v / 1000), borderColor: '#df535a', backgroundColor: '#df535a18', fill: true, borderWidth: 3, pointRadius: 0, tension: 0 },
        { label: 'Temperatura na zewnątrz [°C]', data: localSeries(room.tExtProfile, room.currentMonth), borderColor: '#7b8a9d', borderDash: [6, 4], borderWidth: 2, pointRadius: 0, tension: 0, yAxisID: 'temperature' },
    ] }, options: { ...chartOptions, scales: { ...chartOptions.scales, temperature: { position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Temperatura [°C]', font: { size: 15 } }, ticks: { font: { size: 14 } } } } } }, 1100, Math.round(height / 178 * 1100));
}

export function balanceTable(pdf: PdfLayout, room: RoomState) {
    const { source, summary } = roomReportData(room);
    pdf.table(['Składowa obciążenia chłodniczego', 'Obciążenie chłodnicze\njawne [kW]', 'Obciążenie chłodnicze\nutajone [kW]'], source.map(s => [s.label, kw(s.sensible), kw(s.latent)]), {
        columnStyles: { 0: { cellWidth: 96 }, 1: { cellWidth: 41, halign: 'right' }, 2: { cellWidth: 41, halign: 'right' } },
        foot: [['Bilans netto', kw(summary.sensibleNet), kw(summary.latentNet)], ['Obciążenie chłodnicze do pokrycia', kw(summary.sensible), kw(summary.latent)]],
        showFoot: 'lastPage',
    });
}

export function positiveSources(pdf: PdfLayout, room: RoomState) {
    const { positive } = roomReportData(room);
    if (!positive.length) { pdf.paragraph('Brak dodatnich składowych obciążenia chłodniczego w tej godzinie.'); return; }
    const total = positive.reduce((sum, s) => sum + s.value, 0);
    const doc = pdf.doc;
    doc.setFont('Roboto', 'normal'); doc.setFontSize(8.5);
    const entries = positive.map(s => ({ ...s, lines: doc.splitTextToSize(s.label, 94) as string[] }));
    const height = Math.max(66, entries.reduce((sum, s) => sum + s.lines.length * 3.8 + 8.5, 0) + 3);
    pdf.ensure(height + 6);
    const img = chartImage({
        type: 'doughnut',
        data: { datasets: [{ data: positive.map(s => s.value), backgroundColor: positive.map(s => s.color), borderWidth: 3, borderColor: '#ffffff' }] },
        options: { plugins: { legend: { display: false } }, cutout: '45%' },
    }, 450, 450);
    doc.addImage(img, 'PNG', pdf.margin + 4, pdf.y + (height - 66) / 2, 66, 66);
    let y = pdf.y + 6;
    entries.forEach(s => {
        doc.setFillColor(s.color); doc.roundedRect(94, y - 3, 3, 3, 0.4, 0.4, 'F');
        doc.setFont('Roboto', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...INK);
        doc.text(s.lines, 100, y, { lineHeightFactor: 1.25 });
        doc.setTextColor(...MUTED);
        doc.text(kw(s.value) + ' kW  ·  ' + formatNumber(s.value / total * 100, 1) + '%', 100, y + s.lines.length * 3.8 + 1);
        y += s.lines.length * 3.8 + 8.5;
    });
    pdf.y += height + 6;
}

export function componentsImage(room: RoomState, height = 66) {
    const result = room.activeResults!;
    const components = [
        [REPORT_SOURCE_LABELS.solar, result.loadComponents.solar, '#e9a028'],
        [REPORT_SOURCE_LABELS.conduction, result.loadComponents.conduction, '#ef7b37'],
        [REPORT_SOURCE_LABELS.internal, result.loadComponents.internalSensible, '#df535a'],
        [REPORT_SOURCE_LABELS.ventilation, result.loadComponents.ventilationSensible, '#9166c3'],
        [REPORT_SOURCE_LABELS.infiltration, result.loadComponents.infiltrationSensible, '#249e8c'],
        ['Obciążenie chłodnicze utajone', result.finalGains.clearSky.latent, '#397ad6'],
    ] as const;
    return chartImage({ type: 'bar', data: { labels: HOURS, datasets: components.map(([label, values, color]) => ({ label, data: localSeries(values, room.currentMonth).map(v => v / 1000), backgroundColor: color, stack: 'balance' })) }, options: { ...chartOptions, scales: { x: { ...chartOptions.scales.x, stacked: true }, y: { ...chartOptions.scales.y, stacked: true, title: { display: true, text: 'Bilans [kW]', font: { size: 15 } } } } } }, 1100, Math.round(height / 178 * 1100));
}
