import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

// Supabase Init
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Load Service Account Credentials
// The user will place credentials.json in this directory
let auth;
try {
  auth = new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
} catch (e) {
  console.warn('⚠️ No se encontró credentials.json. La integración con Sheets fallará hasta que se agregue.');
}

const sheets = google.sheets('v4');

// Endpoint to Save Jornada
app.post('/api/save-jornada', async (req, res) => {
  if (!auth) {
    return res.status(500).json({ error: 'Faltan credenciales del servidor (credentials.json).' });
  }

  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  if (!SPREADSHEET_ID) {
    return res.status(500).json({ error: 'Falta SPREADSHEET_ID en el archivo .env.' });
  }

  const jornada = req.body;
  
  if (!jornada || !jornada.activitiesDetail || !Array.isArray(jornada.activitiesDetail)) {
    return res.status(400).json({ error: 'Payload de Jornada inválido.' });
  }

  try {
    const authClient = await auth.getClient();
    
    // 1. Prepare for Google Sheets (Column Mapping)
    // A: Fecha, B: Hora, C: Asesor, D: Tipo, E: S, F: C, G: Vol, H: Info, I: Agenda, J: Estado, K: Municipio, L: Parroquia, M: Sector, N: Condominio, O: Notas, P: Reporte WA
    const rows = jornada.activitiesDetail.map((act, i) => {
      // Compatibility for individual activities or bulk
      const u = act.ubicaciones && act.ubicaciones[0] ? act.ubicaciones[0] : {};
      const estado = u.estado || act.estado || "";
      const municipio = u.municipio || act.municipio || "";
      const parroquia = u.parroquia || act.parroquia || "";
      const sector = u.sector || act.sector || "";
      
      const vol = act.volantes ? act.volantes : "";
      const info = act.llamadasInfo ? act.llamadasInfo : "";
      const agenda = act.llamadasAgenda ? act.llamadasAgenda : "";
      
      return [
        jornada.date || "",                 // A
        act.time || "",                     // B
        jornada.asesor || "",               // C
        act.activityType || "",             // D
        act.solicitudes || 0,               // E
        act.clientesCaptados || 0,          // F
        vol,                                // G
        info,                               // H
        agenda,                             // I
        estado,                             // J (New)
        municipio,                          // K (New)
        parroquia,                          // L
        sector,                             // M
        act.condominio || "",               // N
        act.notes || "",                    // O
        (i === 0 ? (jornada.reporteWhatsapp || "") : "") // P
      ];
    });

    // Append to Sheet
    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: "'REPORTES DE ASESORES'!A:P", 
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    // 2. Save to Supabase (actividades table)
    const supabaseRows = jornada.activitiesDetail.map(act => {
      const u = act.ubicaciones && act.ubicaciones[0] ? act.ubicaciones[0] : {};
      return {
        fecha: jornada.date.split('/').reverse().join('-'), // "DD/MM/YYYY" -> "YYYY-MM-DD"
        hora: act.time.includes(' ') ? act.time.split(' ')[0] : act.time, // Handle "12:00 AM" if needed, but DB expects TIME
        asesor: jornada.asesor,
        tipo: act.activityType,
        solicitudes: parseInt(act.solicitudes || 0),
        clientes_captados: parseInt(act.clientesCaptados || 0),
        volantes: parseInt(act.volantes || 0),
        llamadas_info: parseInt(act.llamadasInfo || 0),
        llamadas_agenda: parseInt(act.llamadasAgenda || 0),
        estado: u.estado || act.estado || null,
        municipio: u.municipio || act.municipio || null,
        parroquia: u.parroquia || act.parroquia || null,
        sector: u.sector || act.sector || null,
        condominio: act.condominio || null,
        notas: act.notes || null,
        reporte_wa: jornada.reporteWhatsapp || null
      };
    });

    const { error: supError } = await supabase.from('actividades').insert(supabaseRows);
    if (supError) console.error('Error saving to Supabase activities:', supError);

    return res.json({ success: true, message: 'Jornada guardada exitosamente en Sheets y Supabase.' });
    
  } catch (error) {
    console.error('Error al guardar reporte:', error);
    return res.status(500).json({ error: 'Error del servidor al guardar reporte.' });
  }
});

// Endpoint to Get History
app.get('/api/history', async (req, res) => {
  if (!auth) {
    return res.status(500).json({ error: 'Faltan credenciales del servidor (credentials.json).' });
  }

  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  if (!SPREADSHEET_ID) {
    return res.status(500).json({ error: 'Falta SPREADSHEET_ID en el archivo .env.' });
  }

  try {
    const authClient = await auth.getClient();
    
    // Fetch from Sheet
    const response = await sheets.spreadsheets.values.get({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: "'REPORTES DE ASESORES'!A:P",
    });

    const rows = response.data.values;
    if (!rows || rows.length <= 1) {
      // No data or just headers
      return res.json([]); 
    }

    // Skip headers (index 0)
    const dataRows = rows.slice(1);

    // Group rows by Date and Asesor
    // A: Fecha(0), B: Hora(1), C: Asesor(2), D: Tipo(3), E: S(4), F: C(5), G: Vol(6), H: LlI(7), I: LlA(8), J: Parr(9), K: Sect(10), L: Cond(11), M: Notas(12)
    const jornadasMap = {};

    dataRows.forEach(row => {
      if (row.length < 4) return; // Skip empty/malformed rows
      const date = row[0];
      const asesor = row[2];
      const key = `${date}_${asesor}`;

      if (!jornadasMap[key]) {
        jornadasMap[key] = {
          date: date,
          asesor: asesor,
          activitiesCount: 0,
          totals: { solicitudes: 0, captados: 0, volantes: 0, llamadasInfo: 0, llamadasAgenda: 0 },
          details: []
        };
      }
      // group by date/asesor
      jornadasMap[key].activitiesCount++;
      jornadasMap[key].totals.solicitudes += parseInt(row[4] || 0);
      jornadasMap[key].totals.captados += parseInt(row[5] || 0);
      jornadasMap[key].totals.volantes += parseInt(row[6] || 0);
      jornadasMap[key].totals.llamadasInfo += parseInt(row[7] || 0);
      jornadasMap[key].totals.llamadasAgenda += parseInt(row[8] || 0);
      
      // Capture the WhatsApp report from col P (index 15) if present
      if (!jornadasMap[key].reporteWhatsapp && row[15]) {
        jornadasMap[key].reporteWhatsapp = row[15];
      }
      
      let locLabel = "";
      // J: Estado(9), K: Mun(10), L: Parr(11), M: Sect(12)
      const parts = [row[9], row[10], row[11], row[12]].filter(p => p && p !== "").join(', ');
      locLabel = parts;

      jornadasMap[key].details.push({
        time: row[1] || "",
        type: row[3] || "Actividad",
        location: locLabel
      });
    });

    // Convert map to array and sort by most recent (assuming they are appended in order naturally)
    const historyArray = Object.values(jornadasMap).reverse();

    return res.json(historyArray);

  } catch (error) {
    console.error('Error al leer historial desde Google Sheets:', error);
    return res.status(500).json({ error: 'Error del servidor al leer Google Sheets.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de API corriendo en http://localhost:${PORT}`);
  console.log(`📡 Esperando datos en el endpoint POST /api/save-jornada`);
});
