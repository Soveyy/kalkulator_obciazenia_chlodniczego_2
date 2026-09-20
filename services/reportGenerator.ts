import { ADVANCED_APPLIANCES } from '../data/advancedAppliances';
import { LIGHTING_TYPES, PEOPLE_ACTIVITY_LEVELS, VENTILATION_EXCHANGER_TYPES, WALL_MATERIALS } from '../constants';
import { FLOOR_TYPE_LABELS, RTS_PRESETS } from '../data/rtsPresets';
import { CTS_PRESETS } from '../data/ctsPresets';
import { UNCONDITIONED_PARTITION_PRESETS } from '../data/unconditionedPresets';
import type { RoomState, State } from '../types';
import { assertRoomValid, isRoomResultCurrent, parseNumber } from './validationService';
import { scheduleLabel } from './resultModel';
import { PdfLayout, balanceTable, componentsImage, positiveSources, roomProfileImage } from './pdfLayout';
import { BALANCE_NOTE, DISCLAIMER, ENERGY_NOTE, REPORT_SCOPE, REPORT_SOURCE_LABELS, componentsNote, formatNumber as n, kw, localHour, monthName, reportFileName, roomReportData, timeZone, ventilationLabel } from './reportPresentation';

export const generatePdfReport = async (state: State, room: RoomState) => {
    assertRoomValid(room);
    if (!isRoomResultCurrent(room)) throw new Error('Wynik pomieszczenia jest nieaktualny. Przelicz dane przed utworzeniem raportu.');
    const { summary, season } = roomReportData(room);
    const month = room.currentMonth;
    const hour = localHour(summary.hour, month);
    const area = parseNumber(room.input.roomArea)!;
    const pdf = await PdfLayout.create(state.projectName, 'Raport pomieszczenia');

    pdf.title('Raport obciążenia chłodniczego');
    pdf.paragraph('Projekt: ' + (state.projectName || 'Bez nazwy'), 10, true, false, 3);
    pdf.paragraph('Pomieszczenie: ' + room.name, 13, false, true, 4);
    pdf.hero('Szczytowe obciążenie chłodnicze pomieszczenia · ' + monthName(month), kw(summary.peak) + ' kW',
        'Godzina ' + hour + ' (' + timeZone(month) + ')  ·  ' + n(summary.peak / area) + ' W/m²');
    pdf.paragraph('Wynik określa wymaganą moc chłodniczą w godzinie szczytowego obciążenia chłodniczego w analizowanym miesiącu. Obejmuje część jawną i utajoną.', 9);
    pdf.metrics([
        { label: 'Chłodzenie powietrza\nObciążenie chłodnicze jawne', value: kw(summary.sensible) + ' kW' },
        { label: 'Usuwanie wilgoci\nObciążenie chłodnicze utajone', value: kw(summary.latent) + ' kW' },
    ]);
    pdf.weatherNotice(state.isShadingViewActive);
    pdf.table([], [
        ['Powierzchnia podłogi', n(area) + ' m²', 'Temperatura / wilgotność wewnątrz', n(room.input.tInternal) + ' °C / ' + n(room.input.rhInternal, 0) + '%'],
    ], { columnStyles: { 0: { cellWidth: 43 }, 1: { cellWidth: 46 }, 2: { cellWidth: 43 }, 3: { cellWidth: 46 } } });
    if (season) pdf.paragraph('Najwyższy wynik w okresie kwiecień-wrzesień: ' + kw(season.peak) + ' kW (' + monthName(season.month) + ').', 9, false, true);
    pdf.section('Dobowy profil obciążenia chłodniczego', 55);
    const profileHeight = Math.min(66, pdf.bottom - pdf.y - 15);
    pdf.image(roomProfileImage(room, profileHeight), profileHeight);
    pdf.paragraph('Godziny podano w czasie lokalnym (' + timeZone(month) + ').', 8);

    pdf.newPage();
    pdf.section('Składowe obciążenia chłodniczego w godzinie szczytu', 80);
    pdf.paragraph(monthName(month) + ', godz. ' + hour + ' (' + timeZone(month) + '). Część jawna dotyczy chłodzenia powietrza, a utajona - usuwania wilgoci.', 9);
    balanceTable(pdf, room);
    pdf.paragraph(BALANCE_NOTE, 8.5);
    pdf.section('Udział składowych obciążenia chłodniczego', 90);
    positiveSources(pdf, room);
    pdf.paragraph('Udziały dotyczą sumy dodatnich składowych w godzinie szczytu. Składowe ujemne uwzględnia tabela powyżej, dlatego suma na wykresie może być większa niż obciążenie chłodnicze do pokrycia.', 8.5);
    pdf.ensure(31);
    pdf.paragraph('Dobowe zapotrzebowanie na chłód: ' + n(summary.coolingEnergyKWh) + ' kWh', 10, false, true);
    pdf.paragraph(ENERGY_NOTE, 8);

    pdf.newPage();
    pdf.section('Dane przyjęte do obliczeń', 25);
    pdf.paragraph('Poniższe wartości pochodzą z projektu. Powierzchnie ścian są powierzchniami netto, bez otworów. Kierunki: N - północ, E - wschód, S - południe, W - zachód; pochylenie liczone od poziomu.', 8.5);
    const windowTypes: Record<string, string> = { modern: '3-szybowe', standard: '2-szybowe nowe', older_double: '2-szybowe stare', historic: '1-szybowe', custom: 'Niestandardowe' };
    const shadingTypes: Record<string, string> = { louvers: 'Żaluzje', draperies: 'Zasłony', roller_shades: 'Rolety', insect_screens: 'Moskitiery' };
    pdf.section('Okna', 30);
    if (room.windows.length) {
        pdf.table(['Kierunek / kąt', 'Okno', 'Pole [m²]', 'U [W/(m²K)]', 'SHGC (g)', 'Osłona / daszek'], room.windows.map(w => {
            const shade = w.shading.enabled ? (state.isShadingViewActive ? shadingTypes[w.shading.type] + (w.shading.location === 'indoor' ? ' wewn.' : ' zewn.') : 'Osłona pominięta') : 'Bez osłony';
            const overhang = w.overhang?.enabled ? (w.tilt === 90
                ? '\nDaszek: ' + n(w.overhang.depth, 2) + ' m; nad oknem: ' + n(w.overhang.distanceAbove, 2) + ' m'
                : '\nDaszek pominięty przy tym pochyleniu') : '';
            return [w.direction + ' / ' + n(w.tilt, 0) + '°', windowTypes[w.type], n(w.width * w.height, 2), n(w.u, 3), n(w.shgc, 2), shade + overhang];
        }), { columnStyles: { 0: { cellWidth: 23 }, 1: { cellWidth: 30 }, 2: { cellWidth: 23, halign: 'right' }, 3: { cellWidth: 26, halign: 'right' }, 4: { cellWidth: 21, halign: 'right' }, 5: { cellWidth: 55 } } });
        pdf.paragraph('Łączna powierzchnia okien: ' + n(room.windows.reduce((sum, w) => sum + w.width * w.height, 0), 2) + ' m². U opisuje przenikanie ciepła; SHGC (g) określa przepuszczalność energii słonecznej.', 8);
    } else pdf.paragraph('Nie wprowadzono okien.');

    pdf.section('Ściany, dachy i pozostałe przegrody', 30);
    if (room.walls.length) {
        pdf.table(['Przegroda / wykończenie', 'Warunki / orientacja', 'Pole [m²]', 'U [W/(m²K)]'], room.walls.map(w => {
            if (w.boundaryType === 'unconditioned') return [
                UNCONDITIONED_PARTITION_PRESETS[w.unconditionedType!].label,
                'Temperatura po drugiej stronie: ' + n(w.adjacentTemperature) + ' °C (stała)',
                n(w.area, 2), n(w.u, 3),
            ];
            return [CTS_PRESETS[w.type].label + '\n' + WALL_MATERIALS[w.material || 'brick_red'].label,
                w.tilt === 0 ? 'Pozioma / 0°' : w.direction + ' / ' + n(w.tilt, 0) + '°', n(w.area, 2), n(w.u, 3)];
        }), { columnStyles: { 0: { cellWidth: 78 }, 1: { cellWidth: 47 }, 2: { cellWidth: 25, halign: 'right' }, 3: { cellWidth: 28, halign: 'right' } } });
    } else pdf.paragraph('Nie wprowadzono ścian, dachów ani pozostałych przegród.');

    pdf.section('Zyski wewnętrzne - ludzie, oświetlenie i urządzenia', 30);
    const internal: string[][] = [];
    const { people, lighting, equipment, advancedAppliances, ventilation: v } = room.internalGains;
    internal.push(people.enabled
        ? ['Ludzie', n(people.count, 0) + ' os. · ' + PEOPLE_ACTIVITY_LEVELS[people.activityLevel].label, scheduleLabel(people.startHour, people.endHour)]
        : ['Ludzie', 'Nie uwzględniono', '-']);
    internal.push(lighting.enabled
        ? ['Oświetlenie', LIGHTING_TYPES[lighting.type].label + ' · ' + n(lighting.powerDensity) + ' W/m²', scheduleLabel(lighting.startHour, lighting.endHour)]
        : ['Oświetlenie', 'Nie uwzględniono', '-']);
    equipment.forEach(e => internal.push([e.name || 'Urządzenie bez nazwy', n(e.power, 0) + ' W × ' + n(e.quantity, 0) + ' szt.', scheduleLabel(e.startHour, e.endHour)]));
    advancedAppliances.forEach(e => internal.push([ADVANCED_APPLIANCES.find(a => a.id === e.catalogId)!.name, n(e.quantity, 0) + ' szt. (parametry katalogowe)', scheduleLabel(e.startHour, e.endHour)]));
    pdf.table(['Źródło ciepła', 'Przyjęte dane', 'Godziny lokalne'], internal, { columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 70 }, 2: { cellWidth: 48 } } });

    const ventilation = [['Wentylacja', ventilationLabel(room)]];
    if (v.enabled && v.type === 'mechanical') {
        ventilation.push(['Wymiennik', VENTILATION_EXCHANGER_TYPES[v.exchangerType].label]);
        ventilation.push(['Odzysk ciepła / wilgoci', n(v.heatRecoveryEfficiency, 0) + '% / ' + n(v.moistureRecoveryEfficiency, 0) + '%']);
    }
    ventilation.push([REPORT_SOURCE_LABELS.infiltration, v.includeInfiltration ? 'Uwzględniony (oszacowanie)' : 'Nie uwzględniono']);
    if (v.includeInfiltration) {
        ventilation.push(['Obwód ścian zewn. / wysokość pomieszczenia', n(v.exteriorWallPerimeter) + ' m / ' + n(v.roomHeight, 2) + ' m']);
        ventilation.push(['Liczba kondygnacji / szczelność', v.buildingStories + ' / ' + ({ tight: 'wysoka', average: 'średnia', leaky: 'niska' }[v.tightnessClass])]);
        ventilation.push(['Osłonięcie przed wiatrem', ({ '1': 'Brak przeszkód - teren otwarty', '2': 'Słabe', '3': 'Umiarkowane', '4': 'Rozproszona zabudowa', '5': 'Silne - gęsta zabudowa lub bliskie przeszkody' }[v.shieldingClass])]);
        ventilation.push(['Prędkość wiatru', n(v.windSpeed) + ' m/s']);
    }
    pdf.section('Wentylacja i infiltracja powietrza', ventilation.length * 9 + 12);
    pdf.table(['Parametr', 'Wartość'], ventilation, { styles: { cellPadding: 2 }, columnStyles: { 0: { cellWidth: 83 }, 1: { cellWidth: 95 } } });

    pdf.section('Typ konstrukcji budynku i akumulacja ciepła', 38);
    const a = room.accumulation;
    if (a.include) {
        pdf.table(['Parametr', 'Przyjęty wariant'], [
            ['Typ budynku / pomieszczenia', RTS_PRESETS[a.rtsPreset].label],
            ['Wykończenie podłogi', FLOOR_TYPE_LABELS[a.floorType]],
        ], { styles: { cellPadding: 2 }, columnStyles: { 0: { cellWidth: 70 }, 1: { cellWidth: 108 } } });
        pdf.paragraph('Model uwzględnia akumulację ciepła w masie budynku (bezwładność cieplną) i oddawanie zgromadzonego ciepła do powietrza z opóźnieniem.', 8.5);
    } else {
        pdf.table(['Parametr', 'Przyjęty wariant'], [
            ['Akumulacja ciepła wewnątrz pomieszczenia', 'Pominięta'],
        ], { styles: { cellPadding: 2 }, columnStyles: { 0: { cellWidth: 105 }, 1: { cellWidth: 73 } } });
        pdf.paragraph('Zyski ciepła przeliczono na obciążenie chłodnicze bez dodatkowego opóźnienia wynikającego z bezwładności cieplnej wnętrza.', 8.5);
    }

    pdf.section('Dobowy bilans składowych obciążenia chłodniczego', 82);
    pdf.image(componentsImage(room, 62), 62);
    pdf.paragraph(componentsNote(month), 8.5);
    pdf.section('Informacje końcowe', 36);
    pdf.paragraph(REPORT_SCOPE, 8.5);
    pdf.paragraph(DISCLAIMER, 8);
    pdf.paragraph('Autor programu: Łukasz Sowiński', 8);
    pdf.finish(reportFileName('Raport_Pomieszczenia', state.projectName, room.name));
};
