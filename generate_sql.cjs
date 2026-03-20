const { geoHierarchy } = require('./geo_hierarchy.js');
const fs = require('fs');

let values = [];

for (const estado in geoHierarchy) {
  for (const municipio in geoHierarchy[estado]) {
    for (const parroquia in geoHierarchy[estado][municipio]) {
      const sectores = geoHierarchy[estado][municipio][parroquia];
      sectores.forEach(sector => {
        // Escape single quotes
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

INSERT INTO geodata_config (estado, municipio, parroquia, sector) VALUES 
${values.join(',\n')};
`;

fs.writeFileSync('geo_inserts.sql', sql);
console.log('SQL generado en geo_inserts.sql');
