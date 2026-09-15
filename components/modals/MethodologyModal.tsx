import React from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useCalculator } from '../../contexts/CalculatorContext';

const MethodologyModal: React.FC = () => {
    const { state, dispatch } = useCalculator();
    const isOpen = state.modal.isOpen && state.modal.type === 'methodology';

    const handleClose = () => dispatch({ type: 'SET_MODAL', payload: { isOpen: false } });
    const descriptionClass = 'mt-1 pl-4 border-l-2 border-slate-200 dark:border-slate-700';
    const headingClass = 'font-semibold text-slate-800 dark:text-slate-100';

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title="Metodologia obliczeniowa"
            maxWidth="max-w-4xl"
            footer={<Button onClick={handleClose}>Zamknij</Button>}
        >
            <div className="text-sm text-slate-700 dark:text-slate-300 space-y-4">
                <p>
                    Kalkulator służy do szybkiego szacowania projektowego obciążenia chłodniczego mieszkań, domów oraz małych obiektów usługowych i komercyjnych. Silnik bazuje na metodzie <strong>ASHRAE Radiant Time Series (RTS)</strong>, ale zawiera opisane poniżej świadome uproszczenia i współczynniki dopasowane do typowych polskich budynków. Nie jest to pełna, dynamiczna symulacja energetyczna budynku.
                </p>

                <ol className="list-decimal list-inside space-y-4">
                    <li>
                        <strong className={headingClass}>Warunki klimatyczne i promieniowanie słoneczne</strong>
                        <p className={descriptionClass}>
                            Obliczenia wykorzystują dane pogodowe i geometrię Słońca dla Warszawy oraz model bezchmurnego nieba Clear Sky. Analiza wartości szczytowej jest celowo ograniczona do miesięcy od kwietnia do września. Clear Sky reprezentuje wymagający dzień projektowy, a nie prognozę rzeczywistej pogody ani zużycia energii.
                        </p>
                    </li>

                    <li>
                        <strong className={headingClass}>Okna i osłony przeciwsłoneczne</strong>
                        <p className={descriptionClass}>
                            Zyski przez przeszklenia obejmują przewodzenie zależne od U i różnicy temperatur oraz promieniowanie słoneczne zależne od SHGC, kierunku i pochylenia okna. Uwzględniane są wybrane osłony, ich położenie oraz geometryczne zacienienie przez daszek lub balkon. Program nie modeluje pełnego otoczenia 3D, dlatego pominięcie sąsiednich przeszkód może dać wynik konserwatywny.
                        </p>
                    </li>

                    <li>
                        <strong className={headingClass}>Zewnętrzne ściany, dachy i stropodachy</strong>
                        <p className={descriptionClass}>
                            Dla przegród zewnętrznych stosowana jest temperatura słoneczno-powietrzna Sol-Air, uwzględniająca temperaturę zewnętrzną, promieniowanie słoneczne, kolor powierzchni oraz korektę promieniowania długofalowego dachu. Przepływ ciepła jest rozkładany w czasie za pomocą współczynników CTS. Dostępne presety CTS zostały przygotowane dla reprezentatywnych konstrukcji spotykanych w Polsce.
                        </p>
                    </li>

                    <li>
                        <strong className={headingClass}>Przegrody do nieklimatyzowanych przestrzeni</strong>
                        <p className={descriptionClass}>
                            Strop pod gorącym poddaszem, ściana lub podłoga do sąsiedniej nieklimatyzowanej przestrzeni są liczone w sposób uproszczony jako stałe <strong>U × A × ΔT</strong>. Użytkownik podaje stałą temperaturę po drugiej stronie przegrody. Dla tych elementów nie stosuje się nasłonecznienia, CTS ani dodatkowego opóźnienia RTS.
                        </p>
                    </li>

                    <li>
                        <strong className={headingClass}>Zyski wewnętrzne</strong>
                        <p className={descriptionClass}>
                            Ludzie, oświetlenie i urządzenia są uwzględniane zgodnie z podanymi mocami i harmonogramami. Zyski dzielone są na część jawną konwekcyjną, jawną radiacyjną oraz — tam, gdzie występuje — część utajoną związaną z wilgocią.
                        </p>
                    </li>

                    <li>
                        <strong className={headingClass}>Wentylacja i infiltracja</strong>
                        <p className={descriptionClass}>
                            Wentylacja mechaniczna lub naturalna może wnosić obciążenie jawne i utajone. Model pozwala uwzględnić odzysk ciepła i wilgoci. Infiltracja jest oszacowaniem opartym na uproszczonych danych o szczelności, osłonięciu i wietrze; nie zastępuje pomiaru szczelności ani szczegółowej symulacji przepływu powietrza.
                        </p>
                    </li>

                    <li>
                        <strong className={headingClass}>Akumulacja ciepła — RTS</strong>
                        <p className={descriptionClass}>
                            Radiacyjna część zysków nie staje się natychmiast obciążeniem chłodniczym: jest pochłaniana przez powierzchnie pomieszczenia i oddawana z opóźnieniem. Program wykorzystuje 24-godzinne szeregi RTS zależne od wybranego typu pomieszczenia, rodzaju podłogi i udziału przeszkleń. Presety RTS zostały przygotowane dla typowych polskich konstrukcji przy użyciu narzędzia opartego na procedurze ASHRAE.
                        </p>
                    </li>

                    <li>
                        <strong className={headingClass}>Zakres wyniku</strong>
                        <p className={descriptionClass}>
                            Wynik przedstawia godzinowe obciążenie jawne i utajone oraz ich jednoczesną wartość szczytową. Jest pomocą przy doborze klimatyzacji typu split, multi-split i małych układów VRF. Ostateczny dobór urządzenia powinien dodatkowo uwzględniać charakterystykę producenta, temperaturę pracy, wymagany zapas oraz rzeczywisty sposób użytkowania obiektu.
                        </p>
                    </li>
                </ol>
            </div>
        </Modal>
    );
};

export default MethodologyModal;
