"use client"

import { PremiumPageLayout } from "@/components/ui/premium-page-layout"
import { UserCog, MapPin, Tv, ChevronRight } from "lucide-react"
import Link from "next/link"

const adminSections = [
    {
        name: "Gestión de Asesores",
        description: "Añadir, editar o remover asesores de ventas del sistema.",
        href: "#", // Add routes if you build them later, or embed them here
        icon: UserCog,
        colorClass: "text-blue-600",
        bgClass: "bg-blue-50 dark:bg-blue-900/20",
        iconColorClass: "text-blue-600 dark:text-blue-400"
    },
    {
        name: "Gestión de Localidades",
        description: "Configurar estados, municipios, parroquias y sectores para Ventas.",
        href: "/admin/geodata",
        icon: MapPin,
        colorClass: "text-emerald-600",
        bgClass: "bg-emerald-50 dark:bg-emerald-900/20",
        iconColorClass: "text-emerald-600 dark:text-emerald-400"
    },
    {
        name: "Gestión de Planes",
        description: "Administrar los planes de servicio de internet y TV disponibles.",
        href: "/admin/planes",
        icon: Tv,
        colorClass: "text-violet-600",
        bgClass: "bg-violet-50 dark:bg-violet-900/20",
        iconColorClass: "text-violet-600 dark:text-violet-400"
    }
]

export default function AdminDashboard() {
    return (
        <PremiumPageLayout
            title="Panel de Administración"
            description="Configuración global del sistema y accesos."
        >
            <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {adminSections.map((s) => (
                    <Link key={s.name} href={s.href} className="group block text-left h-full bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden">
                        <div className={`absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-[0.06] transition-opacity transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 ${s.colorClass}`}>
                            <s.icon size={96} strokeWidth={1} />
                        </div>
                        <div className="flex flex-col h-full justify-between relative z-10">
                            <div className={`w-14 h-14 rounded-xl ${s.bgClass} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                <s.icon size={28} className={s.iconColorClass} />
                            </div>
                            <div>
                                <h2 className="font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-2">{s.name}</h2>
                                <p className="text-sm text-zinc-500 mb-6">{s.description}</p>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-500 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
                                <span>Configurar</span>
                                <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </PremiumPageLayout>
    )
}
