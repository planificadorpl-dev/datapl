import re

file_path = 'c:/Users/jlima/Desktop/REPORTE DE ASESORES/geo_hierarchy.js'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

estado = ""
municipio = ""
parroquia = ""
in_sectors = False
values = []

for line in lines:
    line = line.strip()
    if not line or line.startswith('export') or line.startswith('};'):
        continue
    
    # State level: "Aragua": {
    m = re.match(r'^"([^"]+)":\s*\{$', line)
    if m:
        if not estado:
            estado = m.group(1)
        elif not municipio:
            municipio = m.group(1)
        continue
    
    # Parroquia/Sector list level: "El Consejo": [
    m = re.match(r'^"([^"]+)":\s*\[$', line)
    if m:
        parroquia = m.group(1)
        in_sectors = True
        continue
    
    # Sector: "Centro",
    m = re.match(r'^"([^"]+)"(,?)$', line)
    if m and in_sectors:
        sector = m.group(1)
        e = estado.replace("'", "''")
        mu = municipio.replace("'", "''")
        p = parroquia.replace("'", "''")
        s = sector.replace("'", "''")
        values.append(f"('{e}', '{mu}', '{p}', '{s}')")
        continue
    
    # End of sector list: ],
    if line.startswith(']'):
        in_sectors = False
        continue
        
    # End of municipio or estado: },
    if line.startswith('}'):
        if municipio and not in_sectors:
            # municipio = "" -- Wait, we need to know if we are closing a municipio or a state
            # Simple hack: check if next line is a quote or a closing brace
            pass
        # A more robust way is to check the indentation in the original file, but we stripped it
        continue

# Alternative approach: use the indent
indent_values = []
estado = ""
municipio = ""
parroquia = ""

with open(file_path, 'r', encoding='utf-8') as f:
    for line in f:
        stripped = line.strip()
        if not stripped: continue
        indent = len(line) - len(line.lstrip())
        
        m_obj = re.match(r'^"([^"]+)":\s*\{', stripped)
        m_arr = re.match(r'^"([^"]+)":\s*\[', stripped)
        m_str = re.match(r'^"([^"]+)"', stripped)
        
        if m_obj:
            name = m_obj.group(1)
            if indent == 2: estado = name
            if indent == 4: municipio = name
        elif m_arr:
            parroquia = m_arr.group(1)
        elif m_str and indent == 8:
            sector = m_str.group(1)
            e = estado.replace("'", "''")
            mu = municipio.replace("'", "''")
            p = parroquia.replace("'", "''")
            s = sector.replace("'", "''")
            indent_values.append(f"('{e}', '{mu}', '{p}', '{s}')")

sql = f"INSERT INTO geodata_config (estado, municipio, parroquia, sector) VALUES \n" + ",\n".join(indent_values) + ";"

with open('c:/Users/jlima/Desktop/REPORTE DE ASESORES/geo_inserts.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"Generated {len(indent_values)} inserts.")
