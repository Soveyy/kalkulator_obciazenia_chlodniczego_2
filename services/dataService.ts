
import { AllData } from '../types';

async function fetchData(url: string): Promise<any> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    }
    return response.json();
}

function parseIrradianceData(rawData: any): any {
    const parsedData: any = {};
    
    const processNode = (node: any, path: string): any => {
        if (typeof node === 'string') {
            try {
                return JSON.parse(node);
            } catch(e) {
                console.error(`Error parsing at ${path}: ${e.message}`);
                return [];
            }
        } else if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
            const result: any = {};
            for (const key in node) {
                result[key] = processNode(node[key], `${path} -> ${key}`);
            }
            return result;
        }
        return node;
    };

    for (const month in rawData) {
        parsedData[month] = {};
        for (const key in rawData[month]) {
            parsedData[month][key] = processNode(rawData[month][key], `month ${month} -> ${key}`);
        }
    }
    return parsedData;
}

export const loadAllData = async (): Promise<AllData> => {
    console.log("Starting to load application data...");
    try {
        const [nsrdbRaw, rtsData, shadingData, warsawWeather, ctsData] = await Promise.all([
            fetchData('data/baza_danych_NSRDB.json'),
            fetchData('data/rts_factors.json'),
            fetchData('data/shading_database.json'),
            fetchData('data/warsaw_weather.json'),
            fetchData('data/cts_factors.json'),
        ]);
        console.log("Raw data fetched successfully.");

        const nsrdb = parseIrradianceData(nsrdbRaw);
        console.log("Data parsed successfully.");

        return { nsrdb, rts: rtsData, shading: shadingData, warsaw_weather: warsawWeather, cts: ctsData };
    } catch (error) {
        console.error("Failed to load all application data:", error);
        throw error;
    }
};
