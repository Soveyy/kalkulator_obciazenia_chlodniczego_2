import type { AccumulationSettings, RtsPresetId } from '../types';

export interface RtsPresetDefinition {
    label: string;
    menuDescription: string;
    category: string;
    summary: string;
    recommendedFor: string;
    geometry: string;
    externalWall: string;
    internalWalls: string;
    floor: string;
    ceiling: string;
    thermalEffect: string;
    note?: string;
    color: string;
}

export const RTS_PRESET_IDS: RtsPresetId[] = [
    'heavy',
    'medium',
    'attic',
    'single_storey',
    'office',
    'light',
    'large_panel',
    'tenement',
    'warehouse',
];

export const RTS_PRESETS: Record<RtsPresetId, RtsPresetDefinition> = {
    heavy: {
        label: 'Konstrukcja ciężka',
        menuDescription: 'murowana, silikatowe działówki i stropy żelbetowe',
        category: 'Budownictwo murowane',
        summary: 'Masywna konstrukcja, w której ściany wewnętrzne i stropy pozostają dobrze dostępne dla zysków promieniowania.',
        recommendedFor: 'Współczesny dom lub budynek murowany z ciężkimi działówkami oraz żelbetowymi stropami.',
        geometry: 'Model referencyjny 4,0 × 5,0 × 2,7 m; jedna ściana zewnętrzna i trzy wewnętrzne.',
        externalWall: 'Tynk c-w. 15 mm, EPS 150 mm, Porotherm 250 mm, tynk gipsowy 15 mm.',
        internalWalls: 'Tynk gipsowy 10 mm, silikat 120 mm, tynk gipsowy 10 mm.',
        floor: 'Wybrane wykończenie, wylewka 60 mm, EPS 50 mm i żelbet 180 mm.',
        ceiling: 'Tynk gipsowy 15 mm i strop żelbetowy 180 mm.',
        thermalEffect: 'Duża dostępna masa mocno opóźnia zyski radiacyjne i spłaszcza ich godzinowy szczyt.',
        color: '#d97706',
    },
    medium: {
        label: 'Konstrukcja średnia',
        menuDescription: 'murowana z lżejszymi działówkami z betonu komórkowego',
        category: 'Budownictwo murowane',
        summary: 'Typowa konstrukcja murowana z ciężką podłogą i stropem, ale lżejszymi ścianami działowymi.',
        recommendedFor: 'Nowe mieszkania i domy murowane, w których działówki wykonano z betonu komórkowego zamiast silikatów lub żelbetu.',
        geometry: 'Model referencyjny 4,0 × 5,0 × 2,7 m; jedna ściana zewnętrzna i trzy wewnętrzne.',
        externalWall: 'Tynk c-w. 15 mm, EPS 200 mm, Porotherm 250 mm, tynk gipsowy 15 mm.',
        internalWalls: 'Tynk gipsowy 10 mm, beton komórkowy 600 — 120 mm, tynk gipsowy 10 mm.',
        floor: 'Wybrane wykończenie, wylewka 60 mm, EPS 50 mm i żelbet 180 mm.',
        ceiling: 'Tynk gipsowy 15 mm i strop żelbetowy 180 mm.',
        thermalEffect: 'Umiarkowanie duża bezwładność; reakcja jest nieco szybsza niż w konstrukcji ciężkiej.',
        color: '#10b981',
    },
    attic: {
        label: 'Poddasze użytkowe',
        menuDescription: 'lekkie skosy dachu i ciężka podłoga',
        category: 'Pomieszczenia pod dachem',
        summary: 'Narożne pomieszczenie pod dachem czterospadowym, z lekkimi skosami i bez żelbetowego stropu nad wnętrzem.',
        recommendedFor: 'Użytkowe poddasze ze ściankami kolankowymi, murowanymi ścianami i ocieplonymi skosami z płytą g-k.',
        geometry: 'Rzut 4,0 × 5,0 m, Hmax 2,7 m, ścianki kolankowe 1,2 m; skosy 35° o łącznym polu 24,42 m².',
        externalWall: 'Ścianki kolankowe: tynk c-w. 15 mm, EPS 200 mm, Porotherm 250 mm, tynk gipsowy 15 mm.',
        internalWalls: 'Dwie ściany z BK 600 — 120 mm, przyjęte jako 70% pełnego pola ścian.',
        floor: 'Wybrane wykończenie, wylewka 60 mm, EPS 50 mm i żelbet 180 mm.',
        ceiling: 'Skosy: płyta g-k 12,5 mm oraz 350 mm warstwy zastępczej 15% krokwi / 85% wełny.',
        thermalEffect: 'Ciężka podłoga nadal akumuluje ciepło, lecz lekkie skosy przyspieszają odpowiedź pomieszczenia.',
        note: 'Udział przeszklenia odnosi się do pionowych ścianek kolankowych lub lukarn, a nie do okien połaciowych.',
        color: '#8b5cf6',
    },
    single_storey: {
        label: 'Pomieszczenie z lekkim stropem',
        menuDescription: 'murowane ściany, bez stropu żelbetowego nad pokojem',
        category: 'Budownictwo murowane',
        summary: 'Ciężkie ściany i podłoga jak w domu murowanym, ale lekki strop drewniany odcina masę żelbetowej płyty nad pomieszczeniem.',
        recommendedFor: 'Dom parterowy lub dowolne pomieszczenie, nad którym znajduje się lekki strop belkowy zamiast żelbetu.',
        geometry: 'Model referencyjny 4,0 × 5,0 × 2,7 m; jedna ściana zewnętrzna i trzy wewnętrzne.',
        externalWall: 'Tynk c-w. 15 mm, EPS 150 mm, Porotherm 250 mm, tynk gipsowy 15 mm.',
        internalWalls: 'Tynk gipsowy 10 mm, silikat 120 mm, tynk gipsowy 10 mm.',
        floor: 'Wybrane wykończenie, wylewka 60 mm, EPS 50 mm i żelbet 180 mm.',
        ceiling: 'Płyta g-k 12,5 mm oraz 350 mm warstwy zastępczej 15% belek / 85% wełny.',
        thermalEffect: 'Mniej akumulacji niż w konstrukcji ciężkiej, ponieważ nad pokojem nie ma odsłoniętej masy żelbetowej.',
        color: '#0ea5e9',
    },
    office: {
        label: 'Biuro z sufitem podwieszanym',
        menuDescription: 'lekka zabudowa ogranicza dostęp do masy stropu',
        category: 'Budynki komercyjne',
        summary: 'Sufit podwieszany i lekkie działówki ograniczają kontakt z ciężkim stropem, mimo masywnej konstrukcji budynku.',
        recommendedFor: 'Biura z modułowym sufitem podwieszanym, lekkimi działówkami g-k i żelbetową konstrukcją nośną.',
        geometry: 'Model referencyjny 4,0 × 5,0 × 2,7 m; jedna ściana zewnętrzna i trzy wewnętrzne.',
        externalWall: 'Tynk c-w. 15 mm, EPS 200 mm, żelbet 200 mm, tynk gipsowy 15 mm.',
        internalWalls: 'Płyta g-k 12,5 mm, wełna 100 mm i płyta g-k 12,5 mm.',
        floor: 'Wybrane wykończenie, wylewka 60 mm, EPS 50 mm i żelbet 180 mm.',
        ceiling: 'Płyta akustyczna 19,1 mm, pustka sufitowa 200 mm i żelbet 180 mm.',
        thermalEffect: 'Sufit podwieszany odcina szybką wymianę z masą górnego stropu, dlatego reakcja jest szybsza niż sugeruje sam żelbet.',
        color: '#ec4899',
    },
    light: {
        label: 'Konstrukcja lekka',
        menuDescription: 'dom szkieletowy i sucha zabudowa',
        category: 'Budownictwo lekkie',
        summary: 'Lekka obudowa szkieletowa z niewielką ilością materiałów zdolnych magazynować ciepło.',
        recommendedFor: 'Domy drewniane i szkieletowe, zabudowa modułowa oraz pomieszczenia wykonane głównie w technologii suchej.',
        geometry: 'Model referencyjny 4,0 × 5,0 × 2,7 m; jedna ściana zewnętrzna i trzy wewnętrzne.',
        externalWall: 'EPS 100 mm, OSB 12 mm, szkielet z wełną 150 mm i płyta g-k 12,5 mm.',
        internalWalls: 'Płyta g-k 12,5 mm, wełna 75 mm i płyta g-k 12,5 mm.',
        floor: 'Wybrane wykończenie, OSB 22 mm i lekki strop szkieletowy 200 mm.',
        ceiling: 'Płyta g-k 12,5 mm i lekki strop szkieletowy 200 mm.',
        thermalEffect: 'Mała bezwładność powoduje szybkie przejście zysków radiacyjnych w obciążenie chłodnicze.',
        color: '#3b82f6',
    },
    large_panel: {
        label: 'Wielka płyta',
        menuDescription: 'prefabrykowany blok po termomodernizacji',
        category: 'Budynki istniejące',
        summary: 'Ogólny model ciężkiego budynku prefabrykowanego po wykonaniu zewnętrznego ocieplenia.',
        recommendedFor: 'Mieszkania w blokach z wielkiej płyty, gdy brak dokładnej dokumentacji konkretnego systemu prefabrykacji.',
        geometry: 'Model referencyjny 4,0 × 5,0 × 2,7 m; jedna ściana zewnętrzna i trzy wewnętrzne.',
        externalWall: 'Tynk c-w. 15 mm, EPS 150 mm, prefabrykat żelbetowy 150 mm i tynk gipsowy 10 mm.',
        internalWalls: 'Tynk gipsowy 10 mm, żelbet 80 mm i tynk gipsowy 10 mm.',
        floor: 'Wybrane wykończenie, wylewka 40 mm, EPS 30 mm i żelbet 140 mm.',
        ceiling: 'Tynk gipsowy 10 mm i strop żelbetowy 140 mm.',
        thermalEffect: 'Duża masa prefabrykatów i stropów zapewnia wyraźne opóźnienie zysków ciepła.',
        note: 'Systemy wielkopłytowe istotnie się różnią; przy znanym układzie warstw należy użyć danych z inwentaryzacji.',
        color: '#6366f1',
    },
    tenement: {
        label: 'Kamienica',
        menuDescription: 'grube mury ceglane i ciężki strop Kleina',
        category: 'Budynki istniejące',
        summary: 'Bardzo masywne ściany ceglane połączone z ciężkim, zastępczo modelowanym stropem Kleina.',
        recommendedFor: 'Starsze kamienice ceglane, w których rozpoznano strop Kleina lub inną ciężką konstrukcję stropową.',
        geometry: 'Model referencyjny 4,0 × 5,0 × 2,7 m; jedna ściana zewnętrzna i trzy wewnętrzne.',
        externalWall: 'Tynk c-w. 20 mm, cegła pełna 510 mm i tynk gipsowy 20 mm.',
        internalWalls: 'Tynk gipsowy 15 mm, cegła pełna 120 mm i tynk gipsowy 15 mm.',
        floor: 'Wybrane wykończenie, wylewka 40 mm i zastępczy strop Kleina 180 mm.',
        ceiling: 'Tynk gipsowy 20 mm i zastępczy strop Kleina 180 mm.',
        thermalEffect: 'Bardzo duża masa rozciąga odpowiedź cieplną na wiele godzin.',
        note: 'Nie wybieraj tego wariantu dla kamienicy ze stropem drewnianym.',
        color: '#92400e',
    },
    warehouse: {
        label: 'Hala / magazyn',
        menuDescription: 'lekka obudowa z PIR i masywna posadzka',
        category: 'Budynki przemysłowe',
        summary: 'Bardzo lekka obudowa hali współpracuje z ciężką posadzką betonową jako głównym elementem akumulacyjnym.',
        recommendedFor: 'Puste lub lekko wyposażone hale i magazyny z płyt warstwowych oraz betonową posadzką przemysłową.',
        geometry: 'Model referencyjny 4,0 × 5,0 × 2,7 m; jedna ściana zewnętrzna i trzy wewnętrzne.',
        externalWall: 'Blacha 0,6 mm, rdzeń PIR 120 mm i blacha 0,5 mm.',
        internalWalls: 'Lekka płyta warstwowa: blacha 0,5 mm, PIR 80 mm i blacha 0,5 mm.',
        floor: 'Wybrane wykończenie jako odpowiednik powierzchni, beton przemysłowy 200 mm i EPS 100 mm.',
        ceiling: 'Dach z płyt warstwowych: blacha 0,5/0,6 mm i PIR 160 mm.',
        thermalEffect: 'Obudowa reaguje niemal natychmiast, natomiast odsłonięta posadzka przejmuje znaczną część promieniowania.',
        note: 'Duża ilość składowanego towaru lub wysokie regały mogą istotnie zwiększyć rzeczywistą pojemność cieplną.',
        color: '#64748b',
    },
};

export const FLOOR_TYPE_LABELS: Record<AccumulationSettings['floorType'], string> = {
    panels: 'Drewno / parkiet / panele',
    tiles: 'Płytki / kamień / beton',
    carpet: 'Wykładzina / dywan',
};
