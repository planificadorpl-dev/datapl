"use client";

import { PremiumPageLayout } from "@/components/ui/premium-page-layout";
import { useAsesor } from "@/components/providers/asesor-provider";
import { 
  Briefcase, 
  FileText, 
  TrendingUp, 
  ChevronDown, 
  Check 
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DEFAULT_ASESORES = [
  "Eduardo Gonzalez", "Ricardo Padrino", "Andres Gonzalez", "Julio Mejia", 
  "Jeferson Oropeza", "David Aranguren", "Miguel Fuenmayor", "Jesus Monrroy", 
  "Maria Jimenez", "Genesis Blanco"
];

export default function Home() {
  const { currentAsesor, setCurrentAsesor } = useAsesor();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <PremiumPageLayout 
      title="Inicio" 
      description="Gestión de actividades comerciales y solicitudes de servicio."
      showBack={false}
    >
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Selector de Asesor */}
        <div className="p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm">
          <label className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">
            Sesión Actual: ¿Quién está reportando?
          </label>
          <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
              <button className="w-full h-12 mt-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 flex justify-between items-center transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                <span className={`text-sm ${currentAsesor ? 'font-bold text-zinc-900 dark:text-zinc-100' : 'text-zinc-500'}`}>
                  {currentAsesor || 'Seleccione el Asesor...'}
                </span>
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] max-h-[300px] overflow-y-auto">
              {DEFAULT_ASESORES.map((a) => (
                <DropdownMenuItem 
                  key={a} 
                  onSelect={() => setCurrentAsesor(a)}
                  className="flex justify-between items-center cursor-pointer py-3"
                >
                  <span className={currentAsesor === a ? 'font-bold text-blue-600' : ''}>
                    {a}
                  </span>
                  {currentAsesor === a && <Check className="h-4 w-4 text-blue-600" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Actividades */}
          <Link href="/actividades" className={`group block text-left h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden ${!currentAsesor ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-[0.06] transition-opacity transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 text-blue-600">
               <Briefcase size={96} strokeWidth={1} />
             </div>
             <div className="flex flex-col h-full justify-between relative z-10">
               <div className="w-14 h-14 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <Briefcase size={28} />
               </div>
               <div>
                 <h2 className="font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-2">Actividades</h2>
                 <p className="text-sm text-zinc-500 mb-6">Reporte diario de visitas, recorridos y captación de clientes.</p>
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                 <span>Entrar</span>
                 <ChevronDown className="h-4 w-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
               </div>
             </div>
          </Link>

          {/* Card 2: Solicitudes */}
          <Link href="/solicitudes" className={`group block text-left h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden ${!currentAsesor ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-[0.06] transition-opacity transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 text-violet-600">
               <FileText size={96} strokeWidth={1} />
             </div>
             <div className="flex flex-col h-full justify-between relative z-10">
               <div className="w-14 h-14 rounded-xl bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <FileText size={28} />
               </div>
               <div>
                 <h2 className="font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-2">Solicitudes</h2>
                 <p className="text-sm text-zinc-500 mb-6">Registro de prospectos y ventas de servicios de fibra.</p>
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                 <span>Entrar</span>
                 <ChevronDown className="h-4 w-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
               </div>
             </div>
          </Link>

          {/* Card 3: Estudio de Mercado */}
          <Link href="/ventas/competencia" className={`group block text-left h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden ${!currentAsesor ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}`}>
             <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-[0.06] transition-opacity transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 text-emerald-600">
               <TrendingUp size={96} strokeWidth={1} />
             </div>
             <div className="flex flex-col h-full justify-between relative z-10">
               <div className="w-14 h-14 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                 <TrendingUp size={28} />
               </div>
               <div>
                 <h2 className="font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-2">Estudio de Mercado</h2>
                 <p className="text-sm text-zinc-500 mb-6">Consulta y reporte de ofertas y planes de la competencia en campo.</p>
               </div>
               <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                 <span>Entrar</span>
                 <ChevronDown className="h-4 w-4 -rotate-90 group-hover:translate-x-1 transition-transform" />
               </div>
             </div>
          </Link>

        </div>
      </div>
    </PremiumPageLayout>
  );
}
