"use client";

import { useState, useEffect, Suspense } from "react";
import { PremiumPageLayout } from "@/components/ui/premium-page-layout";
import { SolicitudForm } from "@/components/solicitud-form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAsesor } from "@/components/providers/asesor-provider";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Clock, History, FileText, Calendar, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SolicitudesPage() {
  const { currentAsesor } = useAsesor();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = async () => {
    if (!currentAsesor) return;
    
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('solicitudes')
        .select('*')
        .eq('promotor', currentAsesor)
        .order('fecha_solicitud', { ascending: false });

      if (error) throw error;
      setHistory(data || []);
    } catch (e: any) {
      toast.error('Error al cargar el historial de solicitudes: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const resendToWhatsApp = (sol: any) => {
    let waMsg = `*Solicitud de Servicio*\n\n`;
    waMsg += `Fecha de solicitud: ${sol.fecha_solicitud}\n`;
    waMsg += `Cliente: ${sol.nombres} ${sol.apellidos}\n`;
    waMsg += `Cédula/RIF: ${sol.cedula}\n`;
    waMsg += `Teléfono: ${sol.telefono_principal}\n`;
    waMsg += `Ubicación: ${sol.estado}, ${sol.municipio}, ${sol.parroquia}, ${sol.sector}, ${sol.direccion}\n`;
    waMsg += `Servicio: ${sol.tipo_servicio} - ${sol.plan}\n`;
    waMsg += `Fuente: ${sol.fuente}\n`;
    waMsg += `Promotor/a: ${sol.promotor}\n`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(waMsg)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <PremiumPageLayout 
      title="Solicitudes de Servicio" 
      description="Registra clientes o revisa tu historial de solicitudes"
    >
      <Tabs defaultValue="registro" className="w-full" onValueChange={(val) => {
        if(val === 'historial') fetchHistory();
      }}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="registro" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Registro
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="registro" className="space-y-4">
          <div className="max-w-4xl mx-auto">
            <Suspense fallback={<div className="p-8 text-center text-zinc-500">Cargando formulario...</div>}>
              <SolicitudForm />
            </Suspense>
          </div>
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center my-6 max-w-4xl mx-auto">
              <History className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">Sin historial</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {currentAsesor ? "No tienes solicitudes registradas aún." : "Selecciona un Asesor en Inicio para ver su historial."}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 max-w-4xl mx-auto">
              {history.map((sol) => (
                <div key={sol.id} className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col md:flex-row">
                  <div className="p-5 flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 capitalize text-lg">{sol.nombres} {sol.apellidos}</h4>
                        <div className="flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
                          <Calendar className="h-3.5 w-3.5" />
                          <span>{sol.fecha_solicitud}</span>
                        </div>
                      </div>
                      <Badge variant={sol.status === 'Completada' ? 'default' : sol.status === 'Pendiente' ? 'secondary' : 'outline'} className={sol.status === 'Completada' ? 'bg-green-500 hover:bg-green-600' : ''}>
                        {sol.status || 'Pendiente'}
                      </Badge>
                    </div>
                    
                    <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                      <div className="flex flex-col">
                        <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider">Plan</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{sol.plan} ({sol.tipo_servicio})</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider">Ubicación</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200 line-clamp-1" title={`${sol.municipio}, ${sol.parroquia}`}>{sol.municipio}, {sol.parroquia}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider">Cédula</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{sol.cedula}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-zinc-400 dark:text-zinc-500 text-xs font-medium uppercase tracking-wider">Fuente</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{sol.fuente}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-zinc-50 dark:bg-zinc-800/30 border-t md:border-t-0 md:border-l border-zinc-100 dark:border-zinc-800 p-4 flex md:flex-col items-center justify-center gap-2 min-w-[140px]">
                     <button 
                        onClick={() => resendToWhatsApp(sol)}
                        className="w-full h-10 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                     >
                       <Send className="h-4 w-4" />
                       Re-enviar
                     </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </PremiumPageLayout>
  );
}
