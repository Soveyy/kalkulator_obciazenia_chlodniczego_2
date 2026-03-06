import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCalculator } from '../contexts/CalculatorContext';
import Card from './ui/Card';

const NODE_COLORS: Record<string, string> = {
    'Okna': '#f1c40f',
    'Ludzie': '#e67e22',
    'Oświetlenie': '#e74c3c',
    'Sprzęt': '#9b59b6',
    'Wentylacja': '#3498db',
    'Infiltracja': '#2ecc71',
    'Ciepło Jawne': '#ff7675',
    'Ciepło Utajone': '#74b9ff',
};

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't show label for very small slices
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="14" fontWeight="bold" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}>
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const BreakdownCharts: React.FC = () => {
    const { state } = useCalculator();

    if (!state.activeResults) return null;

    const { finalGains, instantaneousGains } = state.activeResults;

    const maxLoad = Math.max(...finalGains.clearSky.total);
    const hourMaxLoad = finalGains.clearSky.total.indexOf(maxLoad);

    if (hourMaxLoad === -1 || finalGains.clearSky.total.length === 0) {
        return null; // Or some fallback UI
    }

    const windowsLoad = finalGains.clearSky.windows?.[hourMaxLoad] || 0;
    const peopleSensible = finalGains.clearSky.people?.[hourMaxLoad] || 0;
    const lightingLoad = finalGains.clearSky.lighting?.[hourMaxLoad] || 0;
    const equipmentLoad = finalGains.clearSky.equipment?.[hourMaxLoad] || 0;
    const ventilationSensible = finalGains.clearSky.ventilationSensible?.[hourMaxLoad] || 0;
    const infiltrationSensible = finalGains.clearSky.infiltrationSensible?.[hourMaxLoad] || 0;

    const peopleLatent = finalGains.clearSky.peopleLatent?.[hourMaxLoad] || 0;
    const ventilationLatent = finalGains.clearSky.ventilationLatent?.[hourMaxLoad] || 0;
    const infiltrationLatent = finalGains.clearSky.infiltrationLatent?.[hourMaxLoad] || 0;

    const totalSensible = windowsLoad + peopleSensible + lightingLoad + equipmentLoad + ventilationSensible + infiltrationSensible;
    const totalLatent = peopleLatent + ventilationLatent + infiltrationLatent;

    const sourceData = [
        { name: 'Okna', value: Math.round(windowsLoad) },
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

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="flex flex-col items-center p-6 border-t-4 border-blue-500 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Źródła Zysków</h3>
                <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={sourceData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                                labelLine={false}
                                label={renderCustomizedLabel}
                            >
                                {sourceData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={NODE_COLORS[entry.name] || '#ccc'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value} W`} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
            <Card className="flex flex-col items-center p-6 border-t-4 border-orange-500 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Rodzaj Ciepła</h3>
                <div className="w-full h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={typeData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={110}
                                paddingAngle={2}
                                dataKey="value"
                                labelLine={false}
                                label={renderCustomizedLabel}
                            >
                                {typeData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={NODE_COLORS[entry.name] || '#ccc'} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value} W`} />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </Card>
        </div>
    );
};

export default BreakdownCharts;
