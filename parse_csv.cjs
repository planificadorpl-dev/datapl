const fs = require('fs');

// Read with Latin-1 / Windows-1252 encoding
const data = fs.readFileSync('Depuración y Estandarización de Datos Geográficos.csv', 'latin1');
const lines = data.split('\n');

const geoData = {};

// Skip header
for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(';');
    const estado = cols[0]?.trim();
    const municipio = cols[1]?.trim();
    const parroquia = cols[2]?.trim();
    const sectoresRaw = cols[3]?.trim();

    if (!estado || !municipio || !parroquia || !sectoresRaw) continue;

    const sectores = sectoresRaw.split(',').map(s => s.trim()).filter(Boolean);

    if (!geoData[estado]) geoData[estado] = {};
    if (!geoData[estado][municipio]) geoData[estado][municipio] = {};
    if (!geoData[estado][municipio][parroquia]) geoData[estado][municipio][parroquia] = new Set();
    
    sectores.forEach(s => geoData[estado][municipio][parroquia].add(s));
}

// Sort outputs
const result = {};
Object.keys(geoData).sort().forEach(est => {
    result[est] = {};
    Object.keys(geoData[est]).sort().forEach(mun => {
        result[est][mun] = {};
        Object.keys(geoData[est][mun]).sort().forEach(par => {
            result[est][mun][par] = Array.from(geoData[est][mun][par]).sort();
        });
    });
});

const output = "export const geoHierarchy = " + JSON.stringify(result, null, 2) + ";\n";
fs.writeFileSync('geo_hierarchy.js', output, 'utf8');

console.log('=== GEO HIERARCHY BUILT ===');
console.log('Estados:', Object.keys(result));

