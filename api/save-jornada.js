import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Get Credentials from Vercel Env 
  // We expect GOOGLE_CREDENTIALS to be a JSON string of the credentials.json file
  const credsStr = process.env.GOOGLE_CREDENTIALS;
  if (!credsStr) {
    return res.status(500).json({ error: 'Faltan credenciales del servidor (GOOGLE_CREDENTIALS en Vercel).' });
  }

  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  if (!credsStr || !SPREADSHEET_ID) {
    return res.status(500).json({ error: 'Faltan variables de entorno (GOOGLE o SPREADSHEET).' });
  }

  let auth;
  try {
    const creds = JSON.parse(credsStr);
    auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: creds.client_email,
        private_key: creds.private_key,
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } catch (e) {
    console.error('Error parseando GOOGLE_CREDENTIALS:', e);
    return res.status(500).json({ error: 'Error del servidor al leer credenciales.' });
  }

  const sheets = google.sheets('v4');
  const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;
  const jornada = req.body;
  
  if (!jornada || !jornada.activitiesDetail || !Array.isArray(jornada.activitiesDetail)) {
    return res.status(400).json({ error: 'Payload de Jornada inválido.' });
  }

  try {
    const authClient = await auth.getClient();
    
    // Convert JSON activities to Sheets Row Arrays
    const rows = jornada.activitiesDetail.map((act, i) => {
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
        act.activityType || "",             // D
        act.solicitudes || 0,               // E
        act.clientesCaptados || 0,          // F
        vol,                                // G
        info,                               // H
        agenda,                             // I
        parroquiasStr,                      // J
        sectoresStr,                        // K
        act.condominio || "",               // L
        act.notes || "",                    // M
        (i === 0 ? (jornada.reporteWhatsapp || "") : ""), // N
        act.uid || "",                      // O (ID)
        estadosStr,                         // P
        municipiosStr                       // Q
      ];
    });

    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: "'REPORTES DE ASESORES'!A:Q", 
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    // 2. Save to Supabase (if configured)
    if (supabase) {
      const supabaseRows = jornada.activitiesDetail.map(act => {
        const u = act.ubicaciones && act.ubicaciones[0] ? act.ubicaciones[0] : {};
        return {
          fecha: jornada.date.split('/').reverse().join('-'), // "DD/MM/YYYY" -> "YYYY-MM-DD"
          hora: act.time.includes(' ') ? act.time.split(' ')[0] : act.time,
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
    }

    return res.status(200).json({ success: true, message: 'Jornada guardada exitosamente en Sheets y Supabase.' });
    
  } catch (error) {
    console.error('Error al guardar en Google Sheets:', error);
    return res.status(500).json({ error: 'Error del servidor al comunicarse con Google Sheets.' });
  }
}
