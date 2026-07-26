const fs = require('fs');

const csv = fs.readFileSync('Direcciones - Direcciones.csv', 'utf-8');
const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0);

// Remove header
lines.shift();

// Function to convert to Title Case
function toTitleCase(str) {
    if (!str) return '';
    return str.toLowerCase().split(' ').map(word => {
        // Handle small words if needed, but for simplicity we capitalize first letter of each word
        // except small words like "de", "del", "la", "las", "el", "los" if they are not the first word
        return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ')
      .replace(/\bDe\b/g, 'de')
      .replace(/\bDel\b/g, 'del')
      .replace(/\bLa\b/g, 'la')
      .replace(/\bLas\b/g, 'las')
      .replace(/\bEl\b/g, 'el')
      .replace(/\bLos\b/g, 'los')
      // Ensure very first word is capitalized even if it's 'La'
      .replace(/^([a-z])/i, match => match.toUpperCase());
}

let sql = `TRUNCATE TABLE geodata_config;\n\nINSERT INTO geodata_config (estado, municipio, parroquia, sector) VALUES\n`;

const uniqueSet = new Set();
const values = [];

for (const line of lines) {
    const parts = line.split(',');
    if (parts.length >= 4) {
        let estado = toTitleCase(parts[0].trim()).replace(/'/g, "''");
        let municipio = toTitleCase(parts[1].trim()).replace(/'/g, "''");
        let parroquia = toTitleCase(parts[2].trim()).replace(/'/g, "''");
        let sector = toTitleCase(parts.slice(3).join(',').trim()).replace(/'/g, "''");
        
        const key = `${parroquia}-${sector}`;
        if (!uniqueSet.has(key)) {
            uniqueSet.add(key);
            values.push(`('${estado}', '${municipio}', '${parroquia}', '${sector}')`);
        }
    }
}

sql += values.join(',\n') + ';\n';

fs.writeFileSync('reemplazar_direcciones.sql', sql);
console.log(`SQL generated in reemplazar_direcciones.sql with ${values.length} unique records, converted to Title Case.`);
