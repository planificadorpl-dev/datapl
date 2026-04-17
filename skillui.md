# Minimalist iOS Premium UI Skill (`skillui`)

Este documento define el estándar visual y estructural para el desarrollo de interfaces en el proyecto. Todas las nuevas vistas, formularios y componentes deben seguir estrictamente estas reglas.

## 🎨 Fundamentos Visuales

### Paleta de Colores
- **Fondo General**: `#F2F2F7` (Gris claro iOS).
- **Acento / Acción**: `#007AFF` (Azul iOS).
- **Texto Principal**: `#1C1C1E` (Negro suave).
- **Texto Secundario / Labels**: `#8E8E93` (Gris medio).
- **Bordes / Divisores**: `#E5E5EA` con opacidad variable.

### Tipografía & Bordes
- **Borde de Contenedores**: `rounded-[20px]`.
- **Borde de Botones**: `rounded-[18px]`.
- **Títulos de Sección**: Mayúsculas, `text-[12px]`, `font-bold`, `tracking-wider`.
- **Peso de Fuente "Black"**: Usar para títulos principales y botones primarios para el look "Premium".

---

## 🧱 Biblioteca de Componentes

### 1. El Cabecero (`ios-header`)
Debe ser pegajoso (`sticky`) y usar glassmorphism.
```html
<header class="ios-header">
  <div class="max-w-md mx-auto flex items-center justify-between">
    <button class="text-[#007AFF] font-medium text-[17px]">Cerrar</button>
    <h2 class="text-[17px] font-black text-black">Título Vista</h2>
    <div class="w-[50px]"></div> <!-- Espaciador para centrar -->
  </div>
</header>
```

### 2. Lista Agrupada (`ios-group`)
Es el contenedor base para campos y contenido.
- **Clase**: `ios-group` (aplica bg-white, redondeado y divisores automáticos entre hijos).
```html
<p class="ios-label uppercase">Título de Sección</p>
<div class="ios-group">
  <div class="ios-item"> ... Contenido 1 ... </div>
  <div class="ios-item"> ... Contenido 2 ... </div>
</div>
```

### 3. Ítem de Fila (`ios-item`)
- **Padding**: `px-4 py-3`.
- **Estructura**: `flex flex-col`.
```html
<div class="ios-item">
  <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Etiqueta</label>
  <input type="text" class="ios-input" placeholder="...">
</div>
```

### 4. Botones
- **Primario**: `btn-ios-primary` (Azul, Font-Black).
- **Secundario**: `btn-ios-secondary` (Blanco con borde azul).
- **Gris / Auxiliar**: `btn-ios-gray` (Fondo gris claro).

---

## 📱 Patrones Avanzados

### Segmented Control (Tabs)
Para alternar entre sub-vistas dentro de un módulo.
```html
<div class="flex bg-[#E3E3E8] p-0.5 rounded-lg mb-3 mx-2 relative h-8 select-none">
  <!-- Indicador animado (solToggleIndicator) se desplaza con JS -->
  <div class="absolute h-[28px] top-0.5 bg-white rounded-md shadow-sm transition-all duration-300 left-[2px] w-[calc(50%-2px)]"></div>
  <button class="flex-1 z-10 text-[13px] font-bold text-black">Pestaña 1</button>
  <button class="flex-1 z-10 text-[13px] font-bold text-[#8E8E93]">Pestaña 2</button>
</div>
```

### Tarjetas de Historial
Para listas de registros pasados.
- Fondo de cabecera de tarjeta: `bg-gray-50/30`.
- Título: `text-[18px] font-black`.
- Acciones: Botones compactos al pie de la tarjeta dentro de la `ios-group`.

---

## 🛠️ Reglas de Oro
1. **Sin Bordes Manuales**: Usa el selector automático `.ios-group > *:not(:last-child)` definido en el CSS.
2. **Espaciado Constante**: Siempre usa `mt-8` para `ios-label` si no es la primera del módulo.
3. **Micro-interacciones**: Usa `active:scale-[0.98]` en botones y elementos clicables.
4. **Simplificación**: En mensajes (como WhatsApp), agrupa datos bajo una sola etiqueta `Ubicación:` en lugar de detallar cada campo técnico.
