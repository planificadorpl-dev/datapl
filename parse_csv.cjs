const fs = require('fs');

// Read with Latin-1 / Windows-1252 encoding
const data = fs.readFileSync('Depuración y Estandarización de Datos Geográficos.csv', 'latin1');
const lines = data.split('\n');

const geoData = {};

for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(';');
    const parroquia = cols[2]?.trim();
    const sectoresRaw = cols[3]?.trim();

    if (!parroquia || !sectoresRaw) continue;

    const sectores = sectoresRaw.split(',').map(s => s.trim()).filter(Boolean);

    if (!geoData[parroquia]) geoData[parroquia] = new Set();
    sectores.forEach(s => geoData[parroquia].add(s));
}

const result = {};
Object.keys(geoData).sort().forEach(p => {
    result[p] = Array.from(geoData[p]).sort();
});

const output = "export const geoData = " + JSON.stringify(result, null, 2) + ";\n";
fs.writeFileSync('geo_data_new.js', output, 'utf8');

const summary = Object.keys(result).map(p => `  ${p}: ${result[p].length} sectores`).join('\n');
console.log('=== PARROQUIAS ===');
console.log(summary);
console.log('\nTotal parroquias:', Object.keys(result).length);
console.log('Total sectores:', Object.values(result).reduce((a, v) => a + v.length, 0));
