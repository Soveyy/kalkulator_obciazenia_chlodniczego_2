
import React, { useEffect, useId, useState } from 'react';
import { NUMBER_RULES, numberIssue } from '../../services/validationService';

type Props = React.InputHTMLAttributes<HTMLInputElement> & { rule?: keyof typeof NUMBER_RULES };
const FIELD_RULES: Record<string, keyof typeof NUMBER_RULES> = {
    roomArea: 'area', area: 'area', width: 'dimension', height: 'dimension', roomHeight: 'dimension',
    u: 'u', shgc: 'fraction', tInternal: 'temperature', adjacentTemperature: 'adjacentTemperature',
    rhInternal: 'percent', heatRecoveryEfficiency: 'percent', moistureRecoveryEfficiency: 'percent',
    airflow: 'airflow', naturalVentilationAirflow: 'airflow', windSpeed: 'wind', exteriorWallPerimeter: 'length',
    count: 'count', quantity: 'count', power: 'power', powerDensity: 'power', depth: 'overhang', distanceAbove: 'overhang',
};
const Input = React.forwardRef<HTMLInputElement, Props>(({ className = '', rule, ...props }, ref) => {
    const baseClasses = "w-full box-border px-2 py-1.5 lg:px-3 lg:py-2 text-sm lg:text-base border border-slate-300 dark:border-slate-600 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20 transition-all duration-200";
    const numeric = props.type === 'number';
    const [editing, setEditing] = useState(false);
    const [touched, setTouched] = useState(false);
    const [draft, setDraft] = useState(String(props.value ?? ''));
    const errorId = useId();
    useEffect(() => { if (!editing) setDraft(String(props.value ?? '')); }, [props.value, editing]);
    const selectedRule = rule ?? FIELD_RULES[props.name ?? ''];
    const error = numeric && selectedRule && (touched || draft !== '') ? numberIssue(draft, NUMBER_RULES[selectedRule]) : undefined;
    if (!numeric) return <input ref={ref} className={`${baseClasses} ${className}`} {...props} />;
    return <>
        <input {...props} ref={ref} type="text" inputMode="decimal" value={draft}
            className={`${baseClasses} ${className} ${error ? 'border-red-500' : ''}`}
            aria-invalid={Boolean(error)} aria-describedby={error ? errorId : props['aria-describedby']}
            onFocus={event => { setEditing(true); props.onFocus?.(event); }}
            onBlur={event => { setEditing(false); setTouched(true); props.onBlur?.(event); }}
            onChange={event => {
                const raw = event.target.value;
                setDraft(raw);
                const value = raw.replace(',', '.');
                props.onChange?.({ ...event, target: { name: props.name ?? '', value, type: 'number', checked: false } } as React.ChangeEvent<HTMLInputElement>);
            }} />
        {error && <p id={errorId} className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
    </>;
});

Input.displayName = 'Input';
export default Input;
