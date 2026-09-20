import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Chart, { type ChartConfiguration } from 'chart.js/auto';
import { ArrowLeft, ArrowUpRight, Building2, CalendarDays, Check, Layers3, Loader2, Maximize2, Minimize2, Snowflake, Sun, Waves, Zap } from 'lucide-react';
import { useCalculator } from '../contexts/CalculatorContext';
import { ANALYSIS_MONTHS, MONTH_NAMES } from '../constants';
import { isRoomResultCurrent, validateRoom } from '../services/validationService';
import { projectPresentationData, type AggregateData } from '../services/projectPresentation';
import './ProjectPresentation.css';

const number = (value: number, digits = 1) => value.toLocaleString('pl-PL', { minimumFractionDigits: digits, maximumFractionDigits: digits });

function PresentationChart({ config, label }: { config: ChartConfiguration; label: string }) {
    const canvas = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        if (!canvas.current) return;
        const chart = new Chart(canvas.current, config);
        return () => chart.destroy();
    }, [config]);
    return <div className="presentation-chart"><canvas ref={canvas} role="img" aria-label={label} /></div>;
}

interface Props {
    aggregate: AggregateData | null;
    onClose: () => void;
}

const ProjectPresentation: React.FC<Props> = ({ aggregate, onClose }) => {
    const { state, theme, dispatch, isCalculating, handleCalculate } = useCalculator();
    const rootRef = useRef<HTMLElement>(null);
    const fullscreenButtonRef = useRef<HTMLButtonElement>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [showRooms, setShowRooms] = useState(true);
    const month = Number(state.rooms[0]?.currentMonth || '7');
    const data = useMemo(() => aggregate ? projectPresentationData(aggregate, month) : null, [aggregate, month]);
    const immersive = fullscreen || expanded;
    const hasShading = state.rooms.some(room => room.windows.some(window => window.shading?.enabled));
    const assigned = new Set(state.systems.flatMap(system => system.indoorUnits.map(unit => unit.roomId)));

    useEffect(() => {
        const root = rootRef.current;
        const onChange = () => {
            const active = document.fullscreenElement === rootRef.current;
            setFullscreen(active);
            if (!active) fullscreenButtonRef.current?.focus({ preventScroll: true });
        };
        const onEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && document.fullscreenElement === rootRef.current) {
                event.preventDefault();
                void document.exitFullscreen().catch(() => {});
            }
        };
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('keydown', onEscape);
        return () => {
            document.removeEventListener('fullscreenchange', onChange);
            document.removeEventListener('keydown', onEscape);
            if (document.fullscreenElement === root) void document.exitFullscreen().catch(() => {});
        };
    }, []);

    // Browsers without native fullscreen still get a complete presentation overlay.
    useEffect(() => {
        if (!expanded) return;
        const previousOverflow = document.body.style.overflow;
        const appRoot = document.getElementById('root');
        const previousInert = appRoot?.inert;
        if (appRoot) appRoot.inert = true;
        document.body.style.overflow = 'hidden';
        rootRef.current?.focus();
        const onKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                setExpanded(false);
            }
            if (event.key === 'Tab') {
                const targets = rootRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), select:not([disabled]), input:not([disabled])');
                if (!targets?.length) return;
                const first = targets[0];
                const last = targets[targets.length - 1];
                if (event.shiftKey && (document.activeElement === first || document.activeElement === rootRef.current)) { event.preventDefault(); last.focus(); }
                else if (!event.shiftKey && (document.activeElement === last || document.activeElement === rootRef.current)) { event.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', onKey);
        return () => {
            document.body.style.overflow = previousOverflow;
            if (appRoot) appRoot.inert = previousInert ?? false;
            document.removeEventListener('keydown', onKey);
            requestAnimationFrame(() => fullscreenButtonRef.current?.focus({ preventScroll: true }));
        };
    }, [expanded]);

    const toggleFullscreen = async () => {
        if (document.fullscreenElement === rootRef.current) { await document.exitFullscreen(); return; }
        if (expanded) { setExpanded(false); return; }
        try {
            if (!rootRef.current?.requestFullscreen) { setExpanded(true); return; }
            await rootRef.current.requestFullscreen();
        } catch { setExpanded(true); }
    };
    const close = async () => {
        if (document.fullscreenElement === rootRef.current) await document.exitFullscreen();
        onClose();
    };
    const changeMonth = (value: number) => dispatch({ type: 'RECALCULATE_ALL_ROOMS', payload: String(value) });

    const charts = useMemo(() => {
        if (!data || !aggregate) return null;
        const dark = theme === 'dark';
        const text = dark ? '#a7b8cf' : '#52657e';
        const grid = dark ? 'rgba(148,163,184,0.10)' : 'rgba(100,116,139,0.12)';
        const common = {
            responsive: true, maintainAspectRatio: false, animation: false as const,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: dark ? '#18263c' : '#ffffff', titleColor: dark ? '#f1f5f9' : '#172b47',
                    bodyColor: dark ? '#cbd5e1' : '#334155', borderColor: dark ? '#384c67' : '#dbe4f0', borderWidth: 1,
                    padding: 12, cornerRadius: 10,
                },
            },
        };
        const scales = {
            x: { grid: { display: false }, border: { display: false }, ticks: { color: text, maxRotation: 0, autoSkip: true, maxTicksLimit: 8 } },
            y: { beginAtZero: true, grid: { color: grid }, border: { display: false }, ticks: { color: text, maxTicksLimit: 5, callback: (value: number | string) => `${number(Number(value), 1)} kW` } },
        };
        const profile: ChartConfiguration = {
            type: 'line', data: {
                labels: Array.from({ length: 24 }, (_, hour) => `${String(hour).padStart(2, '0')}:00`),
                datasets: [
                    { label: 'Cały projekt', data: data.hourly.map(value => value / 1000), borderColor: dark ? '#60a5fa' : '#2563eb', backgroundColor: dark ? 'rgba(59,130,246,.15)' : 'rgba(59,130,246,.09)', fill: true, borderWidth: 3, pointRadius: 0, pointHoverRadius: 5, tension: .25 },
                    ...(showRooms ? data.rooms.map(room => ({ label: room.name, data: room.localProfile.map(value => value / 1000), borderColor: room.color, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, pointHoverRadius: 3, tension: .25, fill: false })) : []),
                ],
            }, options: { ...common, scales, interaction: { mode: 'index', intersect: false }, plugins: { ...common.plugins, tooltip: { ...common.plugins.tooltip, callbacks: { label: context => `${context.dataset.label}: ${number(context.parsed.y ?? 0, 2)} kW` } } } },
        };
        const season: ChartConfiguration = {
            type: 'bar', data: {
                labels: data.season.map(item => MONTH_NAMES[item.month - 1].slice(0, 3)),
                datasets: [{ label: 'Szczyt projektu', data: data.season.map(item => item.peak / 1000), backgroundColor: data.season.map(item => item.month === month ? '#3b82f6' : dark ? '#304866' : '#dbe7f7'), borderColor: data.season.map(item => item.month === data.criticalMonth ? '#f59e0b' : 'transparent'), borderWidth: 2, borderRadius: 6, maxBarThickness: 48 }],
            }, options: { ...common, scales, onClick: (_event, elements) => { if (elements.length) changeMonth(data.season[elements[0].index].month); }, plugins: { ...common.plugins, tooltip: { ...common.plugins.tooltip, callbacks: { title: items => MONTH_NAMES[data.season[items[0].dataIndex].month - 1], label: context => `${number(context.parsed.y ?? 0, 2)} kW` } } } },
        };
        const split: ChartConfiguration<'doughnut'> = {
            type: 'doughnut', data: { labels: ['Chłodzenie jawne', 'Chłodzenie utajone'], datasets: [{ data: [data.sensible / 1000, data.latent / 1000], backgroundColor: ['#3b82f6', '#14b8a6'], borderWidth: 0, hoverOffset: 3 }] },
            options: { ...common, cutout: '78%', plugins: { ...common.plugins, tooltip: { ...common.plugins.tooltip, callbacks: { label: context => `${context.label}: ${number(Number(context.raw), 2)} kW` } } } },
        };
        return { profile, season, split };
    }, [data, aggregate, theme, showRooms, month, dispatch]);

    const content = (
        <section ref={rootRef} aria-label="Prezentacja projektu" role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined} tabIndex={-1} className={`project-presentation ${theme === 'dark' ? 'presentation-dark' : ''} ${expanded ? 'presentation-expanded' : ''}`}>
            <header className="presentation-header">
                <div className="presentation-identity">
                    <span className="presentation-logo"><Snowflake size={25} aria-hidden="true" /></span>
                    <div className="presentation-project-name">
                        <p className="presentation-eyebrow">Kalkulator HVAC RTS <span>/ Prezentacja projektu</span></p>
                        <h2 title={state.projectName}>{state.projectName || 'Projekt bez nazwy'}</h2>
                        <p className="presentation-meta">{state.rooms.length} pom. {data && <>· {number(data.totalArea)} m²</>} · Warszawa · {MONTH_NAMES[month - 1]}</p>
                    </div>
                </div>
                <div className="presentation-actions">
                    <label className="presentation-month"><CalendarDays size={16} aria-hidden="true" /><span className="sr-only">Miesiąc prezentacji</span>
                        <select aria-label="Miesiąc prezentacji" value={month} disabled={!aggregate || isCalculating} onChange={event => changeMonth(Number(event.target.value))}>
                            {MONTH_NAMES.map((name, index) => index + 1 >= ANALYSIS_MONTHS.START && index + 1 <= ANALYSIS_MONTHS.END && <option key={name} value={index + 1}>{name}</option>)}
                        </select>
                    </label>
                    {hasShading && <button className={`presentation-button presentation-shading ${state.isShadingViewActive ? 'is-active' : ''}`} aria-pressed={state.isShadingViewActive} disabled={!aggregate || isCalculating} onClick={() => dispatch({ type: 'SET_SHADING_VIEW', payload: !state.isShadingViewActive })} title="Przełącza wyniki całego projektu. Zachowuje konfigurację osłon w oknach."><Sun size={16} aria-hidden="true" />{state.isShadingViewActive ? 'Z osłonami' : 'Bez osłon'}</button>}
                    <button ref={fullscreenButtonRef} className="presentation-button" onClick={toggleFullscreen} aria-label={immersive ? 'Opuść pełny ekran' : 'Pełny ekran prezentacji'} title={immersive ? 'Opuść pełny ekran (Esc)' : 'Pełny ekran'}>{immersive ? <Minimize2 size={17} /> : <Maximize2 size={17} />}<span className="presentation-fullscreen-label">{immersive ? 'Pomniejsz' : 'Pełny ekran'}</span></button>
                    <button className="presentation-button" onClick={close} title="Wróć do analizy i doboru"><ArrowLeft size={17} aria-hidden="true" /><span>Do analizy</span></button>
                </div>
            </header>

            {!aggregate || !data || !charts || isCalculating ? (
                <div className="presentation-empty" role="status">
                    {isCalculating ? <Loader2 size={32} className="animate-spin" /> : <Building2 size={36} />}
                    <h3>{isCalculating ? 'Przeliczanie projektu…' : 'Przygotuj wyniki projektu'}</h3>
                    <p>{isCalculating ? 'Dashboard pojawi się po zakończeniu obliczeń.' : 'Prezentacja wymaga aktualnych wyników wszystkich pomieszczeń dla tego samego miesiąca.'}</p>
                    {!isCalculating && <>
                        <div className="presentation-missing-rooms">{state.rooms.filter(room => !isRoomResultCurrent(room)).map(room => <button className="presentation-button" key={room.id} onClick={async () => { await close(); dispatch({ type: 'SWITCH_ROOM', payload: room.id }); dispatch({ type: 'SET_ACTIVE_TAB', payload: 'input' }); }}>{room.name}<ArrowUpRight size={14} /></button>)}</div>
                        {state.rooms.every(room => !validateRoom(room).some(issue => issue.severity === 'error')) && <button className="presentation-button is-active" onClick={handleCalculate}>Przelicz cały projekt</button>}
                    </>}
                </div>
            ) : <>
                <div className="presentation-kpis">
                    <article className="presentation-kpi presentation-kpi-primary">
                        <p><Snowflake size={15} />Szczyt projektu</p>
                        <strong>{number(aggregate.aggregatePeak / 1000, 2)} <small>kW</small></strong>
                        <span>{aggregate.aggregatePeak > 0 ? `godz. ${String(data.localPeakHour).padStart(2, '0')}:00` : 'Brak zapotrzebowania'} · {number(data.loadDensity)} W/m²</span>
                    </article>
                    <article className="presentation-kpi"><p><Layers3 size={15} />Suma szczytów pomieszczeń</p><strong>{number(aggregate.sumOfPeaks / 1000, 2)} <small>kW</small></strong><span>Każde w swoim najgorszym miesiącu</span></article>
                    <article className="presentation-kpi"><p><Waves size={15} />Jednoczesność</p><strong>{aggregate.sumOfPeaks > 0 ? number(aggregate.diversityFactor * 100) : '—'} <small>%</small></strong><span>Szczyt projektu / suma szczytów</span></article>
                    <article className="presentation-kpi"><p><Zap size={15} />Energia chłodnicza / doba</p><strong>{number(data.coolingEnergyKWh)} <small>kWh</small></strong><span>Doba obliczeniowa · {MONTH_NAMES[month - 1]}</span></article>
                </div>

                <div className="presentation-visuals">
                    <article className="presentation-panel presentation-profile">
                        <div className="presentation-panel-heading"><div><h3>Rytm dobowy projektu</h3><p>Wymagane chłodzenie · czas lokalny UTC+{month >= 4 && month <= 10 ? 2 : 1}</p></div>
                            {data.rooms.length > 1 && <label className="presentation-rooms-toggle"><input type="checkbox" checked={showRooms} onChange={event => setShowRooms(event.target.checked)} />Profile pomieszczeń</label>}
                        </div>
                        <PresentationChart config={charts.profile} label={aggregate.aggregatePeak > 0 ? `Dobowy profil projektu. Szczyt ${number(aggregate.aggregatePeak / 1000, 2)} kW o godzinie ${data.localPeakHour}.` : 'Dobowy profil projektu. Brak zapotrzebowania na chłodzenie.'} />
                        <div className="presentation-chart-note"><span className="presentation-line-key" />Cały projekt{showRooms && data.rooms.length > 1 && <span>Linie przerywane: pomieszczenia według kolorów obok</span>}</div>
                    </article>

                    <article className="presentation-panel presentation-ranking">
                        <div className="presentation-panel-heading"><div><h3>Pomieszczenia w szczycie</h3><p>{aggregate.aggregatePeak > 0 ? `Udział o godz. ${String(data.localPeakHour).padStart(2, '0')}:00 · ${MONTH_NAMES[month - 1]}` : 'Brak zapotrzebowania na chłodzenie'}</p></div><Building2 size={19} /></div>
                        <ol className="presentation-room-list" aria-label="Udział pomieszczeń w szczycie projektu">
                            {data.ranking.map(room => <li key={room.id}>
                                <div className="presentation-room-top"><span className="presentation-room-name" title={room.name}><i style={{ background: room.color }} />{room.name}</span><strong>{number(room.coincidentLoad / 1000, 2)} <small>kW</small></strong></div>
                                <div className="presentation-room-track"><span style={{ width: `${room.share * 100}%`, background: room.color }} /></div>
                                <div className="presentation-room-details"><span>{number(room.share * 100)}% szczytu projektu</span><span title="Indywidualne maksimum w sezonie">Maks. {number(room.worstPeak / 1000, 2)} kW</span></div>
                            </li>)}
                        </ol>
                        <div className="presentation-ranking-footer"><Check size={15} />Przypisano do układów: {state.rooms.filter(room => assigned.has(room.id)).length}/{state.rooms.length}<span>Układy: {state.systems.length}</span></div>
                    </article>

                    <article className="presentation-panel presentation-season">
                        <div className="presentation-panel-heading"><div><h3>Sezon chłodniczy</h3><p>Szczyty projektu · kwiecień–wrzesień</p></div>{data.criticalMonth && <span className="presentation-critical">Maks. {MONTH_NAMES[data.criticalMonth - 1]}</span>}</div>
                        {data.season.length ? <PresentationChart config={charts.season} label={`Miesięczne szczyty projektu: ${data.season.map(item => `${MONTH_NAMES[item.month - 1]} ${number(item.peak / 1000, 2)} kW`).join(', ')}.`} /> : <p className="presentation-chart-note">Przelicz projekt, aby uzupełnić analizę sezonową.</p>}
                        <p className="presentation-chart-note">Kliknij miesiąc, aby zmienić widok. Obrys oznacza maksimum sezonu.</p>
                    </article>

                    <article className="presentation-panel presentation-split">
                        <div className="presentation-panel-heading"><div><h3>Struktura chłodzenia</h3><p>W godzinie szczytu projektu</p></div></div>
                        <div className="presentation-split-body">
                            <div className="presentation-donut">{aggregate.aggregatePeak > 0 ? <PresentationChart config={charts.split} label={`Chłodzenie jawne ${number(data.sensible / 1000, 2)} kW, utajone ${number(data.latent / 1000, 2)} kW.`} /> : <div className="presentation-zero-ring" />}<div className="presentation-donut-label"><strong>{aggregate.aggregatePeak > 0 ? number(data.sensible / aggregate.aggregatePeak * 100, 0) : '—'}<small>%</small></strong><span>jawne</span></div></div>
                            <div className="presentation-split-legend"><div><span><i style={{ background: '#3b82f6' }} />Jawne</span><strong>{number(data.sensible / 1000, 2)} <small>kW</small></strong></div><div><span><i style={{ background: '#14b8a6' }} />Utajone</span><strong>{number(data.latent / 1000, 2)} <small>kW</small></strong></div></div>
                        </div>
                        <p className="presentation-chart-note">Suma wymaganego chłodzenia poszczególnych pomieszczeń.</p>
                    </article>
                </div>
                <footer className="presentation-footer"><span><span className="presentation-live-dot" />Wyniki aktualne · {hasShading ? state.isShadingViewActive ? 'wariant z osłonami' : 'wariant bez osłon' : 'bez aktywnych osłon'}</span><span>Metoda RTS · projektowa doba obliczeniowa{immersive ? ' · Esc: powrót' : ''}</span></footer>
            </>}
        </section>
    );

    return expanded ? createPortal(content, document.body) : content;
};

export default ProjectPresentation;
