const fs = require('fs');
try {
    const rawData = fs.readFileSync('Sectores.json', 'utf8');
    // Remove potential UTF-8 BOM
    const content = rawData.startsWith('\uFEFF') ? rawData.slice(1) : rawData;
    const data = JSON.parse(content);
    console.log(`Loaded ${data.length} items from JSON.`);

    const values = data.map((item, index) => {
        const e = (item['Sutitucion Estado'] || '').replace(/'/g, "''").trim();
        const m = (item['Sustitucion Municipio'] || '').replace(/'/g, "''").trim();
        const p = (item['Sustitucion a Parroquia'] || '').replace(/'/g, "''").trim();
        const s = (item['Sector'] || '').replace(/'/g, "''").trim();
        
        if (e && m && p && s) {
            return `('${e}', '${m}', '${p}', '${s}')`;
        }
        if (index < 5) console.warn(`Item ${index} missing fields:`, item);
        return null;
    }).filter(Boolean);

    const uniqueValues = [...new Set(values)];
    const sql = `TRUNCATE TABLE geodata_config;\nINSERT INTO geodata_config (estado, municipio, parroquia, sector) VALUES \n${uniqueValues.join(',\n')};`;

    fs.writeFileSync('update_geodata_sectores.sql', sql);
    console.log(`Generated ${uniqueValues.length} unique inserts.`);
} catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
}
