import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const credsStr = process.env.GOOGLE_CREDENTIALS;
  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

  if (!credsStr || !SPREADSHEET_ID) {
    return res.status(500).json({ error: 'Faltan variables de entorno.' });
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
  const { activity, action } = req.body;

  try {
    const authClient = await auth.getClient();

    // ── ADD ─────────────────────────────────────────────────────────────────
    if (action === 'ADD') {
      let parroquiasStr = '';
      let sectoresStr = '';
      if (activity.ubicaciones && activity.ubicaciones.length > 0) {
        parroquiasStr = activity.ubicaciones.map(u => u.parroquia).join(' | ');
        sectoresStr   = activity.ubicaciones.map(u => u.sector).join(' | ');
      }

      const row = [
        activity.date          || '',   // A
        activity.time          || '',   // B
        activity.asesor        || '',   // C
        activity.activityType  || '',   // D
        activity.solicitudes   || 0,    // E
        activity.clientesCaptados || 0, // F
        activity.volantes      || '',   // G
        activity.llamadasInfo  || '',   // H
        activity.llamadasAgenda|| '',   // I
        parroquiasStr,                  // J
        sectoresStr,                    // K
        activity.condominio    || '',   // L
        activity.notes         || '',   // M
        '',                             // N — WhatsApp report (filled on FINALIZE)
        activity.uid,                   // O — Unique ID
      ];

      await sheets.spreadsheets.values.append({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!A:O`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });

      return res.status(200).json({ success: true, action: 'ADDED' });

    // ── DELETE ───────────────────────────────────────────────────────────────
    } else if (action === 'DELETE') {
      const uid = activity.uid;
      if (!uid) return res.status(400).json({ error: 'UID faltante para eliminar.' });

      const colRes = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!O:O`,
      });

      const allUids = colRes.data.values || [];
      const rowIndex = allUids.findIndex(row => row[0] === uid);

      if (rowIndex === -1) {
        return res.status(404).json({ error: 'Actividad no encontrada en la hoja.' });
      }

      const spreadsheet = await sheets.spreadsheets.get({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID,
      });
      const targetSheet = spreadsheet.data.sheets.find(s => s.properties.title === sheetName);
      const sheetId = targetSheet.properties.sheetId;

      await sheets.spreadsheets.batchUpdate({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID,
        requestBody: {
          requests: [{
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: rowIndex,
                endIndex: rowIndex + 1,
              },
            },
          }],
        },
      });

      return res.status(200).json({ success: true, action: 'DELETED' });

    // ── FINALIZE ─────────────────────────────────────────────────────────────
    } else if (action === 'FINALIZE') {
      const { uids, reporteWhatsapp } = req.body;
      if (!uids || !Array.isArray(uids) || uids.length === 0) {
        return res.status(400).json({ error: 'Lista de UIDs vacía para FINALIZE.' });
      }

      // Fetch column O to locate each row
      const colRes = await sheets.spreadsheets.values.get({
        auth: authClient,
        spreadsheetId: SPREADSHEET_ID,
        range: `'${sheetName}'!O:O`,
      });

      const allUids = colRes.data.values || [];

      // Build a batch of range-value pairs for column N
      const batchData = [];
      uids.forEach(uid => {
        const rowIndex = allUids.findIndex(row => row[0] === uid);
        if (rowIndex !== -1) {
          batchData.push({
            range: `'${sheetName}'!N${rowIndex + 1}`,
            values: [[reporteWhatsapp]],
          });
        }
      });

      if (batchData.length > 0) {
        await sheets.spreadsheets.values.batchUpdate({
          auth: authClient,
          spreadsheetId: SPREADSHEET_ID,
          requestBody: {
            valueInputOption: 'USER_ENTERED',
            data: batchData,
          },
        });
      }

      return res.status(200).json({ success: true, action: 'FINALIZE', updated: batchData.length });

    } else {
      return res.status(400).json({ error: 'Acción inválida.' });
    }

  } catch (error) {
    console.error('Error en sync-activity:', error);
    return res.status(500).json({ error: error.message });
  }
}
