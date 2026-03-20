const fs = require('fs');

const content = fs.readFileSync('c:/Users/jlima/Desktop/REPORTE DE ASESORES/geo_hierarchy.js', 'utf8');

// Use regex to find all matches of "Level": { or "Level": [
// and tracking the current context.

const lines = content.split('\n');
let estado = '';
let municipio = '';
let parroquia = '';
let values = [];

for (let line of lines) {
    let trimmed = line.trim();
    if (!trimmed) continue;
    
    // Indentation check
    let indent = line.search(/\S/);
    
    // State: "Aragua": { (indent 2)
    let m_state = trimmed.match(/^"([^"]+)":\s*\{/);
    if (m_state && indent === 2) {
        estado = m_state[1];
        continue;
    }
    
    // Municipio: "José Rafael Revenga": { (indent 4)
    let m_mun = trimmed.match(/^"([^"]+)":\s*\{/);
    if (m_mun && indent === 4) {
        municipio = m_mun[1];
        continue;
    }
    
    // Parroquia: "El Consejo": [ (indent 6)
    let m_par = trimmed.match(/^"([^"]+)":\s*\[/);
    if (m_par && indent === 6) {
        parroquia = m_par[1];
        continue;
    }
    
    // Sector: "Centro", (indent 8)
    let m_sec = trimmed.match(/^"([^"]+)"/);
    if (m_sec && indent === 8) {
        let sector = m_sec[1];
        let e = estado.replace(/'/g, "''");
        let mu = municipio.replace(/'/g, "''");
        let p = parroquia.replace(/'/g, "''");
        let s = sector.replace(/'/g, "''");
        values.push(`('${e}', '${mu}', '${p}', '${s}')`);
    }
}

const sql = `INSERT INTO geodata_config (estado, municipio, parroquia, sector) VALUES \n${values.join(',\n')};`;
fs.writeFileSync('c:/Users/jlima/Desktop/REPORTE DE ASESORES/geo_inserts.sql', sql);
console.log(`Successfully generated ${values.length} inserts.`);
