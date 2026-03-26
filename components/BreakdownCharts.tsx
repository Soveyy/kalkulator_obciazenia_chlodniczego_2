import React, { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Sector } from 'recharts';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';

const NODE_COLORS: Record<string, string> = {
    'Okna': '#f1c40f',
    'Ściany': '#d35400',
    'Ludzie': '#e67e22',
    'Oświetlenie': '#e74c3c',
    'Sprzęt': '#9b59b6',
    'Wentylacja': '#3498db',
    'Infiltracja': '#2ecc71',
    'Ciepło Jawne': '#ff7675',
    'Ciepło Utajone': '#74b9ff',
};

const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
    return (
        <g>
            <Sector
                cx={cx}
                cy={cy}
                innerRadius={innerRadius}
                outerRadius={outerRadius + 10}
                startAngle={startAngle}
                endAngle={endAngle}
                fill={fill}
            />
            <Sector
                cx={cx}
                cy={cy}
                startAngle={startAngle}
                endAngle={endAngle}
                innerRadius={outerRadius + 12}
                outerRadius={outerRadius + 15}
                fill={fill}
            />
        </g>
    );
};

const renderCustomizedLabel = (props: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, index, name } = props;
    const RADIAN = Math.PI / 180;
    const isSmall = percent < 0.03;
    
    // For small slices, move label further out
    const sin = Math.sin(-midAngle * RADIAN);
    const cos = Math.cos(-midAngle * RADIAN);
    const sx = cx + (outerRadius + 5) * cos;
    const sy = cy + (outerRadius + 5) * sin;
    const mx = cx + (outerRadius + 20) * cos;
    const my = cy + (outerRadius + 20) * sin;
    const ex = mx + (cos >= 0 ? 1 : -1) * 15;
    const ey = my;
    const textAnchor = cos >= 0 ? 'start' : 'end';

    const percentageText = `${(percent * 100).toFixed(1)}%`;

    if (isSmall) {
        return (
            <g>
                <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke="#94a3b8" fill="none" />
                <circle cx={ex} cy={ey} r={2} fill="#94a3b8" stroke="none" />
                <text x={ex + (cos >= 0 ? 1 : -1) * 8} y={ey} textAnchor={textAnchor} fill="#64748b" fontSize="11" dominantBaseline="central">
                    {percentageText}
                </text>
            </g>
        );
    }

    // For large slices, keep inside
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * cos;
    const y = cy + radius * sin;

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="12" fontWeight="bold" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.6)' }}>
            {percentageText}
        </text>
    );
};

