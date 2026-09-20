import { MAX_PROJECT_JSON_LENGTH, MAX_SHARE_PAYLOAD_LENGTH } from './projectDataService';

/* URI decoder compatible with lz-string, with output and dictionary limits.
 * Based on lz-string (c) 2013 pieroxy, MIT License:
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
export function decompressProjectLink(encoded: string, maxOutput = MAX_PROJECT_JSON_LENGTH): string {
    if (!encoded || encoded.length > MAX_SHARE_PAYLOAD_LENGTH) throw new Error('Link projektu jest pusty lub zbyt duży.');
    const input = encoded.replace(/ /g, '+');
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$';
    let offset = 0;
    const read = (count: number): number => {
        let value = 0;
        for (let bit = 0; bit < count; bit++, offset++) {
            if (offset >= input.length * 6) throw new Error('Niekompletny link projektu.');
            const code = alphabet.indexOf(input[Math.floor(offset / 6)]);
            if (code < 0 || code > 63) throw new Error('Nieprawidłowy link projektu.');
            value |= ((code >> (5 - offset % 6)) & 1) << bit;
        }
        return value;
    };
    const first = read(2);
    if (first === 2) return '';
    if (first > 1) throw new Error('Nieprawidłowy link projektu.');
    let previous = String.fromCharCode(read(first === 0 ? 8 : 16));
    const dictionary: string[] = ['', '', '', previous];
    const result = [previous];
    let size = 4, width = 3, remaining = 4, outputSize = 1, dictionarySize = 1;
    const add = (entry: string) => {
        dictionarySize += entry.length;
        if (dictionarySize > maxOutput * 8 || size > maxOutput + 4) throw new Error('Link projektu przekracza limit rozpakowywania.');
        dictionary[size++] = entry;
    };
    while (outputSize <= maxOutput) {
        let code = read(width);
        if (code === 2) return result.join('');
        if (code === 0 || code === 1) {
            add(String.fromCharCode(read(code === 0 ? 8 : 16)));
            code = size - 1;
            remaining--;
        }
        if (remaining === 0) { remaining = 2 ** width; width++; }
        const entry = dictionary[code] || (code === size ? previous + previous[0] : null);
        if (entry === null) throw new Error('Nieprawidłowy słownik linku projektu.');
        outputSize += entry.length;
        if (outputSize > maxOutput) break;
        result.push(entry);
        add(previous + entry[0]);
        remaining--;
        previous = entry;
        if (remaining === 0) { remaining = 2 ** width; width++; }
    }
    throw new Error('Rozpakowany projekt jest zbyt duży.');
}
