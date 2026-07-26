import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// This handles the Cierre de Jornada: saving to Google Sheets & Supabase

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: Request) {
  try {
    const jornada = await req.json();

    if (!jornada || !jornada.activitiesDetail || !Array.isArray(jornada.activitiesDetail)) {
      return NextResponse.json({ error: 'Payload de Jornada inválido.' }, { status: 400 });
    }

    // 1. Google Sheets Logic
    let authClient;
    let sheetsSuccess = false;
    let sheetsError = null;

    try {
      // Look for credentials.json in the project root or parent directory
      // Since next runs in datapl-next, credentials.json might be in datapl (..)
      const credentialsPath = path.resolve(process.cwd(), '../credentials.json');
      
      const auth = new google.auth.GoogleAuth({
        keyFile: credentialsPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      authClient = await auth.getClient();
      
      const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
      
      if (SPREADSHEET_ID) {
        const sheets = google.sheets('v4');
        
        const rows = jornada.activitiesDetail.map((act: any) => {
          const u = act.ubicaciones || {};
          const estadosStr = u.estado || "";
          const municipiosStr = u.municipio || "";
          const parroquiasStr = u.parroquia || "";
          const sectoresStr = u.sector || "";
          
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

        await sheets.spreadsheets.values.append({
          auth: authClient as any,
          spreadsheetId: SPREADSHEET_ID,
          range: "'REPORTES DE ASESORES'!A:O", 
          valueInputOption: 'USER_ENTERED',
          requestBody: { values: rows },
        });
        sheetsSuccess = true;
      } else {
        sheetsError = "Falta SPREADSHEET_ID en el archivo .env";
      }
    } catch (e: any) {
      console.warn('⚠️ Falló la integración con Google Sheets:', e.message);
      sheetsError = e.message;
    }

    // 2. Supabase Logic (Actividades table)
    let supabaseSuccess = false;
    let supErrorMsg = null;

    try {
      const supabaseRows = jornada.activitiesDetail.map((act: any) => {
        const u = act.ubicaciones || {};
        // Convert "DD/MM/YYYY" -> "YYYY-MM-DD"
        let fechaFormatted = jornada.date;
        if (fechaFormatted && fechaFormatted.includes('/')) {
            fechaFormatted = fechaFormatted.split('/').reverse().join('-');
        }
        
        return {
          fecha: fechaFormatted,
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
          reporte_wa: jornada.reporteWhatsapp || null,
          uid: act.uid || null
        };
      });

      const { error: supError } = await supabase.from('actividades').insert(supabaseRows);
      
      if (supError) {
        console.error('Error saving to Supabase activities:', supError);
        supErrorMsg = supError.message;
      } else {
        supabaseSuccess = true;
      }
    } catch (e: any) {
      console.error('Exception saving to Supabase:', e.message);
      supErrorMsg = e.message;
    }

    if (!sheetsSuccess && !supabaseSuccess) {
       return NextResponse.json({ error: 'Fallo al guardar en Sheets y Supabase.', sheetsError, supErrorMsg }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Procesado', 
      details: { sheetsSuccess, supabaseSuccess, sheetsError, supErrorMsg }
    });

  } catch (error: any) {
    console.error('Error al guardar reporte:', error);
    return NextResponse.json({ error: 'Error del servidor al guardar reporte.', details: error.message }, { status: 500 });
  }
}