const BreakdownCharts: React.FC = () => {
    const { state } = useCalculator();
    const [activeSourceIndex, setActiveSourceIndex] = useState<number | null>(null);
    const [activeTypeIndex, setActiveTypeIndex] = useState<number | null>(null);

    if (!state.activeResults) return null;

    const { finalGains, instantaneousGains } = state.activeResults;

    const maxLoad = Math.max(...finalGains.clearSky.total);
    const hourMaxLoad = finalGains.clearSky.total.indexOf(maxLoad);

    if (hourMaxLoad === -1 || finalGains.clearSky.total.length === 0) {
        return null; // Or some fallback UI
    }

    const windowsLoad = finalGains.clearSky.windows?.[hourMaxLoad] || 0;
    const wallsLoad = finalGains.clearSky.walls?.[hourMaxLoad] || 0;
    const peopleSensible = finalGains.clearSky.people?.[hourMaxLoad] || 0;
    const lightingLoad = finalGains.clearSky.lighting?.[hourMaxLoad] || 0;
    const equipmentLoad = finalGains.clearSky.equipment?.[hourMaxLoad] || 0;
    const ventilationSensible = finalGains.clearSky.ventilationSensible?.[hourMaxLoad] || 0;
    const infiltrationSensible = finalGains.clearSky.infiltrationSensible?.[hourMaxLoad] || 0;

    const peopleLatent = finalGains.clearSky.peopleLatent?.[hourMaxLoad] || 0;
    const ventilationLatent = finalGains.clearSky.ventilationLatent?.[hourMaxLoad] || 0;
    const infiltrationLatent = finalGains.clearSky.infiltrationLatent?.[hourMaxLoad] || 0;

    const totalSensible = windowsLoad + wallsLoad + peopleSensible + lightingLoad + equipmentLoad + ventilationSensible + infiltrationSensible;
    const totalLatent = peopleLatent + ventilationLatent + infiltrationLatent;

    const sourceData = [
        { name: 'Okna', value: Math.round(windowsLoad) },
        { name: 'Ściany', value: Math.round(wallsLoad) },
        { name: 'Ludzie', value: Math.round(peopleSensible + peopleLatent) },
        { name: 'Oświetlenie', value: Math.round(lightingLoad) },
        { name: 'Sprzęt', value: Math.round(equipmentLoad) },
        { name: 'Wentylacja', value: Math.round(ventilationSensible + ventilationLatent) },
        { name: 'Infiltracja', value: Math.round(infiltrationSensible + infiltrationLatent) }
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);

    const typeData = [
        { name: 'Ciepło Jawne', value: Math.round(totalSensible) },
        { name: 'Ciepło Utajone', value: Math.round(totalLatent) }
    ].filter(item => item.value > 0);

    const onSourcePieEnter = (_: any, index: number) => {
        setActiveSourceIndex(index);
    };

    const onSourcePieLeave = () => {
        setActiveSourceIndex(null);
    };

    const onTypePieEnter = (_: any, index: number) => {
        setActiveTypeIndex(index);
    };

    const onTypePieLeave = () => {
        setActiveTypeIndex(null);
    };

    const onSourceLegendEnter = (o: any) => {
        const index = sourceData.findIndex(d => d.name === o.value);
        if (index !== -1) setActiveSourceIndex(index);
    };

    const onTypeLegendEnter = (o: any) => {
        const index = typeData.findIndex(d => d.name === o.value);
        if (index !== -1) setActiveTypeIndex(index);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col items-center p-6 border-t-4 border-blue-500 hover:shadow-md transition-shadow overflow-visible">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Źródła Zysków</h3>
                <div className="w-full h-[420px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 30, bottom: 30 }}>
                            <Pie
                                activeIndex={activeSourceIndex !== null ? activeSourceIndex : undefined}
                                activeShape={renderActiveShape}
                                data={sourceData}
                                cx="50%"
                                cy="45%"
                                innerRadius={70}
                                outerRadius={130}
                                paddingAngle={2}
                                dataKey="value"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                isAnimationActive={false}
                                minAngle={5}
                                onMouseEnter={onSourcePieEnter}
                                onMouseLeave={onSourcePieLeave}
                            >
                                {sourceData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={NODE_COLORS[entry.name] || '#ccc'}
                                        fillOpacity={activeSourceIndex === null || activeSourceIndex === index ? 1 : 0.6}
                                    />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${(value / 1000).toFixed(2)} kW`} />
                            <Legend 
                                verticalAlign="bottom" 
                                height={40} 
                                onMouseEnter={onSourceLegendEnter}
                                onMouseLeave={() => setActiveSourceIndex(null)}
                                wrapperStyle={{ paddingTop: '20px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
            <Card className="flex flex-col items-center p-6 border-t-4 border-orange-500 hover:shadow-md transition-shadow overflow-visible">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Rodzaj Ciepła</h3>
                <div className="w-full h-[420px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart margin={{ top: 30, bottom: 30 }}>
                            <Pie
                                activeIndex={activeTypeIndex !== null ? activeTypeIndex : undefined}
                                activeShape={renderActiveShape}
                                data={typeData}
                                cx="50%"
                                cy="45%"
                                innerRadius={70}
                                outerRadius={130}
                                paddingAngle={2}
                                dataKey="value"
                                labelLine={false}
                                label={renderCustomizedLabel}
                                isAnimationActive={false}
                                minAngle={5}
                                onMouseEnter={onTypePieEnter}
                                onMouseLeave={onTypePieLeave}
                            >
                                {typeData.map((entry, index) => (
                                    <Cell 
                                        key={`cell-${index}`} 
                                        fill={NODE_COLORS[entry.name] || '#ccc'}
                                        fillOpacity={activeTypeIndex === null || activeTypeIndex === index ? 1 : 0.6}
                                    />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${(value / 1000).toFixed(2)} kW`} />
                            <Legend 
                                verticalAlign="bottom" 
                                height={40} 
                                onMouseEnter={onTypeLegendEnter}
                                onMouseLeave={() => setActiveTypeIndex(null)}
                                wrapperStyle={{ paddingTop: '20px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

export default BreakdownCharts;
