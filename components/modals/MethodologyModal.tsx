import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCalculator } from '../../contexts/CalculatorContext';

const MethodologyModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const isOpen = state.modal.isOpen && state.modal.type === 'methodology';

    const handleClose = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={handleClose} 
            title="Metodologia Obliczeniowa"
            maxWidth="max-w-4xl"
            footer={<Button onClick={handleClose}>Zamknij</Button>}
        >
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-4">
                <p>Kalkulator wykorzystuje zaawansowane, zgodne ze standardami inżynierskimi metody do symulacji zysków ciepła. Poniższe punkty szczegółowo opisują proces obliczeniowy.</p>
                <ol className="list-decimal list-inside space-y-3">
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Podstawa Klimatyczna – Dwa Scenariusze Pogodowe</strong>
                        <p className="mt-1">U podstaw wszystkich obliczeń leżą dane klimatyczne dla lokalizacji Warszawa (52.23°N, 21.01°E). Aby zapewnić pełen obraz analityczny, kalkulator korzysta z dwóch niezależnych, godzinowych baz danych.</p>
                        <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                            <li><strong className="font-medium">Scenariusz Projektowy (Clear Sky):</strong> Wykorzystuje dane z bazy NSRDB (National Solar Radiation Database). Reprezentuje on teoretyczne, maksymalne nasłonecznienie w idealnych, bezchmurnych warunkach i jest kluczowy przy projektowaniu systemów chłodzenia.</li>
                            <li><strong className="font-medium">Scenariusz Typowy (Global):</strong> Wykorzystuje dane z bazy PVGIS (Photovoltaic Geographical Information System), bazujące na tzw. "typowym roku meteorologicznym" (TMY). Dane te uwzględniają statystyczne, wieloletnie uśrednione zachmurzenie, co reprezentuje bardziej realistyczny, przeciętny dzień.</li>
                        </ul>
                    </li>
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Zyski Ciepła Zewnętrzne (Przez Okna)</strong>
                        <p className="mt-1">Kalkulacje zysków od słońca opierają się na dynamicznym współczynniku SHGC, który zmienia się w zależności od kąta padania promieni słonecznych. Zyski ciepła od różnicy temperatur (przewodzenie) są również uwzględniane.</p>
                    </li>
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Zyski Ciepła Wewnętrzne</strong>
                        <p className="mt-1">Kalkulator umożliwia dodanie zysków wewnętrznych od ludzi, oświetlenia i sprzętu, zgodnie z danymi z normy ASHRAE. Zyski te dzielone są na:</p>
                        <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                            <li><strong className="font-medium">Ciepło jawne (sensible heat):</strong> Podnoszące temperaturę powietrza. Jest ono dalej dzielone na część radiacyjną (opóźnioną) i konwekcyjną (natychmiastową).</li>
                            <li><strong className="font-medium">Ciepło utajone (latent heat):</strong> Związane z wilgocią (np. od ludzi), które jest natychmiastowym obciążeniem dla systemu klimatyzacji, ale nie podnosi temperatury w pomieszczeniu.</li>
                        </ul>
                    </li>
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Model Akumulacji Ciepła (Metoda RTS)</strong>
                        <p className="mt-1">Aby precyzyjnie symulować, jak zyski ciepła przekładają się na faktyczne obciążenie chłodnicze, kalkulator implementuje Metodę Szeregów Czasowych Promieniowania <strong className="font-medium">(Radiant Time Series - RTS)</strong>, opisaną w standardach ASHRAE.</p>
                        <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                            <li><strong className="font-medium">Fizyczna zasada:</strong> Zyski o charakterze radiacyjnym (od słońca, oświetlenia, ludzi, sprzętu, a także część zysków od przewodzenia) są najpierw absorbowane przez masę termiczną budynku (ściany, strop, meble), a następnie stopniowo uwalniane do pomieszczenia z opóźnieniem.</li>
                            <li><strong className="font-medium">Implementacja matematyczna:</strong> Algorytm rozkłada obliczone zyski radiacyjne z każdej godziny na 24 kolejne godziny. Współczynniki użyte do tego rozkładu w czasie (RTS factors) pochodzą bezpośrednio z opracowań ASHRAE.</li>
                        </ul>
                    </li>
                </ol>
                <hr className="my-4 border-slate-200 dark:border-slate-700" />
                <strong className="font-semibold text-slate-800 dark:text-slate-100">Główne Założenia i Ograniczenia:</strong>
                <ul className="list-disc list-inside pl-4 mt-2 space-y-1">
                    <li>Model nie uwzględnia zysków/strat przez ściany nieprzezroczyste, dach, podłogę na gruncie oraz infiltrację/wentylację.</li>
                    <li>Kalkulator jest w fazie aktywnego rozwoju.</li>
                </ul>
            </div>
        </Modal>
    );
};

export default MethodologyModal;