import React from 'react';
import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from 'recharts';
import { useCalculator } from '../contexts/CalculatorContext';

const NODE_COLORS: Record<string, string> = {
    'Okna': '#f1c40f',
    'Ludzie': '#e67e22',
    'Oświetlenie': '#e74c3c',
    'Sprzęt': '#9b59b6',
    'Wentylacja': '#3498db',
    'Infiltracja': '#2ecc71',
    'Ciepło Jawne': '#ff7675',
    'Ciepło Utajone': '#74b9ff',
    'Całkowite Obciążenie': '#2c3e50'
};

const renderSankeyNode = (props: any) => {
    const { x, y, width, height, index, payload } = props;
    const color = NODE_COLORS[payload.name] || '#3b82f6';
    
    const isLeft = payload.targetLinks ? payload.targetLinks.length === 0 : x < 100;
    const isRight = payload.sourceLinks ? payload.sourceLinks.length === 0 : x > 500;
    
    return (
        <Layer key={`CustomNode${index}`}>
            <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity="1" />
            <text
                textAnchor={isLeft ? 'start' : (isRight ? 'end' : 'middle')}
                x={isLeft ? x + width + 8 : (isRight ? x - 8 : x + width / 2)}
                y={isLeft || isRight ? y + height / 2 - 8 : y - 16}
                fontSize="13"
                fontWeight="600"
                fill="#333"
                dominantBaseline="middle"
                className="dark:fill-slate-200"
            >
                {payload.name}
            </text>
            <text
                textAnchor={isLeft ? 'start' : (isRight ? 'end' : 'middle')}
                x={isLeft ? x + width + 8 : (isRight ? x - 8 : x + width / 2)}
                y={isLeft || isRight ? y + height / 2 + 8 : y + height + 16}
                fontSize="11"
                fill="#666"
                dominantBaseline="middle"
                className="dark:fill-slate-400"
            >
                {payload.value} W
            </text>
        </Layer>
    );
};

const renderSankeyLink = (props: any) => {
    const { sourceX, targetX, sourceY, targetY, sourceControlX, targetControlX, linkWidth, index, payload } = props;
    const color = NODE_COLORS[payload.source.name] || '#94a3b8';
    
    return (
        <path
            key={`CustomLink${index}`}
            d={`
                M${sourceX},${sourceY}
                C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
            `}
            stroke={color}
            strokeWidth={Math.max(linkWidth, 1)}
            fill="none"
            strokeOpacity={0.4}
        />
    );
};

const SankeyChart: React.FC = () => {
    const { state } = useCalculator();

    if (!state.activeResults) return null;

    const { finalGains, instantaneousGains } = state.activeResults;

    // We want to show the peak load breakdown.
    // Let's find the hour of the maximum total load.
    const maxLoad = Math.max(...finalGains.clearSky.total);
    const hourMaxLoad = finalGains.clearSky.total.indexOf(maxLoad);

    if (hourMaxLoad === -1 || finalGains.clearSky.total.length === 0) {
        return null; // Or some fallback UI
    }

    // Get the values at the peak hour
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
    const totalLoad = totalSensible + totalLatent;

    const rawLinks = [
        { sourceName: 'Okna', targetName: 'Ciepło Jawne', value: Math.round(windowsLoad) },
        { sourceName: 'Ludzie', targetName: 'Ciepło Jawne', value: Math.round(peopleSensible) },
        { sourceName: 'Ludzie', targetName: 'Ciepło Utajone', value: Math.round(peopleLatent) },
        { sourceName: 'Oświetlenie', targetName: 'Ciepło Jawne', value: Math.round(lightingLoad) },
        { sourceName: 'Sprzęt', targetName: 'Ciepło Jawne', value: Math.round(equipmentLoad) },
        { sourceName: 'Wentylacja', targetName: 'Ciepło Jawne', value: Math.round(ventilationSensible) },
        { sourceName: 'Wentylacja', targetName: 'Ciepło Utajone', value: Math.round(ventilationLatent) },
        { sourceName: 'Infiltracja', targetName: 'Ciepło Jawne', value: Math.round(infiltrationSensible) },
        { sourceName: 'Infiltracja', targetName: 'Ciepło Utajone', value: Math.round(infiltrationLatent) },
        { sourceName: 'Ciepło Jawne', targetName: 'Całkowite Obciążenie', value: Math.round(totalSensible) },
        { sourceName: 'Ciepło Utajone', targetName: 'Całkowite Obciążenie', value: Math.round(totalLatent) }
    ].filter(link => link.value > 0);

    // Build unique nodes from active links
    const nodeNames = Array.from(new Set(rawLinks.flatMap(l => [l.sourceName, l.targetName])));
    const nodes = nodeNames.map(name => ({ name }));

    const links = rawLinks.map(link => ({
        source: nodeNames.indexOf(link.sourceName),
        target: nodeNames.indexOf(link.targetName),
        value: link.value
    }));

    const data = { nodes, links };

    return (
        <div className="w-full h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <Sankey
                    data={data}
                    nodePadding={50}
                    margin={{ top: 20, right: 100, bottom: 20, left: 100 }}
                    link={renderSankeyLink}
                    node={renderSankeyNode}
                >
                    <Tooltip 
                        formatter={(value: number) => `${value} W`}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                </Sankey>
            </ResponsiveContainer>
        </div>
    );
};

export default SankeyChart;
