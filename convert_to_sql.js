const fs = require('fs');

// Simple parser for the specific format of geo_hierarchy.js
const content = fs.readFileSync('c:/Users/jlima/Desktop/REPORTE DE ASESORES/geo_hierarchy.js', 'utf8');

// Use a regex to extract the object part if it's not a clean JSON
// But it's easier to just strip 'export const geoHierarchy ='
const jsonStr = content
  .replace(/export const geoHierarchy =/, '')
  .replace(/;/g, '')
  .trim();

// Since it's a JS object literal, not strictly JSON (double quotes etc.), 
// we can use a small hack or just process it as text.
// Or just let Node evaluate it.

const geoHierarchy = eval('(' + jsonStr + ')');

let values = [];
for (const estado in geoHierarchy) {
  for (const municipio in geoHierarchy[estado]) {
    for (const parroquia in geoHierarchy[estado][municipio]) {
      const sectores = geoHierarchy[estado][municipio][parroquia];
      sectores.forEach(sector => {
        const e = estado.replace(/'/g, "''");
        const m = municipio.replace(/'/g, "''");
        const p = parroquia.replace(/'/g, "''");
        const s = sector.replace(/'/g, "''");
        values.push(`('${e}', '${m}', '${p}', '${s}')`);
      });
    }
  }
}

const sql = `
-- ============================================================
-- CARGA MASIVA DE DATOS GEOGRÁFICOS
-- ============================================================

TRUNCATE TABLE geodata_config;

INSERT INTO geodata_config (estado, municipio, parroquia, sector) VALUES 
${values.join(',\n')};
`;

console.log(sql);
