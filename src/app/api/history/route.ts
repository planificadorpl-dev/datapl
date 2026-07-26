import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    // Fetch from Supabase instead of Sheets
    const { data: activities, error } = await supabase
      .from('actividades')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (error) {
      console.error('Error fetching history from Supabase:', error);
      return NextResponse.json({ error: 'Error al leer historial desde la base de datos.' }, { status: 500 });
    }

    if (!activities || activities.length === 0) {
      return NextResponse.json([]);
    }

    // Group rows by Date and Asesor
    const jornadasMap: Record<string, any> = {};

    activities.forEach(act => {
      // Re-format date YYYY-MM-DD back to DD/MM/YYYY for UI
      let displayDate = act.fecha;
      if (act.fecha && act.fecha.includes('-')) {
          displayDate = act.fecha.split('-').reverse().join('/');
      }
      
      const asesor = act.asesor;
      const key = `${displayDate}_${asesor}`;

      if (!jornadasMap[key]) {
        jornadasMap[key] = {
          date: displayDate,
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
    return NextResponse.json(historyArray);

  } catch (error: any) {
    console.error('Error general al obtener historial:', error);
    return NextResponse.json({ error: 'Error del servidor al obtener historial.' }, { status: 500 });
  }
}
