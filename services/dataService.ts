
import { AllData } from '../types';

async function fetchData(url: string): Promise<any> {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText} (${response.status})`);
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("text/html")) {
            console.error(`Fetch error: URL ${url} returned HTML instead of JSON`);
            throw new Error(`Expected JSON from ${url} but got HTML. This usually happens when a file is missing and the server falls back to index.html.`);
        }

        return await response.json();
    } catch (e) {
        console.error(`Error in fetchData for ${url}:`, e);
        throw e;
    }
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
    const files = [
        { name: 'NSRDB', path: `/data/baza_danych_NSRDB.json?v=${Date.now()}` },
        { name: 'RTS', path: `/data/rts_factors.json?v=${Date.now()}` },
        { name: 'Shading', path: `/data/shading_database.json?v=${Date.now()}` },
        { name: 'Weather', path: `/data/warsaw_weather.json?v=${Date.now()}` },
        { name: 'CTS', path: `/data/cts_factors.json?v=${Date.now()}` },
    ];

    try {
        const results = await Promise.all(
            files.map(file => fetchData(file.path).catch(err => {
                console.error(`Failed to load ${file.name} from ${file.path}:`, err);
                throw new Error(`Błąd ładowania ${file.name}: ${err.message}`);
            }))
        );
        
        const [nsrdbRaw, rtsData, shadingData, warsawWeather, ctsData] = results;
        console.log("Raw data fetched successfully.");

        const nsrdb = parseIrradianceData(nsrdbRaw);
        console.log("Data parsed successfully.");

        return { nsrdb, rts: rtsData, shading: shadingData, warsaw_weather: warsawWeather, cts: ctsData };
    } catch (error) {
        console.error("Failed to load application data bundle:", error);
        throw error;
    }
};
