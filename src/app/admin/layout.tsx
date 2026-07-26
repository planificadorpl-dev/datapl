"use client"

import React, { useState, useEffect } from "react"
import { useAsesor } from "@/components/providers/asesor-provider"
import { Lock, ArrowRight, ShieldCheck } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PremiumPageLayout } from "@/components/ui/premium-page-layout"

const ADMIN_PIN = "2080"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const { isAdminAuthenticated, setIsAdminAuthenticated } = useAsesor()
    const [pin, setPin] = useState("")
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null // Prevent hydration mismatch

    if (isAdminAuthenticated) {
        return <>{children}</>
    }

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault()
        if (pin === ADMIN_PIN) {
            setIsAdminAuthenticated(true)
            toast.success("Acceso concedido")
        } else {
            toast.error("PIN incorrecto")
            setPin("")
        }
    }

    return (
        <PremiumPageLayout
            title="Acceso Restringido"
            description="Área exclusiva para administradores del sistema."
        >
            <div className="max-w-md mx-auto mt-12 bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 p-8 shadow-sm">
                <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Lock size={32} />
                </div>
                
                <h2 className="text-2xl font-black text-center text-zinc-900 dark:text-zinc-100 mb-2">
                    Panel Administrador
                </h2>
                <p className="text-center text-zinc-500 mb-8">
                    Por favor, ingrese el PIN de seguridad para acceder a la configuración global.
                </p>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <Input 
                            type="password" 
                            inputMode="numeric"
                            placeholder="Ingrese el PIN" 
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            className="text-center text-2xl tracking-widest h-14 bg-transparent border border-zinc-200 dark:border-zinc-800 focus-visible:ring-2 focus-visible:ring-red-500/50"
                            autoFocus
                        />
                    </div>
                    <Button type="submit" className="w-full h-14 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 text-base font-bold shadow-sm flex items-center gap-2">
                        Desbloquear <ArrowRight className="h-5 w-5" />
                    </Button>
                </form>

                <div className="mt-8 flex items-center justify-center gap-2 text-xs text-zinc-400">
                    <ShieldCheck size={14} />
                    <span>Conexión Segura</span>
                </div>
            </div>
        </PremiumPageLayout>
    )
}
