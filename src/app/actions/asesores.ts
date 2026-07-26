"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ── Asesores CRUD ──────────────────────────────────────────────

export async function getAsesores(soloActivos = false) {
  const supabase = await createClient();
  let query = supabase
    .from("asesores_config")
    .select("*")
    .order("nombre");

  if (soloActivos) {
    query = query.eq("activo", true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

export async function addAsesor(asesor: { nombre: string; activo?: boolean }) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("asesores_config")
    .insert([{ nombre: asesor.nombre.trim(), activo: asesor.activo ?? true }]);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/asesores");
  revalidatePath("/");
}

export async function updateAsesor(id: string, updates: { nombre?: string; activo?: boolean }) {
  const supabase = await createClient();
  const payload: any = {};
  if (updates.nombre !== undefined) payload.nombre = updates.nombre.trim();
  if (updates.activo !== undefined) payload.activo = updates.activo;

  const { error } = await supabase
    .from("asesores_config")
    .update(payload)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/asesores");
  revalidatePath("/");
}

export async function deleteAsesor(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("asesores_config")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/asesores");
  revalidatePath("/");
}
