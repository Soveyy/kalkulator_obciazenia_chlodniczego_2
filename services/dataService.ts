
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
    for (const month in rawData) {
        parsedData[month] = {};
        if (rawData[month].T2m) {
            try {
                parsedData[month].T2m = JSON.parse(rawData[month].T2m);
            } catch(e) {
                console.error(`Error parsing T2m for month ${month}`, e);
                parsedData[month].T2m = [];
            }
        }
        for (const direction in rawData[month]) {
            if (direction !== 'T2m') {
                parsedData[month][direction] = {};
                for (const key in rawData[month][direction]) {
                    try {
                        parsedData[month][direction][key] = JSON.parse(rawData[month][direction][key]);
                    } catch(e) {
                        console.error(`Error parsing ${key} for month ${month}, direction ${direction}`, e);
                        parsedData[month][direction][key] = [];
                    }
                }
            }
        }
    }
    return parsedData;
}

export const loadAllData = async (): Promise<AllData> => {
    try {
        const [pvgisRaw, nsrdbRaw, rtsData, shadingData] = await Promise.all([
            fetchData('/data/baza_danych_PVGIS.json'),
            fetchData('/data/baza_danych_NSRDB.json'),
            fetchData('/data/rts_factors.json'),
            fetchData('/data/shading_database.json'),
        ]);

        const pvgis = parseIrradianceData(pvgisRaw);
        const nsrdb = parseIrradianceData(nsrdbRaw);

        return { pvgis, nsrdb, rts: rtsData, shading: shadingData };
    } catch (error) {
        console.error("Failed to load all application data:", error);
        throw error;
    }
};
