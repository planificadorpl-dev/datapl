import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

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
    
    // Convert JSON activities to Sheets Row Arrays
    const rows = jornada.activitiesDetail.map((act, i) => {
      let parroquiasStr = "";
      let sectoresStr = "";
      if(act.ubicaciones && act.ubicaciones.length > 0) {
         parroquiasStr = act.ubicaciones.map(u => u.parroquia).join(" | ");
         sectoresStr = act.ubicaciones.map(u => u.sector).join(" | ");
      }
      
      // Parse numbers safely, keep empty strings if blank to avoid Google Sheets shifting
      const vol = act.volantes ? act.volantes : "";
      const info = act.llamadasInfo ? act.llamadasInfo : "";
      const agenda = act.llamadasAgenda ? act.llamadasAgenda : "";
      
      return [
        jornada.date || "",                 // A: Fecha de la Jornada
        act.time || "",                     // B: Hora de esta actividad
        jornada.asesor || "",               // C: Asesor
        act.activityType || "",             // D: Tipo
        act.solicitudes || 0,               // E: Solicitudes (S) Confirmados
        act.clientesCaptados || 0,          // F: Clientes Captados (C)
        vol,                                // G: Volantes Entregados
        info,                               // H: Llamadas Info
        agenda,                             // I: Llamadas Agenda
        parroquiasStr,                      // J: Parroquia
        sectoresStr,                        // K: Sector
        act.condominio || "",               // L: Nombre Condominio
        act.notes || "",                    // M: Notas
        (i === 0 ? (jornada.reporteWhatsapp || "") : "") // N: Reporte WhatsApp (solo primera fila)
      ];
    });

    // Append to Sheet "REPORTES DE ASESORES"
    // We use the 'A1' notation to append to the bottom
    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: "'REPORTES DE ASESORES'!A:N", // Specific Sheet Name
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    return res.json({ success: true, message: 'Jornada guardada exitosamente en Sheets.' });
    
  } catch (error) {
    console.error('Error al guardar en Google Sheets:', error);
    return res.status(500).json({ error: 'Error del servidor al comunicarse con Google Sheets.' });
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
      range: "'REPORTES DE ASESORES'!A:N",
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

      jornadasMap[key].activitiesCount++;
      jornadasMap[key].totals.solicitudes += parseInt(row[4] || 0);
      jornadasMap[key].totals.captados += parseInt(row[5] || 0);
      jornadasMap[key].totals.volantes += parseInt(row[6] || 0);
      jornadasMap[key].totals.llamadasInfo += parseInt(row[7] || 0);
      jornadasMap[key].totals.llamadasAgenda += parseInt(row[8] || 0);
      
      // Capture the WhatsApp report from col N (index 13) if present
      if (!jornadasMap[key].reporteWhatsapp && row[13]) {
        jornadasMap[key].reporteWhatsapp = row[13];
      }
      
      let locLabel = "";
      if (row[9] || row[10]) {
        locLabel = `${row[9] || ''}${row[9] && row[10] ? ', ' : ''}${row[10] || ''}`;
      }

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
