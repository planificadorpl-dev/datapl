"use client";

import { useState, useMemo, useEffect } from "react";
import { useAsesor } from "@/components/providers/asesor-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ChevronLeft, Save, FilePlus, MapPin, CheckCircle, BarChart3, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { geoHierarchy } from "@/lib/geo_hierarchy";
import { toast } from "sonner";

export default function NuevaActividadPage() {
  const { currentAsesor } = useAsesor();
  const router = useRouter();

  const [addedCount, setAddedCount] = useState(0);

  const [formData, setFormData] = useState({
    time: "",
    type: "",
    receivedCalls: false,
    phoneInfo: "",
    phoneAgenda: "",
    condominio: "",
    captados: "",
    volantes: "",
    estado: "",
    municipio: "",
    parroquia: "",
    sector: "",
    notes: ""
  });

  useEffect(() => {
    // Set time on mount
    setFormData(prev => ({
      ...prev,
      time: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
    }));
  }, []);

  // Derived Geo Options
  const estados = useMemo(() => Object.keys(geoHierarchy).sort(), []);
  const municipios = useMemo(() => formData.estado ? Object.keys(geoHierarchy[formData.estado as keyof typeof geoHierarchy] || {}).sort() : [], [formData.estado]);
  const parroquias = useMemo(() => formData.municipio ? Object.keys((geoHierarchy[formData.estado as keyof typeof geoHierarchy] as any)?.[formData.municipio] || {}).sort() : [], [formData.estado, formData.municipio]);
  const sectores = useMemo(() => formData.parroquia ? ((geoHierarchy[formData.estado as keyof typeof geoHierarchy] as any)?.[formData.municipio]?.[formData.parroquia] || []).sort() : [], [formData.estado, formData.municipio, formData.parroquia]);

  const handleStateChange = (val: string) => setFormData(prev => ({ ...prev, estado: val, municipio: "", parroquia: "", sector: "" }));
  const handleMunicipioChange = (val: string) => setFormData(prev => ({ ...prev, municipio: val, parroquia: "", sector: "" }));
  const handleParroquiaChange = (val: string) => setFormData(prev => ({ ...prev, parroquia: val, sector: "" }));

  const handleSubmit = (action: 'save_return' | 'add_another') => {
    if (!currentAsesor) {
      toast.error("Debe seleccionar un Asesor en la pantalla de Inicio primero.");
      return;
    }
    
    if (!formData.type) {
      toast.error("Seleccione un Tipo de Actividad");
      return;
    }

    if (!formData.estado || !formData.municipio || !formData.parroquia || !formData.sector) {
      toast.error("Por favor complete toda la Ubicación de Actividad");
      return;
    }

    if (formData.type === "Visita a Condominio" && !formData.condominio.trim()) {
      toast.error("El Nombre del Condominio es obligatorio para esta actividad");
      return;
    }

    if (formData.captados === "" || formData.captados === undefined || formData.volantes === "" || formData.volantes === undefined) {
      toast.error("Debe rellenar los campos de Captados y Volantes Entregados");
      return;
    }

    const activity = {
      uid: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      time: formData.time,
      date: new Date().toLocaleDateString('es-VE'),
      asesor: currentAsesor,
      activityType: formData.type,
      ubicaciones: {
        estado: formData.estado,
        municipio: formData.municipio,
        parroquia: formData.parroquia,
        sector: formData.sector
      },
      clientesCaptados: formData.captados || 0,
      solicitudes: 0,
      condominio: formData.condominio || '',
      volantes: formData.volantes || 0,
      receivedCalls: formData.receivedCalls,
      llamadasInfo: formData.phoneInfo || 0,
      llamadasAgenda: formData.phoneAgenda || 0,
      notes: formData.notes.trim()
    };

    // Prevent duplicates in same sector (same as main.js logic)
    let saved = [];
    try {
      const stored = localStorage.getItem('appState_activities');
      if (stored) saved = JSON.parse(stored);
    } catch(e){}

    const isDuplicate = saved.some((act: any) => 
      act.activityType === formData.type &&
      act.ubicaciones?.parroquia === formData.parroquia &&
      act.ubicaciones?.sector === formData.sector &&
      act.ubicaciones?.sector !== 'N/A'
    );

    if (isDuplicate) {
      toast.error(`⚠️ Ya registraste "${formData.type}" en: ${formData.parroquia} – ${formData.sector}.`);
      return;
    }

    saved.push(activity);
    localStorage.setItem('appState_activities', JSON.stringify(saved));
    
    if (action === 'save_return') {
      router.push('/actividades');
    } else {
      setAddedCount(prev => prev + 1);
      // Reset form
      setFormData(prev => ({
        ...prev,
        type: "", receivedCalls: false, phoneInfo: "", phoneAgenda: "",
        condominio: "", captados: "", volantes: "",
        estado: "", municipio: "", parroquia: "", sector: "", notes: "",
        time: new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })
      }));
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-[#F2F2F7] dark:bg-zinc-950 md:bg-white md:dark:bg-black md:p-8">
      {/* iOS Style Header */}
      <header className="bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-[#E5E5EA] dark:border-zinc-800 sticky top-0 z-50 md:hidden">
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <button onClick={() => router.push('/actividades')} className="text-[#007AFF] font-medium flex items-center gap-1">
            <ChevronLeft className="h-5 w-5" /> Volver
          </button>
          <h2 className="text-[17px] font-black text-black dark:text-white">Nueva Actividad</h2>
          <div className="w-[70px]"></div>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 py-6 md:p-0 md:max-w-2xl">
        {/* Web Header */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <Button variant="outline" size="icon" onClick={() => router.push('/actividades')} className="dark:border-zinc-700 dark:bg-zinc-900">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Nueva Actividad</h1>
            <p className="text-sm text-zinc-500">Agrega el detalle de la actividad realizada.</p>
          </div>
        </div>

        {addedCount > 0 && (
          <div className="mb-6 bg-white dark:bg-zinc-900/50 rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-[#E5E5EA]/50 dark:border-zinc-800 animate-in fade-in slide-in-from-top-2">
            <div className="w-10 h-10 rounded-full bg-[#34C759] flex items-center justify-center text-white shadow-lg shadow-[#34C759]/20">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-black dark:text-zinc-100">{addedCount} Actividad{addedCount > 1 ? 'es' : ''} Añadida{addedCount > 1 ? 's' : ''}</span>
              <span className="text-xs text-[#8E8E93]">Lista para guardar al finalizar.</span>
            </div>
          </div>
        )}

        <div className="space-y-6">
          {/* INFO GENERAL */}
          <div>
            <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-2 md:px-0">Información General</p>
            <Card className="rounded-2xl border-[#E5E5EA] dark:border-zinc-800 dark:bg-zinc-900 shadow-sm overflow-hidden md:rounded-lg">
              <CardContent className="p-0">
                <div className="flex flex-col divide-y divide-[#E5E5EA] dark:divide-zinc-800">
                  <div className="p-4 flex flex-col gap-1">
                    <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Hora del Reporte
                    </Label>
                    <Input readOnly value={formData.time} className="border-0 bg-transparent px-0 h-8 font-medium text-black dark:text-zinc-100 focus-visible:ring-0 shadow-none pointer-events-none" />
                  </div>
                  <div className="p-4 flex flex-col gap-1">
                    <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Asesor en Turno</Label>
                    <Input readOnly value={currentAsesor || "No seleccionado"} className="border-0 bg-transparent px-0 h-8 font-semibold text-black dark:text-zinc-100 focus-visible:ring-0 shadow-none pointer-events-none" />
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Tipo de Actividad</Label>
                    <Select value={formData.type} onValueChange={v => setFormData(p => ({ ...p, type: v }))}>
                      <SelectTrigger className="border-0 bg-transparent focus:ring-0 rounded-lg">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Visita a Condominio">🏢 Visita a Condominio</SelectItem>
                        <SelectItem value="Recorrido (Solo)">🚶 Recorrido (Solo)</SelectItem>
                        <SelectItem value="Recorrido con Instaladores">🚐 Recorrido con Instaladores</SelectItem>
                        <SelectItem value="Recorrido con Distribución">📦 Recorrido con Distribución</SelectItem>
                        <SelectItem value="Stand Publicitario">🎪 Stand Publicitario</SelectItem>
                        <SelectItem value="Iglu Publicitario">🛖 Iglu Publicitario</SelectItem>
                        <SelectItem value="Caravana">📣 Caravana</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* METRICS (Only visible if type is selected) */}
          {formData.type && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-2 md:px-0">Métricas del Reporte</p>
              <Card className="rounded-2xl border-[#E5E5EA] dark:border-zinc-800 dark:bg-zinc-900 shadow-sm overflow-hidden md:rounded-lg">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-[#E5E5EA] dark:divide-zinc-800">
                    
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[15px] font-semibold text-black dark:text-zinc-100">Contacto Telefónico</span>
                        <span className="text-[12px] text-[#8E8E93]">¿Recibiste llamadas?</span>
                      </div>
                      <Switch 
                        checked={formData.receivedCalls}
                        onCheckedChange={c => setFormData(p => ({ ...p, receivedCalls: c, phoneInfo: "", phoneAgenda: "" }))}
                      />
                    </div>

                    {formData.receivedCalls && (
                      <div className="bg-[#F2F2F7]/50 dark:bg-zinc-950/50 grid grid-cols-2 divide-x divide-[#E5E5EA] dark:divide-zinc-800 animate-in slide-in-from-top-2">
                        <div className="p-4 flex flex-col gap-1">
                          <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Solo Info.</Label>
                          <Input type="number" min="0" placeholder="0" value={formData.phoneInfo} onChange={e => setFormData(p => ({ ...p, phoneInfo: e.target.value }))} className="border-0 bg-transparent px-0 h-8 focus-visible:ring-0 shadow-none text-base" />
                        </div>
                        <div className="p-4 flex flex-col gap-1">
                          <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Agendados</Label>
                          <Input type="number" min="0" placeholder="0" value={formData.phoneAgenda} onChange={e => setFormData(p => ({ ...p, phoneAgenda: e.target.value }))} className="border-0 bg-transparent px-0 h-8 focus-visible:ring-0 shadow-none text-base" />
                        </div>
                      </div>
                    )}

                    {formData.type === "Visita a Condominio" && (
                      <div className="p-4 flex flex-col gap-1">
                        <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Nombre del Condominio</Label>
                        <Input placeholder="Ej. Res. Las Rosas" value={formData.condominio} onChange={e => setFormData(p => ({ ...p, condominio: e.target.value }))} className="border-0 bg-transparent px-0 h-8 focus-visible:ring-0 shadow-none text-base" />
                      </div>
                    )}

                    <div className="p-4 flex flex-col gap-1">
                      <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Captados</Label>
                      <Input type="number" min="0" placeholder="0" value={formData.captados} onChange={e => setFormData(p => ({ ...p, captados: e.target.value }))} className="border-0 bg-transparent px-0 h-8 focus-visible:ring-0 shadow-none text-base" />
                    </div>

                    <div className="p-4 flex flex-col gap-1">
                      <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Volantes Entregados</Label>
                      <Input type="number" min="0" placeholder="0" value={formData.volantes} onChange={e => setFormData(p => ({ ...p, volantes: e.target.value }))} className="border-0 bg-transparent px-0 h-8 focus-visible:ring-0 shadow-none text-base" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* UBICACION */}
          {formData.type && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-2 md:px-0">Ubicación de Actividad</p>
              <Card className="rounded-2xl border-[#E5E5EA] dark:border-zinc-800 dark:bg-zinc-900 shadow-sm overflow-hidden md:rounded-lg">
                <CardContent className="p-0">
                  <div className="flex flex-col divide-y divide-[#E5E5EA] dark:divide-zinc-800">
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Estado</Label>
                        <Select value={formData.estado} onValueChange={handleStateChange}>
                          <SelectTrigger className="border-0 bg-transparent focus:ring-0 rounded-lg"><SelectValue placeholder="Selec..." /></SelectTrigger>
                          <SelectContent>{estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Municipio</Label>
                        <Select disabled={!formData.estado} value={formData.municipio} onValueChange={handleMunicipioChange}>
                          <SelectTrigger className="border-0 bg-transparent focus:ring-0 rounded-lg"><SelectValue placeholder="Selec..." /></SelectTrigger>
                          <SelectContent>{municipios.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Parroquia</Label>
                        <Select disabled={!formData.municipio} value={formData.parroquia} onValueChange={handleParroquiaChange}>
                          <SelectTrigger className="border-0 bg-transparent focus:ring-0 rounded-lg"><SelectValue placeholder="Selec..." /></SelectTrigger>
                          <SelectContent>{parroquias.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Sector</Label>
                        <Select disabled={!formData.parroquia} value={formData.sector} onValueChange={v => setFormData(p => ({ ...p, sector: v }))}>
                          <SelectTrigger className="border-0 bg-transparent focus:ring-0 rounded-lg"><SelectValue placeholder="Selec..." /></SelectTrigger>
                          <SelectContent>{sectores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* OBSERVACIONES */}
          {formData.type && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-2 md:px-0">Observaciones</p>
              <Card className="rounded-2xl border-[#E5E5EA] dark:border-zinc-800 dark:bg-zinc-900 shadow-sm overflow-hidden md:rounded-lg">
                <CardContent className="p-4">
                  <Textarea 
                    placeholder="Detalles o incidencias..." 
                    value={formData.notes}
                    onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                    className="border-0 bg-transparent px-0 focus-visible:ring-0 shadow-none resize-none text-base"
                    rows={3}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* ACTIONS */}
          <div className="pt-2 space-y-3">
            <Button onClick={() => handleSubmit('save_return')} className="w-full h-12 bg-[#007AFF] hover:bg-[#0056b3] text-white rounded-xl text-base font-bold shadow-sm flex items-center justify-center gap-2">
              <span>Guardar y Finalizar</span>
              <Save className="h-5 w-5" />
            </Button>
            
            <Button onClick={() => handleSubmit('add_another')} variant="outline" className="w-full h-12 bg-white dark:bg-transparent text-[#007AFF] border-[#007AFF] hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-xl text-base font-semibold shadow-sm">
              <FilePlus className="h-5 w-5 mr-2" />
              Añadir Otra Actividad
            </Button>
          </div>
          
        </div>
      </div>
    </div>
  );
}
