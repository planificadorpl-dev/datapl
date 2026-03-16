import { google } from 'googleapis';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // 1. Get Credentials
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
      return res.status(200).json([]); 
    }

    // Skip headers (index 0)
    const dataRows = rows.slice(1);

    // Group rows by Date and Asesor
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

    // Convert map to array and sort by most recent
    const historyArray = Object.values(jornadasMap).reverse();

    return res.status(200).json(historyArray);

  } catch (error) {
    console.error('Error al leer historial desde Google Sheets:', error);
    return res.status(500).json({ error: 'Error del servidor al leer Google Sheets.' });
  }
}
