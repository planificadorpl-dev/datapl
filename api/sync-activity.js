import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { activity, action } = req.body;
  
  const credsStr = process.env.GOOGLE_CREDENTIALS;
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

  if (!credsStr || !SPREADSHEET_ID) {
    return res.status(500).json({ error: 'Faltan variables de entorno (GOOGLE_CREDENTIALS o SPREADSHEET_ID).' });
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
    return res.status(500).json({ error: 'Error al autenticar con Google.' });
  }

  const sheets = google.sheets('v4');
  const sheetName = 'REPORTES DE ASESORES';

  try {
    const authClient = await auth.getClient();

    if (action === 'ADD') {
      // Logic from save-jornada.js but for a single activity
      let parroquiasStr = "";
      let sectoresStr = "";
      if(activity.ubicaciones && activity.ubicaciones.length > 0) {
         parroquiasStr = activity.ubicaciones.map(u => u.parroquia).join(" | ");
         sectoresStr = activity.ubicaciones.map(u => u.sector).join(" | ");
      }
      
      const row = [
        activity.date || "",                 // A
        activity.time || "",                 // B
        activity.asesor || "",               // C
        activity.activityType || "",         // D
        activity.solicitudes || 0,           // E
        activity.clientesCaptados || 0,      // F
        activity.volantes || "",             // G
        activity.llamadasInfo || "",         // H
        activity.llamadasAgenda || "",       // I
        parroquiasStr,                       // J
        sectoresStr,                         // K
        activity.condominio || "",           // L
        activity.notes || "",                // M
        "",                                  // N (Was Whatsapp Report)
        activity.uid                         // O (Unique ID for deletion)
      ];

      await sheets.spreadsheets.values.append({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:O`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });

      return res.status(200).json({ success: true, action: 'ADDED' });

    } else if (action === 'DELETE') {
      const uid = activity.uid;
      if (!uid) return res.status(400).json({ error: 'UID faltante para eliminar.' });

      // 1. Find the row index by UID in column O
      const response = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!O:O`,
      });

      const values = response.data.values;
      if (!values) return res.status(404).json({ error: 'Hoja vacía o columna UID no encontrada.' });

      // Google Sheets is 1-indexed. rowIndex will be index + 1
      const rowIndex = values.findIndex(row => row[0] === uid);
      
      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Actividad no encontrada en la hoja.' });
      }

      // 2. Delete the row
      // We need the internal sheetId for batchUpdate
      const spreadsheet = await sheets.spreadsheets.get({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID
      });
      const targetSheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      const sheetId = targetSheet.properties.sheetId;

      await sheets.spreadsheets.batchUpdate({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex, // startIndex inclusive
                  endIndex: rowIndex + 1  // endIndex exclusive
                }
              }
            }
          ]
        }
      });

      return res.status(200).json({ success: true, action: 'DELETED' });
    }

    return res.status(400).json({ error: 'Acción inválida.' });

  } catch (error) {
    console.error('Error en sync-activity:', error);
    return res.status(500).json({ error: error.message });
  }
}
