import { supabase } from './supabaseClient.js';

// ── Ventas API ────────────────────────────────────────────────────────

export const VentasAPI = {
  
  // -- OPERADORES --
  
  async getOperadores() {
    const { data, error } = await supabase
      .from("operadores_competencia")
      .select("*")
      .order("nombre", { ascending: true });
    if (error) {
      console.error("Error fetching operadores:", error.message);
      return [];
    }
    return data || [];
  },

  async saveOperador(nombre, color_hex, logo_url) {
    const { data, error } = await supabase
      .from("operadores_competencia")
      .insert([{ nombre, color_hex, logo_url }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateOperador(id, nombre, color_hex, logo_url) {
    const { data, error } = await supabase
      .from("operadores_competencia")
      .update({ nombre, color_hex, logo_url })
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteOperador(id) {
    // First, delete related ofertas to avoid FK constraint error
    await supabase.from("ofertas_competencia").delete().eq("operador_id", id);
    // Then delete the operator itself
    const { error } = await supabase.from("operadores_competencia").delete().eq("id", id);
    if (error) throw new Error(error.message);
    return true;
  },

  // -- OFERTAS BATCH --
  async saveOfertasBatch(ofertas) {
    const { data, error } = await supabase
      .from("ofertas_competencia")
      .insert(ofertas)
      .select();
    if (error) throw new Error(error.message);
    return data;
  },

  async deleteOfertaZona(operador_id, estado, municipio, parroquia) {
    let query = supabase
      .from("ofertas_competencia")
      .delete()
      .eq("operador_id", operador_id)
      .eq("estado", estado)
      .eq("municipio", municipio);
    if (parroquia !== "Todas") {
      query = query.eq("parroquia", parroquia);
    }
    const { error } = await query;
    if (error) throw new Error(error.message);
    return true;
  },

  // -- OFERTAS --

  async getOfertasRecientes(estado, municipio, parroquia) {
    const { data: ops } = await supabase.from("operadores_competencia").select("*");
    const operadores = ops || [];

    let query = supabase
      .from("ofertas_competencia")
      .select(`
        *,
        operadores_competencia (
          id,
          nombre,
          color_hex,
          logo_url
        )
      `)
      .order("created_at", { ascending: false })
      .limit(1000);

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching ofertas recientes:", error);
      return [];
    }

    const hasGeoFilter = !!(estado || municipio || parroquia);
    let filteredData = data || [];

    if (hasGeoFilter) {
      const opsInZone = new Set();
      for (const row of filteredData) {
        if (row.estado === 'Nacional') continue;
        const matchEstado = !estado || row.estado === estado;
        const matchMunicipio = !municipio || row.municipio === municipio;
        const matchParroquia = !parroquia || row.parroquia === parroquia;
        if (matchEstado && matchMunicipio && matchParroquia) {
          opsInZone.add(row.operador_id);
        }
      }
      filteredData = filteredData.filter(row => {
        if (!opsInZone.has(row.operador_id)) return false;
        const isNacional = row.estado === 'Nacional';
        if (isNacional) return true;
        const matchEstado = !estado || row.estado === estado;
        const matchMunicipio = !municipio || row.municipio === municipio;
        const matchParroquia = !parroquia || row.parroquia === parroquia;
        return matchEstado && matchMunicipio && matchParroquia;
      });
    }

    const ultimasOfertasMap = new Map();
    
    for (const oferta of filteredData) {
      if (!ultimasOfertasMap.has(oferta.operador_id)) {
        ultimasOfertasMap.set(oferta.operador_id, {
          ...oferta,
          min_precio: typeof oferta.precio_mensual === 'number' ? oferta.precio_mensual : Infinity,
          max_velocidad: typeof oferta.velocidad_mb === 'number' ? oferta.velocidad_mb : 0,
          todas_inst: (oferta.costo_instalacion !== null && typeof oferta.costo_instalacion !== 'undefined') ? [oferta.costo_instalacion] : []
        });
      } else {
        const ag = ultimasOfertasMap.get(oferta.operador_id);
        if (typeof oferta.precio_mensual === 'number' && oferta.precio_mensual < ag.min_precio) ag.min_precio = oferta.precio_mensual;
        if (typeof oferta.velocidad_mb === 'number' && oferta.velocidad_mb > ag.max_velocidad) ag.max_velocidad = oferta.velocidad_mb;
        if (oferta.costo_instalacion !== null && typeof oferta.costo_instalacion !== 'undefined') {
           if (!ag.todas_inst.includes(oferta.costo_instalacion)) {
              ag.todas_inst.push(oferta.costo_instalacion);
           }
        }
      }
    }
    
    for (const [, ag] of ultimasOfertasMap.entries()) {
      if (ag.min_precio === Infinity) ag.min_precio = 0;
    }

    if (!hasGeoFilter) {
      for (const op of operadores) {
        if (!ultimasOfertasMap.has(op.id)) {
          ultimasOfertasMap.set(op.id, {
            id: `empty-${op.id}`,
            operador_id: op.id,
            operadores_competencia: { nombre: op.nombre, color_hex: op.color_hex, logo_url: op.logo_url },
            isEmpty: true
          });
        }
      }
    }

    return Array.from(ultimasOfertasMap.values());
  },

  async getHistorialOperador(operador_id, estado, municipio, parroquia) {
    let query = supabase
      .from("ofertas_competencia")
      .select("*")
      .eq("operador_id", operador_id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (estado) query = query.eq("estado", estado);
    if (municipio) query = query.eq("municipio", municipio);
    if (parroquia) query = query.eq("parroquia", parroquia);

    const { data, error } = await query;
    if (error) {
      console.error("Error fetching historial operador:", error);
      return [];
    }
    return data || [];
  },

  async getSnapshotOperador(operador_id, estado, municipio, parroquia) {
    let historial = await this.getHistorialOperador(operador_id, estado, municipio, parroquia);
    
    if (estado && estado !== "Nacional") {
      const historialNacional = await this.getHistorialOperador(operador_id, "Nacional", "Todos", "Todas");
      if (historialNacional && historialNacional.length > 0) {
        historial = [...(historial || []), ...historialNacional];
      }
    }

    if (!historial || historial.length === 0) return null;

    const zoneDates = new Map();
    for (const h of historial) {
      const key = `${h.estado}|${h.municipio}|${h.parroquia}`;
      if (!zoneDates.has(key) || new Date(h.fecha_reporte) > new Date(zoneDates.get(key))) {
        zoneDates.set(key, h.fecha_reporte);
      }
    }

    const snapshotPlans = historial.filter(h => {
      const key = `${h.estado}|${h.municipio}|${h.parroquia}`;
      return h.fecha_reporte === zoneDates.get(key);
    });

    const planesEstandar = snapshotPlans.filter(p => !p.es_promocion);
    const promociones = snapshotPlans.filter(p => p.es_promocion);

    return {
      planes_estandar: planesEstandar.map(p => ({
        nombre_plan: p.nombre_plan || "",
        velocidad: String(p.velocidad_mb),
        velocidad_subida: p.velocidad_subida ? String(p.velocidad_subida) : "",
        tecnologia: p.tecnologia || "FTTH",
        es_simetrico: p.es_simetrico,
        incluye_iptv: p.incluye_iptv,
        precio: String(p.precio_mensual),
        servicios: p.servicios_adicionales || [],
        estado: p.estado,
        municipio: p.municipio,
        parroquia: p.parroquia,
        instalacion: {
          costo_base: p.costo_instalacion ? String(p.costo_instalacion) : "",
          modalidad: p.modalidad_instalacion || "",
          metraje: p.instalacion_metraje ? String(p.instalacion_metraje) : "",
          opciones: p.instalacion_opciones || []
        },
        notas_anteriores: p.notas || ""
      })),
      promociones: promociones.map(p => ({
        nombre_plan: p.nombre_plan || "",
        velocidad: String(p.velocidad_mb),
        velocidad_subida: p.velocidad_subida ? String(p.velocidad_subida) : "",
        tecnologia: p.tecnologia || "FTTH",
        es_simetrico: p.es_simetrico,
        incluye_iptv: p.incluye_iptv,
        precio_promo: String(p.precio_mensual),
        precio_regular: p.precio_regular ? String(p.precio_regular) : "",
        duracion_meses: p.duracion_promo_meses ? String(p.duracion_promo_meses) : "",
        fecha_fin: p.fecha_fin_promo || "",
        servicios: p.servicios_adicionales || [],
        estado: p.estado,
        municipio: p.municipio,
        parroquia: p.parroquia,
        instalacion: {
          costo_base: p.costo_instalacion ? String(p.costo_instalacion) : "",
          modalidad: p.modalidad_instalacion || "",
          metraje: p.instalacion_metraje ? String(p.instalacion_metraje) : "",
          opciones: p.instalacion_opciones || []
        },
        notas_anteriores: p.notas || ""
      })),
      instalacion: {
        costo_base: snapshotPlans.length > 0 && snapshotPlans[0].costo_instalacion ? String(snapshotPlans[0].costo_instalacion) : "",
        modalidad: snapshotPlans.length > 0 ? snapshotPlans[0].modalidad_instalacion || "" : "",
        metraje: snapshotPlans.length > 0 && snapshotPlans[0].instalacion_metraje ? String(snapshotPlans[0].instalacion_metraje) : "",
        opciones: snapshotPlans.length > 0 ? snapshotPlans[0].instalacion_opciones || [] : []
      },
      notas_anteriores: snapshotPlans.length > 0 ? snapshotPlans[0].notas || "" : ""
    };
  }
};
