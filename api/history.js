import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
  );

  try {
    // Fetch from Supabase instead of Sheets to get all fields (including WhatsApp)
    const { data: activities, error } = await supabase
      .from('actividades')
      .select('*')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: false });

    if (error) throw error;
    if (!activities || activities.length === 0) {
      return res.status(200).json([]);
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
    return res.status(200).json(historyArray);

  } catch (error) {
    console.error('Error al leer historial:', error);
    return res.status(500).json({ error: 'Error del servidor al leer historial.' });
  }
}

