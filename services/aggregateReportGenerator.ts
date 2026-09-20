import { aggregateResults } from './aggregateResults';
import { assertRoomValid } from './validationService';
import type { State } from '../types';
import { PdfLayout, balanceTable, chartImage, chartOptions, componentsImage, HOURS } from './pdfLayout';
import { BALANCE_NOTE, DISCLAIMER, REPORT_SCOPE, REPORT_SOURCE_LABELS, componentsNote, formatNumber as n, kw, localHour, localSeries, monthName, reportFileName, roomReportData, seasonalPeak, timeZone, ventilationLabel } from './reportPresentation';

export const generateAggregatePdfReport = async (state: State, _aggregateData: unknown, _currentMonth: string) => {
    state.rooms.forEach(assertRoomValid);
    const data = aggregateResults(state);
    if (!data) throw new Error('Wyniki pomieszczeń są niekompletne lub nieaktualne. Przelicz wszystkie pomieszczenia.');
    // Report the month actually used by the verified results, not a stale UI argument.
    const month = data.roomsWithResults[0].currentMonth;
    const peakHour = localHour(data.peakHour, month);
    const totalArea = data.roomProfiles.reduce((sum, room) => sum + room.area, 0);
    const seasons = data.roomsWithResults.map(seasonalPeak);
    const completeSeason = seasons.every(Boolean);
    const individualPeaks = data.roomProfiles.map((r, i) => completeSeason ? seasons[i]!.peak : r.peak);
    const sumPeaks = individualPeaks.reduce((sum, value) => sum + value, 0);
    const peakPeriod = completeSeason ? 'kwiecień-wrzesień' : monthName(month);
    const pdf = await PdfLayout.create(state.projectName, 'Raport zbiorczy');

    pdf.title('Raport zbiorczy\nobciążenia chłodniczego');
    pdf.paragraph('Projekt: ' + (state.projectName || 'Bez nazwy'), 11, true, false, 4);
    pdf.hero('Jednoczesne obciążenie chłodnicze pomieszczeń · ' + monthName(month), kw(data.aggregatePeak) + ' kW',
        'Godzina ' + peakHour + ' (' + timeZone(month) + ')  ·  ' + n(data.aggregatePeak / totalArea) + ' W/m²');
    pdf.paragraph('Największa suma obciążeń chłodniczych wszystkich pomieszczeń w tej samej godzinie analizowanego miesiąca. Obejmuje część jawną i utajoną.', 9);
    pdf.metrics([
        { label: 'Suma indywidualnych maksimów', value: kw(sumPeaks) + ' kW', detail: peakPeriod },
        { label: 'Powierzchnia analizowana', value: n(totalArea) + ' m²' },
        { label: 'Pomieszczenia w raporcie', value: n(data.roomProfiles.length, 0) },
    ]);
    pdf.paragraph('Indywidualne maksima mogą wystąpić o różnych godzinach' + (completeSeason ? ' i w różnych miesiącach' : '') + '. Dlatego ich suma może być większa od jednoczesnego obciążenia chłodniczego.', 8.5);
    pdf.weatherNotice(state.isShadingViewActive);
    pdf.section('Dobowy profil obciążenia chłodniczego · ' + monthName(month), 65);
    const profileHeight = Math.min(76, pdf.bottom - pdf.y - 16);
    const colors = ['#dd5564', '#259a80', '#d29b25', '#9667bf', '#298ba3', '#d07836', '#708431', '#bb6895', '#627cb3', '#826955'];
    pdf.image(chartImage({ type: 'line', data: { labels: HOURS, datasets: [
        { label: 'Wszystkie pomieszczenia', data: localSeries(data.hourlyTotal, month).map(v => v / 1000), borderColor: '#2563db', backgroundColor: '#2563db12', borderWidth: 4, fill: true, pointRadius: 0, tension: 0 },
        ...data.roomProfiles.map((room, i) => ({
            // Short identifiers keep the legend readable even with ten long room names.
            label: 'P' + (i + 1), data: localSeries(room.profile, month).map(v => v / 1000),
            borderColor: colors[i % colors.length], borderWidth: 2, pointRadius: 0, tension: 0,
        })),
    ] }, options: chartOptions }, 1100, Math.round(profileHeight / pdf.width * 1100)), profileHeight);
    pdf.paragraph('P1-P' + data.roomProfiles.length + ' oznaczają pomieszczenia z tabeli na kolejnej stronie. Godziny lokalne (' + timeZone(month) + ').', 8);

    pdf.newPage();
    pdf.section('Zestawienie obciążeń chłodniczych pomieszczeń', 35);
    pdf.paragraph('Kolumna „W szczycie wspólnym” pokazuje udział każdego pomieszczenia w wyniku ' + kw(data.aggregatePeak) + ' kW: ' + monthName(month) + ', godz. ' + peakHour + '. „Maksimum własne” dotyczy okresu: ' + peakPeriod + '.', 9);
    pdf.table(['Nr', 'Pomieszczenie', 'Pole [m²]', 'W szczycie wspólnym [kW]', 'Maksimum własne [kW]', 'Miesiąc maksimum'], data.roomProfiles.map((room, i) => [
        'P' + (i + 1), room.name, n(room.area), kw(room.profile[data.peakHour]),
        kw(individualPeaks[i]), monthName(completeSeason ? seasons[i]!.month : month),
    ]), {
        columnStyles: { 0: { cellWidth: 12 }, 1: { cellWidth: 59 }, 2: { cellWidth: 21, halign: 'right' }, 3: { cellWidth: 29, halign: 'right' }, 4: { cellWidth: 29, halign: 'right' }, 5: { cellWidth: 28 } },
        foot: [['', 'Razem', n(totalArea), kw(data.aggregatePeak), kw(sumPeaks), '-']], showFoot: 'lastPage',
    });
    pdf.paragraph('Sumy obliczono przed zaokrągleniem wartości w wierszach. Mogą wystąpić drobne różnice po dodaniu liczb widocznych w tabeli.', 8);
    pdf.section('Interpretacja wyników pomieszczeń', 35);
    pdf.paragraph('Obciążenie chłodnicze jawne dotyczy chłodzenia powietrza, a utajone - usuwania wilgoci. Obie części określono osobno dla każdego pomieszczenia.', 9);
    pdf.paragraph(BALANCE_NOTE, 8.5);
    pdf.paragraph('Szczegóły na kolejnych stronach dotyczą godziny szczytowego obciążenia chłodniczego danego pomieszczenia w analizowanym miesiącu. Może ona różnić się od godziny szczytu wspólnego.', 9);
    for (let i = 0; i < data.roomsWithResults.length; i++) {
        const room = data.roomsWithResults[i];
        const { summary, season } = roomReportData(room);
        pdf.newPage();
        pdf.paragraph('P' + (i + 1) + ' · ' + room.name, 14, false, true, 3);
        pdf.metrics([
            { label: 'Szczyt własny · ' + monthName(month), value: kw(summary.peak) + ' kW', detail: 'godz. ' + localHour(summary.hour, month) + ' (' + timeZone(month) + ')' },
            { label: 'W szczycie wspólnym', value: kw(data.roomProfiles[i].profile[data.peakHour]) + ' kW', detail: 'godz. ' + peakHour + ' (' + timeZone(month) + ')' },
            { label: season ? 'Maksimum · kwiecień-wrzesień' : 'Wskaźnik powierzchniowy', value: season ? kw(season.peak) + ' kW' : n(summary.peak / data.roomProfiles[i].area) + ' W/m²', detail: season ? monthName(season.month) : monthName(month) },
        ]);
        pdf.table([], [
            ['Powierzchnia', n(data.roomProfiles[i].area) + ' m²', 'Temperatura / wilgotność', n(room.input.tInternal) + ' °C / ' + n(room.input.rhInternal, 0) + '%'],
            ['Wentylacja', ventilationLabel(room), REPORT_SOURCE_LABELS.infiltration, room.internalGains.ventilation.includeInfiltration ? 'Uwzględniono' : 'Nie uwzględniono'],
        ], { styles: { cellPadding: 2 }, columnStyles: { 0: { cellWidth: 29 }, 1: { cellWidth: 48 }, 2: { cellWidth: 60 }, 3: { cellWidth: 41 } } });
        pdf.section('Bilans w szczycie własnym · godz. ' + localHour(summary.hour, month), 75);
        balanceTable(pdf, room);
        pdf.section('Dobowy bilans składowych obciążenia chłodniczego', 68);
        // Leave room for the explanation without separating a room's chart from its table.
        const componentsHeight = Math.min(60, pdf.bottom - pdf.y - 17);
        pdf.image(componentsImage(room, componentsHeight), componentsHeight);
        pdf.paragraph(componentsNote(month), 8);
    }

    pdf.section('Informacje końcowe', 42);
    pdf.paragraph(REPORT_SCOPE, 8.5);
    pdf.paragraph(DISCLAIMER, 8);
    pdf.paragraph('Autor programu: Łukasz Sowiński', 8);

    pdf.finish(reportFileName('Raport_Zbiorczy', state.projectName));
};
