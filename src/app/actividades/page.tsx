"use client";

import { useState, useEffect } from "react";
import { PremiumPageLayout } from "@/components/ui/premium-page-layout";
import { useAsesor } from "@/components/providers/asesor-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Check, Send, MapPin, Building, StickyNote, Trash2, Calendar, CheckCircle2, History } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ActividadesPage() {
  const { currentAsesor } = useAsesor();
  const router = useRouter();
  
  const [activities, setActivities] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    // Load from local storage on mount
    const saved = localStorage.getItem('appState_activities');
    if (saved) {
      try {
        setActivities(JSON.parse(saved));
      } catch (e) { }
    }
  }, []);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        // Filter history by current Asesor
        const filtered = currentAsesor ? data.filter((h: any) => h.asesor === currentAsesor) : data;
        setHistory(filtered);
      }
    } catch (e) {
      toast.error('Error al cargar el historial');
    } finally {
      setHistoryLoading(false);
    }
  };

  const deleteActivity = (idx: number) => {
    const newActs = [...activities];
    newActs.splice(idx, 1);
    setActivities(newActs);
    localStorage.setItem('appState_activities', JSON.stringify(newActs));
    toast.success('Actividad eliminada');
  };

  const finalizeJornada = async () => {
    if (!currentAsesor) {
      toast.error('Selecciona un Asesor primero');
      return;
    }
    
    setIsClosing(true);
    
    // Generate Report String EXACTLY like the original project
    const TAB = '   ';
    let totalSoli = 0, totalCap = 0, totalVol = 0, totalInfo = 0, totalAgenda = 0;
    
    activities.forEach(a => {
      totalSoli   += parseInt(a.solicitudes       || 0);
      totalCap    += parseInt(a.clientesCaptados  || 0);
      totalVol    += parseInt(a.volantes          || 0);
      totalInfo   += parseInt(a.llamadasInfo      || 0);
      totalAgenda += parseInt(a.llamadasAgenda    || 0);
    });

    let msg = '';
    msg += `*REPORTE DIARIO*\n`;
    msg += `Fecha: ${new Date().toLocaleDateString('es-VE')}\n`;
    msg += `Asesor: ${currentAsesor}\n\n`;

    msg += `*RESUMEN*\n`;
    msg += `Solicitudes confirmadas: ${totalSoli}\n`;
    msg += `Clientes captados: ${totalCap}\n`;
    if (totalVol > 0)
      msg += `Volantes entregados: ${totalVol}\n`;
    if (totalInfo > 0 || totalAgenda > 0) {
      msg += `Llamadas (info): ${totalInfo}\n`;
      msg += `Llamadas (agenda): ${totalAgenda}\n`;
    }

    msg += `\nACTIVIDADES (${activities.length})\n`;

    activities.forEach((act, idx) => {
      const type = act.activityType || 'Actividad';
      msg += `\n${idx + 1}. ${type} (${act.time})\n`;

      // Location
      if (act.ubicaciones && (act.ubicaciones.parroquia || act.ubicaciones.sector)) {
        const locStr = [act.ubicaciones.estado, act.ubicaciones.municipio, act.ubicaciones.parroquia, act.ubicaciones.sector].filter(v => v && v !== 'N/A').join(', ');
        msg += `${TAB}Ubicación: ${locStr}\n`;
      }

      // Type-specific: Condominio
      if (type === 'Visita a Condominio' && act.condominio) {
        msg += `${TAB}Condominio: ${act.condominio}\n`;
      }

      // Metrics
      msg += `${TAB}Clientes captados: ${act.clientesCaptados || 0}\n`;
      msg += `${TAB}Solicitudes enviadas: ${act.solicitudes || 0}\n`;
      if (act.linkedClients && act.linkedClients.length > 0) {
        act.linkedClients.forEach((c: any) => {
          msg += `${TAB}  - ${c.name} (C.I: ${c.ci})\n`;
        });
      }
      msg += `${TAB}Volantes entregados: ${act.volantes || 0}\n`;

      // Calls
      if (act.receivedCalls) {
        msg += `${TAB}Llamadas recibidas:\n`;
        msg += `${TAB}· Info: ${act.llamadasInfo || 0}\n`;
        msg += `${TAB}· Agenda: ${act.llamadasAgenda || 0}\n`;
      }

      // Notes
      if (act.notes && act.notes.trim()) {
        msg += `${TAB}Obs: ${act.notes.trim()}\n`;
      }
    });

    msg = msg.trim();

    const payload = {
      date: new Date().toLocaleDateString('es-VE'),
      asesor: currentAsesor,
      reporteWhatsapp: msg,
      activitiesDetail: activities
    };

    try {
      const res = await fetch('/api/save-jornada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      
      toast.success('Jornada finalizada y guardada exitosamente');
      
      // Open WA
      const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
      window.open(url, '_blank');

      // Clear local state
      setActivities([]);
      localStorage.removeItem('appState_activities');
      
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar la jornada');
    } finally {
      setIsClosing(false);
    }
  };

  const sendHistoryToWa = (text: string) => {
    if(!text) {
      toast.error('No hay reporte disponible para esta jornada');
      return;
    }
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <PremiumPageLayout 
      title="Actividades" 
      description="Reporte diario de visitas, recorridos y captación de clientes."
    >
      <Tabs defaultValue="hoy" className="w-full" onValueChange={(val) => {
        if(val === 'historial') fetchHistory();
      }}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="hoy" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Hoy {activities.length > 0 && <span className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 px-1.5 py-0.5 rounded text-[10px] ml-1">{activities.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="hoy" className="space-y-4">
          <Button 
            className="w-full h-12 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-base rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
            onClick={() => router.push('/actividades/nueva')}
          >
            <Plus className="h-5 w-5" />
            Añadir Actividad
          </Button>

          {activities.length === 0 ? (
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center my-6">
              <CheckCircle2 className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">No hay actividades abiertas</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Añade una actividad para comenzar tu reporte.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-lg">Hoy ({activities.length})</h3>
              </div>
              
              {activities.map((act, idx) => {
                let locParts = [];
                if(act.ubicaciones) {
                   if(act.ubicaciones.parroquia) locParts.push(act.ubicaciones.parroquia);
                   if(act.ubicaciones.sector) locParts.push(act.ubicaciones.sector);
                }
                const locStr = locParts.join(' > ');

                return (
                  <Card key={idx} className="rounded-2xl border-zinc-200 dark:border-zinc-800 dark:bg-zinc-900/40 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 pt-4 pb-2">
                      <div>
                        <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-base leading-tight">{act.activityType}</h4>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">{act.time} · Hoy</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 gap-1 h-8 px-2" onClick={() => router.push(`/solicitudes?actividad_uid=${act.uid}`)}>
                          <Plus className="h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Solicitud</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 w-8" onClick={() => deleteActivity(idx)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CardContent className="px-5 pb-3 space-y-1.5 pt-0">
                      {locStr && (
                        <div className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-emerald-500" />
                          <span>{locStr}</span>
                        </div>
                      )}
                      {act.condominio && (
                        <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                          <Building className="h-4 w-4 shrink-0 text-blue-500" />
                          <span>{act.condominio}</span>
                        </div>
                      )}
                      {act.notes && (
                        <div className="flex items-start gap-2 text-sm text-zinc-500 dark:text-zinc-500 italic">
                          <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-zinc-400 dark:text-zinc-600" />
                          <span>{act.notes}</span>
                        </div>
                      )}
                    </CardContent>
                    <div className="bg-zinc-50 dark:bg-zinc-800/30 px-5 py-3 flex items-center gap-2 flex-wrap border-t border-zinc-100 dark:border-zinc-800">
                      <span className={`inline-flex items-center border px-2 py-0.5 text-xs font-semibold rounded-md ${act.clientesCaptados > 0 ? 'border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800' : 'border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-500'}`}>
                        {act.clientesCaptados || 0} captados
                      </span>
                      {(act.solicitudes || 0) > 0 && (
                        <span className="inline-flex items-center border border-green-200 dark:border-green-900/50 px-2 py-0.5 text-xs font-semibold rounded-md text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
                          {act.solicitudes} ventas
                        </span>
                      )}
                      {(act.volantes || 0) > 0 && (
                        <span className="inline-flex items-center border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs font-semibold rounded-md text-zinc-900 dark:text-zinc-100 bg-white dark:bg-zinc-800">
                          {act.volantes} volantes
                        </span>
                      )}
                    </div>
                  </Card>
                )
              })}

              <div className="flex flex-col gap-3 pb-6 mt-8">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-base font-bold shadow-sm gap-2">
                      <Check className="h-5 w-5" />
                      Cierre de Jornada
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Finalizar Jornada?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción procesará las actividades abiertas, las guardará en la base de datos (y Google Sheets) y generará el reporte de campo para el cierre del día.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={finalizeJornada} disabled={isClosing}>
                        {isClosing ? 'Procesando...' : 'Continuar'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <p className="text-xs text-center text-zinc-400 dark:text-zinc-500">
                  Archiva las actividades del día, genera el reporte completo y lo envía por WhatsApp.
                </p>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="historial" className="space-y-4">
          {historyLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900"></div>
            </div>
          ) : history.length === 0 ? (
            <div className="bg-zinc-50 dark:bg-zinc-900/50 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 p-12 text-center my-6">
              <History className="mx-auto h-10 w-10 text-zinc-300 dark:text-zinc-700 mb-3" />
              <h3 className="text-zinc-900 dark:text-zinc-100 font-medium mb-1">Sin historial</h3>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Las jornadas cerradas aparecerán aquí.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((jor, idx) => (
                <div key={idx} className="bg-white dark:bg-zinc-900/40 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm overflow-hidden">
                  <div className="p-5 text-left">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100 capitalize">{jor.date}</h4>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="inline-flex items-center border border-zinc-200 dark:border-zinc-700 px-2 py-0.5 text-xs font-semibold rounded-md text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800">
                        {jor.activitiesCount} actividades
                      </span>
                      <span className="inline-flex items-center border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-xs font-semibold rounded-md text-zinc-500 dark:text-zinc-400">
                        {jor.totals?.captados || 0} captados
                      </span>
                      {jor.totals?.volantes > 0 && (
                        <span className="inline-flex items-center border border-zinc-200 dark:border-zinc-800 px-2 py-0.5 text-xs font-semibold rounded-md text-zinc-500 dark:text-zinc-400">
                          {jor.totals?.volantes} volantes
                        </span>
                      )}
                      <span className="text-xs text-violet-500 dark:text-violet-400 font-medium ml-1">{jor.asesor}</span>
                    </div>
                  </div>
                  <div className="px-5 py-3 bg-zinc-50 dark:bg-zinc-800/30 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                    <Button 
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold gap-2"
                      onClick={() => sendHistoryToWa(jor.reporteWhatsapp)}
                    >
                      <Send className="h-4 w-4" />
                      Enviar por WhatsApp
                    </Button>
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
