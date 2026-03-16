import { google } from 'googleapis';

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
  if (!SPREADSHEET_ID) {
    return res.status(500).json({ error: 'Falta SPREADSHEET_ID en las variables de entorno.' });
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
        (i === 0 ? (jornada.reporteWhatsapp || "") : "") // N
      ];
    });

    await sheets.spreadsheets.values.append({
      auth: authClient,
      spreadsheetId: SPREADSHEET_ID,
      range: "'REPORTES DE ASESORES'!A:N",
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: rows },
    });

    return res.status(200).json({ success: true, message: 'Jornada guardada exitosamente en Sheets.' });
    
  } catch (error) {
    console.error('Error al guardar en Google Sheets:', error);
    return res.status(500).json({ error: 'Error del servidor al comunicarse con Google Sheets.' });
  }
}
