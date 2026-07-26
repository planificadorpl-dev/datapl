"use client"

import { useState, useEffect } from "react"
import { PremiumPageLayout } from "@/components/ui/premium-page-layout"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Pencil, Trash2, Save, X, UserCog, Users } from "lucide-react"
import { getAsesores, addAsesor, updateAsesor, deleteAsesor } from "@/app/actions/asesores"

export default function AsesoresAdmin() {
  const { toast } = useToast()
  const [asesores, setAsesores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // New asesor form
  const [showForm, setShowForm] = useState(false)
  const [formNombre, setFormNombre] = useState("")
  const [formActivo, setFormActivo] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit state
  const [editId, setEditId] = useState<string | null>(null)
  const [editNombre, setEditNombre] = useState("")
  const [editActivo, setEditActivo] = useState(true)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const data = await getAsesores()
      setAsesores(data)
    } catch (e) {
      console.error(e)
      toast({ title: "Error", description: "No se pudieron cargar los asesores", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  async function handleAdd() {
    if (!formNombre.trim()) return
    setSaving(true)
    try {
      await addAsesor({ nombre: formNombre.trim(), activo: formActivo })
      toast({ title: "Asesor creado" })
      setFormNombre("")
      setFormActivo(true)
      setShowForm(false)
      await loadData()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(id: string) {
    try {
      await updateAsesor(id, { nombre: editNombre.trim(), activo: editActivo })
      toast({ title: "Asesor actualizado" })
      setEditId(null)
      await loadData()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este asesor?")) return
    try {
      await deleteAsesor(id)
      toast({ title: "Asesor eliminado" })
      await loadData()
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" })
    }
  }

  function startEdit(a: any) {
    setEditId(a.id)
    setEditNombre(a.nombre)
    setEditActivo(a.activo)
  }

  const activos = asesores.filter(a => a.activo)
  const inactivos = asesores.filter(a => !a.activo)

  if (loading) return (
    <PremiumPageLayout title="Gestión de Asesores" description="Cargando...">
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    </PremiumPageLayout>
  )

  return (
    <PremiumPageLayout title="Gestión de Asesores" description="Administra los asesores comerciales del sistema.">
      <div className="space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30">
            <p className="text-[11px] font-bold text-blue-500 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{asesores.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
            <p className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">Activos</p>
            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{activos.length}</p>
          </div>
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800">
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">Inactivos</p>
            <p className="text-2xl font-black text-zinc-500">{inactivos.length}</p>
          </div>
        </div>

        {/* Add asesor */}
        <div className="flex justify-end">
          <Button onClick={() => setShowForm(!showForm)} variant={showForm ? "outline" : "default"} className="rounded-lg">
            {showForm ? <><X size={16} className="mr-2" /> Cancelar</> : <><Plus size={16} className="mr-2" /> Nuevo Asesor</>}
          </Button>
        </div>

        {showForm && (
          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-zinc-500">Nuevo Asesor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs mb-1 block">Nombre Completo</Label>
                <Input
                  value={formNombre}
                  onChange={(e) => setFormNombre(e.target.value)}
                  placeholder="Ej: María González"
                  className="h-11 rounded-lg"
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={formActivo} onCheckedChange={setFormActivo} />
                <Label className="text-sm">Activo</Label>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAdd} disabled={saving || !formNombre.trim()} className="rounded-lg">
                  <Save size={16} className="mr-2" />
                  {saving ? "Guardando..." : "Crear Asesor"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Asesores Activos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-500">
              <Users size={16} /> Asesores Activos ({activos.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No hay asesores activos.</p>
            ) : (
              <div className="space-y-2">
                {activos.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-zinc-50/50 dark:bg-zinc-900/40">
                    {editId === a.id ? (
                      <div className="flex-1 space-y-3">
                        <Input
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="h-10 rounded-lg"
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate(a.id)}
                        />
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch checked={editActivo} onCheckedChange={setEditActivo} />
                            <span className="text-sm">Activo</span>
                          </div>
                          <div className="flex gap-2 ml-auto">
                            <Button size="sm" onClick={() => handleUpdate(a.id)} className="rounded-lg">
                              <Save size={14} className="mr-1" /> Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="rounded-lg">
                              <X size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {a.nombre?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-sm">{a.nombre}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => startEdit(a)}>
                            <Pencil size={14} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleDelete(a.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Asesores Inactivos */}
        {inactivos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider text-zinc-400">
                <UserCog size={16} /> Inactivos ({inactivos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {inactivos.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-zinc-50/50 dark:bg-zinc-900/40 opacity-60">
                    {editId === a.id ? (
                      <div className="flex-1 space-y-3">
                        <Input
                          value={editNombre}
                          onChange={(e) => setEditNombre(e.target.value)}
                          className="h-10 rounded-lg"
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate(a.id)}
                        />
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <Switch checked={editActivo} onCheckedChange={setEditActivo} />
                            <span className="text-sm">Activo</span>
                          </div>
                          <div className="flex gap-2 ml-auto">
                            <Button size="sm" onClick={() => handleUpdate(a.id)} className="rounded-lg">
                              <Save size={14} className="mr-1" /> Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditId(null)} className="rounded-lg">
                              <X size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-zinc-400">
                            {a.nombre?.charAt(0)?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm">{a.nombre}</span>
                            <Badge variant="outline" className="text-[11px] text-zinc-400">Inactivo</Badge>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={() => startEdit(a)}>
                            <Pencil size={14} />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20" onClick={() => handleDelete(a.id)}>
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      </div>
    </PremiumPageLayout>
  )
}
