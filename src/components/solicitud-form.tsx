"use client"

import { useState, useMemo, useEffect } from "react"
import { useAsesor } from "@/components/providers/asesor-provider"
import { geoHierarchy } from "@/lib/geo_hierarchy"
import { createClient } from "@/lib/supabase/client"
import { getTvLabel } from "@/app/admin/settings-actions"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, MapPin, User, Package, CheckCircle } from "lucide-react"
import { useSearchParams } from "next/navigation"

type PlanType = {
  id: string
  nombre: string
}

export function SolicitudForm() {
  const { currentAsesor } = useAsesor()
  const [loading, setLoading] = useState(false)
  const [allPlanes, setAllPlanes] = useState<any[]>([])
  const [pendingActivities, setPendingActivities] = useState<any[]>([])
  const [tvLabel, setTvLabel] = useState("TV")
  
  const searchParams = useSearchParams()
  const initialActividadUid = searchParams.get('actividad_uid') || ""

  // Form State
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    cedula_prefix: "V-",
    cedula: "",
    genero: "",
    fecha_nac: "",
    fecha_disponibilidad: new Date().toISOString().split('T')[0],
    telefono_principal: "",
    telefono_secundario: "",
    correo: "",
    estado: "",
    municipio: "",
    parroquia: "",
    sector: "",
    direccion: "",
    tipo_servicio: "Domiciliario",
    plan: "",
    fuente: "",
    actividad_uid: initialActividadUid,
  })

  // Load Config (Planes)
  useEffect(() => {
    const fetchPlanes = async () => {
      const supabase = createClient()
      const { data } = await supabase.from('planes_config').select('*').eq('activo', true)
      if (data) {
        setAllPlanes(data)
      }
      try {
        const label = await getTvLabel()
        setTvLabel(label)
      } catch (e) {
        console.error("Error fetching tv label", e)
      }
    }
    fetchPlanes()

    // Load Pending Activities from local storage
    const saved = localStorage.getItem('appState_activities')
    if (saved) {
      try {
        setPendingActivities(JSON.parse(saved))
      } catch (e) {
        console.error("Error loading pending activities", e)
      }
    }
  }, [])

  const estados = useMemo(() => Object.keys(geoHierarchy).sort(), [])
  const municipios = useMemo(() => formData.estado ? Object.keys(geoHierarchy[formData.estado as keyof typeof geoHierarchy] || {}).sort() : [], [formData.estado])
  const parroquias = useMemo(() => formData.municipio ? Object.keys((geoHierarchy[formData.estado as keyof typeof geoHierarchy] as any)?.[formData.municipio] || {}).sort() : [], [formData.estado, formData.municipio])
  const sectores = useMemo(() => formData.parroquia ? ((geoHierarchy[formData.estado as keyof typeof geoHierarchy] as any)?.[formData.municipio]?.[formData.parroquia] || []).sort() : [], [formData.estado, formData.municipio, formData.parroquia])

  const filteredPlanes = useMemo(() => {
    const mappedType = formData.tipo_servicio === 'Corporativo' ? 'Empresarial' : formData.tipo_servicio;
    return allPlanes
      .filter(p => p.tipo === mappedType)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [allPlanes, formData.tipo_servicio]);

  const handleStateChange = (val: string) => setFormData(prev => ({ ...prev, estado: val, municipio: "", parroquia: "", sector: "" }))
  const handleMunicipioChange = (val: string) => setFormData(prev => ({ ...prev, municipio: val, parroquia: "", sector: "" }))
  const handleParroquiaChange = (val: string) => setFormData(prev => ({ ...prev, parroquia: val, sector: "" }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentAsesor) {
      toast.error("Debe seleccionar un Asesor en la pantalla de Inicio primero.")
      return
    }

    setLoading(true)
    const supabase = createClient()

    try {
      const payload = {
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        cedula: `${formData.cedula_prefix}${formData.cedula}`,
        genero: formData.genero,
        fecha_nacimiento: formData.fecha_nac,
        fecha_disponibilidad: formData.fecha_disponibilidad,
        telefono_principal: formData.telefono_principal,
        telefono_secundario: formData.telefono_secundario,
        correo: formData.correo,
        estado: formData.estado,
        municipio: formData.municipio,
        parroquia: formData.parroquia,
        sector: formData.sector,
        direccion: formData.direccion,
        tipo_servicio: formData.tipo_servicio,
        plan: formData.plan,
        promotor: currentAsesor,
        fecha_solicitud: new Date().toISOString().split('T')[0],
        fuente: formData.fuente,
        actividad_uid: formData.actividad_uid
      }

      // Omitir campos que no existen en la base de datos si es que fallan, pero los metemos
      const { error } = await supabase.from('solicitudes').insert([payload])

      if (error) throw error

      toast.success("Solicitud enviada exitosamente")

      // Link to Activity if selected
      if (formData.actividad_uid && formData.actividad_uid !== "none") {
        try {
          const stored = localStorage.getItem('appState_activities');
          if (stored) {
            const activities = JSON.parse(stored);
            const actIndex = activities.findIndex((a: any) => a.uid === formData.actividad_uid);
            if (actIndex >= 0) {
              const act = activities[actIndex];
              act.solicitudes = (parseInt(act.solicitudes) || 0) + 1;
              act.linkedClients = act.linkedClients || [];
              act.linkedClients.push({
                name: `${formData.nombres} ${formData.apellidos}`.trim(),
                ci: `${formData.cedula_prefix}${formData.cedula}`
              });
              localStorage.setItem('appState_activities', JSON.stringify(activities));
            }
          }
        } catch (e) {
          console.error("Error linking activity:", e);
        }
      }
      
      // Generate WhatsApp Link
      const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      };

      const dateSol = formatDate(payload.fecha_solicitud);
      const dateDisp = formatDate(payload.fecha_disponibilidad);

      let waMsg = `*Nueva Solicitud de Servicio*\n\n`;
      waMsg += `Fecha de solicitud: ${dateSol}\n`;
      waMsg += `Fecha de Disponibilidad: ${dateDisp}\n\n`;
      waMsg += `Nombres y Apellido: ${payload.nombres} ${payload.apellidos}\n`;
      waMsg += `Cédula/RIF: ${payload.cedula}\n`;
      waMsg += `Teléfono principal: ${payload.telefono_principal}\n`;
      if (payload.telefono_secundario) {
        waMsg += `Teléfono secundario: ${payload.telefono_secundario}\n`;
      }
      waMsg += `Ubicación: ${payload.estado}, ${payload.municipio}, ${payload.parroquia}, ${payload.sector}, ${payload.direccion}\n`;
      waMsg += `Tipo de Servicio: ${payload.plan} ${payload.tipo_servicio}\n`;
      waMsg += `Promotor/a: ${payload.promotor}\n`;
      waMsg += `Correo Electrónico: ${payload.correo}\n`;
      waMsg += `Fuente: ${payload.fuente}\n`;

      let actName = "";
      if (formData.actividad_uid && formData.actividad_uid !== "none") {
        const stored = localStorage.getItem('appState_activities');
        if (stored) {
           const activities = JSON.parse(stored);
           const act = activities.find((a: any) => a.uid === formData.actividad_uid);
           if (act) {
              actName = act.activityType; // e.g. "Recorrido (Solo)"
           }
        }
      }
      if (actName) {
        waMsg += `Actividad vinculada: ${actName}\n`;
      }
      
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(waMsg)}`
      window.open(whatsappUrl, '_blank')

      // Reset Form
      setFormData(prev => ({
        ...prev,
        nombres: "", apellidos: "", cedula: "", telefono_principal: "", telefono_secundario: "", correo: "",
        direccion: "", genero: "", fecha_nac: "", fecha_disponibilidad: new Date().toISOString().split('T')[0], plan: "", fuente: "", actividad_uid: ""
      }))
    } catch (error: any) {
      toast.error(`Error al enviar: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="shadow-lg border-zinc-200 dark:border-zinc-800">
      <CardHeader className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <CardTitle className="flex items-center gap-2 text-xl">
          <User className="h-5 w-5 text-blue-500" />
          Nueva Solicitud de Servicio
        </CardTitle>
        <CardDescription>
          Registro de un nuevo prospecto de servicio. Los campos con * son obligatorios.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos Personales */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <User className="h-4 w-4" /> Información del Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombres *</Label>
                <Input required value={formData.nombres} onChange={e => setFormData(p => ({ ...p, nombres: e.target.value }))} placeholder="Ej. Juan Perez" />
              </div>
              <div className="space-y-2">
                <Label>Apellidos *</Label>
                <Input required value={formData.apellidos} onChange={e => setFormData(p => ({ ...p, apellidos: e.target.value }))} placeholder="Ej. Rodriguez" />
              </div>
              
              <div className="space-y-2">
                <Label>Identificación *</Label>
                <div className="flex gap-2">
                  <Select value={formData.cedula_prefix} onValueChange={v => setFormData(p => ({ ...p, cedula_prefix: v }))}>
                    <SelectTrigger className="w-[80px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="V-">V-</SelectItem>
                      <SelectItem value="J-">J-</SelectItem>
                      <SelectItem value="E-">E-</SelectItem>
                      <SelectItem value="G-">G-</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input required className="flex-1" type="number" value={formData.cedula} onChange={e => setFormData(p => ({ ...p, cedula: e.target.value }))} placeholder="12345678" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Género *</Label>
                <Select required value={formData.genero} onValueChange={v => setFormData(p => ({ ...p, genero: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Femenino">Femenino</SelectItem>
                    <SelectItem value="Empresa">Empresa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>F. Nacimiento *</Label>
                <Input required type="date" value={formData.fecha_nac} onChange={e => setFormData(p => ({ ...p, fecha_nac: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>F. Disponibilidad *</Label>
                <Input required type="date" value={formData.fecha_disponibilidad} onChange={e => setFormData(p => ({ ...p, fecha_disponibilidad: e.target.value }))} />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 my-6"></div>

          {/* Ubicación */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="h-4 w-4" /> Ubicación del Servicio
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select required value={formData.estado} onValueChange={handleStateChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {estados.map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Municipio *</Label>
                <Select required disabled={!formData.estado} value={formData.municipio} onValueChange={handleMunicipioChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {municipios.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Parroquia *</Label>
                <Select required disabled={!formData.municipio} value={formData.parroquia} onValueChange={handleParroquiaChange}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {parroquias.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sector *</Label>
                <Select required disabled={!formData.parroquia} value={formData.sector} onValueChange={v => setFormData(p => ({ ...p, sector: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {sectores.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Dirección Exacta *</Label>
                <Input required value={formData.direccion} onChange={e => setFormData(p => ({ ...p, direccion: e.target.value }))} placeholder="Avenida, Calle, Casa/Apto, Punto de referencia..." />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 my-6"></div>

          {/* Servicio y Contacto */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Package className="h-4 w-4" /> Servicio y Contacto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="space-y-2">
                <Label>Tipo de Servicio *</Label>
                <Select required value={formData.tipo_servicio} onValueChange={v => setFormData(p => ({ ...p, tipo_servicio: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Domiciliario">Domiciliario</SelectItem>
                    <SelectItem value="Corporativo">Corporativo</SelectItem>
                    <SelectItem value="Dedicado">Dedicado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Plan a Contratar *</Label>
                <Select required value={formData.plan} onValueChange={v => setFormData(p => ({ ...p, plan: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {filteredPlanes.map((p, idx) => {
                      const displayName = p.has_tv ? `${p.nombre} + ${tvLabel}` : p.nombre;
                      return <SelectItem key={`plan-${idx}`} value={displayName}>{displayName}</SelectItem>
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Teléfono Principal *</Label>
                <Input required type="tel" value={formData.telefono_principal} onChange={e => setFormData(p => ({ ...p, telefono_principal: e.target.value }))} placeholder="04141234567" />
              </div>
              <div className="space-y-2">
                <Label>Teléfono Secundario</Label>
                <Input type="tel" value={formData.telefono_secundario} onChange={e => setFormData(p => ({ ...p, telefono_secundario: e.target.value }))} placeholder="Opcional" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Correo Electrónico *</Label>
                <Input required type="email" value={formData.correo} onChange={e => setFormData(p => ({ ...p, correo: e.target.value }))} placeholder="ejemplo@correo.com" />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 my-6"></div>

          {/* Cierre de Venta */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <CheckCircle className="h-4 w-4" /> Cierre de Venta
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fuente de la Venta *</Label>
                <Select required value={formData.fuente} onValueChange={v => setFormData(p => ({ ...p, fuente: v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Actividad del Día">Actividad del Día</SelectItem>
                    <SelectItem value="Llamada Telefónica">Llamada Telefónica</SelectItem>
                    <SelectItem value="Mensajería (WhatsApp)">Mensajería (WhatsApp)</SelectItem>
                    <SelectItem value="Instagram / Redes">Instagram / Redes</SelectItem>
                    <SelectItem value="Referido / Recomendación">Referido / Recomendación</SelectItem>
                    <SelectItem value="Volante">Volante</SelectItem>
                    <SelectItem value="Stand Publicitario">Stand Publicitario</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Vincular a Actividad</Label>
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">Opcional</span>
                </div>
                <Select value={formData.actividad_uid} onValueChange={v => setFormData(p => ({ ...p, actividad_uid: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sin vincular..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin vincular...</SelectItem>
                    {pendingActivities.map((act, idx) => (
                      <SelectItem key={idx} value={act.uid || `act_${idx}`}>
                        {act.activityType} ({act.time}) - {act.ubicaciones?.sector || act.ubicaciones?.parroquia || "Sin ubicación"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button disabled={loading} type="submit" className="w-full h-12 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 font-semibold text-base rounded-xl transition-all shadow-sm">
              {loading ? (
                <span className="flex items-center gap-2">Procesando...</span>
              ) : (
                <span className="flex items-center gap-2"><Send className="h-5 w-5" /> Guardar y Enviar a WhatsApp</span>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
