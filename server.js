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
      let estadosStr = "";
      let municipiosStr = "";
      let parroquiasStr = "";
      let sectoresStr = "";
      if(act.ubicaciones && act.ubicaciones.length > 0) {
         estadosStr = act.ubicaciones.map(u => u.estado).join(" | ");
         municipiosStr = act.ubicaciones.map(u => u.municipio).join(" | ");
         parroquiasStr = act.ubicaciones.map(u => u.parroquia).join(" | ");
         sectoresStr = act.ubicaciones.map(u => u.sector).join(" | ");
      }
      const vol = act.volantes ? act.volantes : "";
      const info = act.llamadasInfo ? act.llamadasInfo : "";
      const agenda = act.llamadasAgenda ? act.llamadasAgenda : "";
      
      return [
        jornada.date || "",                 // A
        act.time || "",                     // B
        jornada.asesor || "",               // C
        estadosStr,                         // D
        municipiosStr,                      // E
        parroquiasStr,                      // F
        sectoresStr,                        // G
        act.activityType || "",             // H
        act.solicitudes || 0,               // I
        act.clientesCaptados || 0,          // J
        vol,                                // K
        info,                               // L
        agenda,                             // M
        act.condominio || "",               // N
        act.notes || ""                     // O
      ];
    });

    // Append to Sheet
    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: "'REPORTES DE ASESORES'!A:O", 
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
        reporte_wa: jornada.reporteWhatsapp || null,
        uid: act.uid || null
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
  try {
    // Fetch from Supabase instead of Sheets
    const { data: activities, error } = await supabase
      .from('actividades')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (error) {
      console.error('Error fetching history from Supabase:', error);
      return res.status(500).json({ error: 'Error al leer historial desde la base de datos.' });
    }

    if (!activities || activities.length === 0) {
      return res.json([]);
    }

    // Group rows by Date and Asesor
    const jornadasMap = {};

    activities.forEach(act => {
      const date = new Date(act.fecha).toLocaleDateString('es-ES');
      const asesor = act.asesor;
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

      jornadasMap[key].activitiesCount++;
      jornadasMap[key].totals.solicitudes += (act.solicitudes || 0);
      jornadasMap[key].totals.captados += (act.clientes_captados || 0);
      jornadasMap[key].totals.volantes += (act.volantes || 0);
      jornadasMap[key].totals.llamadasInfo += (act.llamadas_info || 0); 
      jornadasMap[key].totals.llamadasAgenda += (act.llamadas_agenda || 0); 
      
      if (!jornadasMap[key].reporteWhatsapp && act.reporte_wa) {
        jornadasMap[key].reporteWhatsapp = act.reporte_wa;
      }
      
      let locLabel = "";
      if (act.estado || act.municipio || act.parroquia || act.sector) {
        const parts = [act.estado, act.municipio, act.parroquia, act.sector].filter(Boolean);
        locLabel = parts.join(', ');
      }

      jornadasMap[key].details.push({
        time: act.hora || "",
        type: act.tipo || "Actividad",
        location: locLabel
      });
    });

    const historyArray = Object.values(jornadasMap);
    return res.json(historyArray);

  } catch (error) {
    console.error('Error general al obtener historial:', error);
    return res.status(500).json({ error: 'Error del servidor al obtener historial.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de API corriendo en http://localhost:${PORT}`);
  console.log(`📡 Esperando datos en el endpoint POST /api/save-jornada`);
});
