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
                <p>
                    Kalkulator wykorzystuje rygorystyczne, zgodne ze światowymi standardami inżynierskimi metody symulacji i określania obciążeń chłodniczych (bazujące na wytycznych <strong>ASHRAE</strong>). Poniższe punkty szczegółowo opisują ujęte parametry i proces obliczeniowy zaimplementowany w aplikacji.
                </p>
                <ol className="list-decimal list-inside space-y-4">
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Podstawa Klimatyczna i Zjawiska Słoneczne (Clear Sky Model)</strong>
                        <p className="mt-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            Obliczenia bazują na profilach klimatycznych i geometrycznym położeniu Słońca dla referencyjnej lokalizacji w Polsce. Stosowany jest model całkowicie bezchmurnego nieba (Clear Sky), gwarantujący najwyższe teoretyczne natężenie promieniowania słonecznego w cyklu dobowym. Stanowi to bezpieczny margines projektowy przy doborze mocy klimatyzatorów na najbardziej ekstremalne, letnie fale upałów.
                        </p>
                    </li>
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Przegrody Przezroczyste (Zyski od Okien i Osłon)</strong>
                        <p className="mt-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            Zyski przez oszklenie wyliczane są jako suma przewodzenia (w zależności od wsp. U i różnicy temperatur) oraz bardzo dynamicznych krótkofalowych zysków słonecznych (SHGC / wsp. g). System w każdej z 24 godzin wylicza kąt padania promieni świetlnych względem fasady, rozróżniając promieniowanie bezpośrednie i rozproszone. Kalkulator zaawansowanie modeluje skuteczność wybranych osłon okiennych (np. jasne rolety zewnętrzne działają zupełnie inaczej niż ciemne zasłony wewnętrzne). Dodatkowo zaimplementowano algorytmy geometrycznego rzucania cienia przez nawisy i daszki, drastycznie zmniejszające obciążenie.
                        </p>
                    </li>
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Przegrody Nieprzezroczyste (Ściany Zewnętrzne i Stropodachy)</strong>
                        <p className="mt-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            Wpływ przegród masywnych obliczany jest na bazie tzw. temperatury słoneczno-powietrznej (Sol-Air Temperature). Oznacza to, że uwzględniana jest nie tylko sucha różnica temperatur między zewnątrz a wewnątrz budynku, lecz także intensywne nagrzewanie się fasady i dachu z powodu pochłaniania promieni słonecznych. Współczynnik absorpcji zależy bezpośrednio od wybranego koloru elewacji.
                        </p>
                    </li>
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Zyski Wewnętrzne (Ludzie, Oświetlenie, Sprzęt)</strong>
                        <p className="mt-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            Ciepło generowane z wnętrza w podziale na stopień aktywności, rodzaj zastosowanego światła czy klasy poboru urządzeń biurowych/serwerowych. Zyski od domowników czy biura dzielone są termodynamicznie w czasie na ciepło <strong>jawne</strong> (sensible - błyskawicznie lub radiacyjnie podnoszące docelową temperaturę) oraz ciepło <strong>utajone</strong> (latent - zbytnia produkcja wilgoci, z którą również sprawnie musi poradzić sobie system klimatyzacji poprzez kondensację w parowniku).
                        </p>
                    </li>
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Cyrkulacja Powietrza (Wentylacja i Infiltracja)</strong>
                        <p className="mt-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            System rozdziela wymianę powietrza na sterowaną wymianę przez centrale nawiewne ze sprawnościowymi wymiennikami ciepła/odzyskiem (rekuperacja) oraz na niekontrolowany, naturalny strumień powietrza zewnętrznego zaciąganego przy wentylacji grawitacyjnej (wyliczany z kubatury układu) lub infiltrujący poprzez rozszczelnienia stolarki i konstrukcji. Obliczane są różnice entalpii, aby uzyskać dokładne składowe jawne i utajone wywołane świeżym nawiewanymi woluminami powietrza.
                        </p>
                    </li>
                    <li>
                        <strong className="font-semibold text-slate-800 dark:text-slate-100">Zaawansowany Model Akumulacji Ciepła (ASHRAE Radiant Time Series - RTS)</strong>
                        <p className="mt-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
                            Jest to kluczowy, najbardziej precyzyjny aspekt w branżowym profesjonalnym doborze urządzeń chłodzących, który <strong>zapobiega drastycznemu i kosztownemu przewymiarowaniu klimatyzatorów</strong>. Metoda RTS matematychnie filtruje konwekcyjne obciążenia od ułamków radiacyjnych. Na podstawie pojemności cieplnej wyposażenia budynku (masywności, od konstrukcji lekkich do ciężkiego żelbetu), promieniowanie pochłaniane jest pierwotnie przez mury, posadzki dając opóźniony wyrzut w strefie przebywania. Używając tablicowych czynników czasu promieniowania (Radiant Time Factors), proces uwalniania zysków ciepła przesuwa się nierzadko o kilka do kilkunastu godzin poza główny szczyt solarny, znacznie wypłaszczając krzywą realnego wymaganego chłodu u zbiegu doby.
                        </p>
                    </li>
                </ol>
            </div>
        </Modal>
    );
};

export default MethodologyModal;