export function renderAdminPanel(appState) {
  // 1. ASESORES LIST
  const asesoresList = appState.asesores.map((a, i) => `
    <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-[#E5E5EA] mb-2 shadow-sm group hover:border-[#007AFF]/30 transition-all ${a.activo === false ? 'opacity-50' : ''}">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-[#F2F2F7] rounded-full flex items-center justify-center text-[#007AFF] font-bold text-xs">
          ${a.nombre.charAt(0)}
        </div>
        <span class="font-medium ${a.activo === false ? 'text-gray-400 line-through' : 'text-black'} text-sm">${a.nombre}</span>
      </div>
      <div class="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <button class="btn-toggle-asesor relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#34C759] focus:ring-offset-2 ${a.activo === false ? 'bg-[#E5E5EA]' : 'bg-[#34C759]'}" data-index="${i}" title="Toggle Activo">
          <span class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${a.activo === false ? 'translate-x-0' : 'translate-x-5'}"></span>
        </button>
        <button class="btn-delete-asesor text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all" data-index="${i}">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');

  // 2. PLANES LISTS
  const planesDomList = (appState.planes || [])
    .filter(p => p.tipo === 'Domiciliario')
    .map(p => `
      <div class="flex items-center justify-between p-2.5 hover:bg-white rounded-xl transition-all group border border-transparent hover:border-[#E5E5EA] hover:shadow-sm">
        <div class="flex flex-col">
          <span class="text-sm font-semibold ${p.activo === false ? 'text-gray-400 line-through' : 'text-black'}">${p.nombre}</span>
          <span class="text-[10px] text-[#8E8E93] font-medium tracking-tight">${p.has_tv ? '⚡ DUAL (TV + INTERNET)' : '🌐 SOLO INTERNET'}</span>
        </div>
        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="btn-toggle-plan-tv p-1.5 hover:bg-blue-50 rounded-md ${p.has_tv ? 'text-[#007AFF]' : 'text-gray-300'}" data-id="${p.id}" title="Alternar TV">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </button>
          <button class="btn-toggle-plan-active relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${p.activo === false ? 'bg-[#E5E5EA]' : 'bg-[#34C759]'}" data-id="${p.id}" title="Toggle Activo">
            <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${p.activo === false ? 'translate-x-0' : 'translate-x-4'}"></span>
          </button>
          <button class="btn-delete-plan p-1.5 hover:bg-red-50 rounded-md text-[#FF3B30]" data-id="${p.id}">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    `).join('');

  const planesEmpList = (appState.planes || [])
    .filter(p => p.tipo === 'Empresarial')
    .map(p => `
      <div class="flex items-center justify-between p-2.5 hover:bg-white rounded-xl transition-all group border border-transparent hover:border-[#E5E5EA] hover:shadow-sm">
        <div class="flex flex-col">
          <span class="text-sm font-semibold ${p.activo === false ? 'text-gray-400 line-through' : 'text-black'}">${p.nombre}</span>
          <span class="text-[10px] text-[#8E8E93] font-medium tracking-tight">🏢 EMPRESARIAL - DEDICADO</span>
        </div>
        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="btn-toggle-plan-active relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${p.activo === false ? 'bg-[#E5E5EA]' : 'bg-[#34C759]'}" data-id="${p.id}" title="Toggle Activo">
            <span class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${p.activo === false ? 'translate-x-0' : 'translate-x-4'}"></span>
          </button>
          <button class="btn-delete-plan p-1.5 hover:bg-red-50 rounded-md text-[#FF3B30]" data-id="${p.id}">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    `).join('');


  // 3. ZONAS (GRID VIEW - OPPL2026 STYLE)
  const geoAdmin = appState.geoAdmin || { level: 0, selection: { estado: '', municipio: '', parroquia: '' }, newItem: '' };
  const geo = appState.geoHierarchy || {};
  
  let currentItems = [];
  if (geoAdmin.level === 0) currentItems = Object.keys(geo).sort();
  else if (geoAdmin.level === 1) currentItems = Object.keys(geo[geoAdmin.selection.estado] || {}).sort();
  else if (geoAdmin.level === 2) currentItems = Object.keys(geo[geoAdmin.selection.estado]?.[geoAdmin.selection.municipio] || {}).sort();
  else if (geoAdmin.level === 3) currentItems = (geo[geoAdmin.selection.estado]?.[geoAdmin.selection.municipio]?.[geoAdmin.selection.parroquia] || []).sort();

  const getLevelName = (l) => ["Estados", "Municipios", "Parroquias", "Sectores"][l];
  const levelName = getLevelName(geoAdmin.level);
  
  let addLocationText = "Ventas";
  if (geoAdmin.level > 0) addLocationText = geoAdmin.selection.parroquia || geoAdmin.selection.municipio || geoAdmin.selection.estado;

  // Breadcrumbs
  let breadcrumbsHtml = `
    <div class="flex items-center gap-2 text-sm text-[#8E8E93] overflow-x-auto pb-2 mb-6">
       <button class="btn-geo-nav shrink-0 hover:text-black transition-colors ${geoAdmin.level === 0 ? 'text-black font-bold' : ''}" data-level="0">Ventas</button>
  `;
  if (geoAdmin.level >= 1) breadcrumbsHtml += `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg><button class="btn-geo-nav shrink-0 hover:text-black transition-colors ${geoAdmin.level === 1 ? 'text-black font-bold' : ''}" data-level="1">${geoAdmin.selection.estado}</button>`;
  if (geoAdmin.level >= 2) breadcrumbsHtml += `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg><button class="btn-geo-nav shrink-0 hover:text-black transition-colors ${geoAdmin.level === 2 ? 'text-black font-bold' : ''}" data-level="2">${geoAdmin.selection.municipio}</button>`;
  if (geoAdmin.level >= 3) breadcrumbsHtml += `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg><button class="btn-geo-nav shrink-0 hover:text-black transition-colors ${geoAdmin.level === 3 ? 'text-black font-bold' : ''}" data-level="3">${geoAdmin.selection.parroquia}</button>`;
  breadcrumbsHtml += `</div>`;

  // Grid Items
  let gridHtml = '';
  if (currentItems.length === 0) {
     gridHtml = `
       <div class="h-64 flex flex-col items-center justify-center bg-white/50 rounded-3xl border-2 border-dashed border-[#E5E5EA] p-8 text-center">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-10 w-10 text-[#C6C6C8] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
           <p class="text-sm text-[#8E8E93]">No hay ${levelName.toLowerCase()} registrados aquí.</p>
       </div>
     `;
  } else {
     gridHtml = `<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">`;
     currentItems.forEach(item => {
        gridHtml += `
          <div class="group relative flex items-center justify-between p-4 bg-white border border-[#E5E5EA] shadow-sm rounded-2xl hover:border-[#007AFF]/50 transition-all cursor-pointer overflow-hidden btn-geo-card" data-item="${item}">
             <div class="flex items-center gap-3">
                 <div class="w-10 h-10 rounded-xl bg-[#F2F2F7] flex items-center justify-center text-[#8E8E93] group-hover:text-[#007AFF] group-hover:bg-[#007AFF]/10 transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                 </div>
                 <div class="flex flex-col">
                     <span class="font-bold text-black text-[15px] truncate max-w-[150px]">${item}</span>
                 </div>
             </div>
             <div class="flex items-center gap-2">
                 <button class="btn-geo-delete opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all z-10" data-item="${item}" title="Eliminar">
                     <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                 </button>
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#C6C6C8] group-hover:text-[#007AFF] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
             </div>
          </div>
        `;
     });
     gridHtml += `</div>`;
  }


  return `
    <div class="px-6 py-10 pb-20 bg-[#F2F2F7] min-h-screen">
      <header class="flex items-center mb-8 border-b border-[#E5E5EA] pb-4 backdrop-blur-md sticky top-0 bg-[#F2F2F7]/80 z-20 -mx-6 px-6">
        <button id="btnAdminBack" class="mr-4 text-[#007AFF] hover:bg-white/50 p-2.5 rounded-full transition-all active:scale-90">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
           </svg>
        </button>
        <div>
          <h1 class="text-2xl font-black tracking-tighter text-black uppercase">Admin Panel</h1>
          <div class="flex items-center gap-2">
            <span class="w-1.5 h-1.5 bg-[#34C759] rounded-full animate-pulse"></span>
            <p class="text-[10px] uppercase font-bold text-[#8E8E93] tracking-widest">Sincronización Activa</p>
          </div>
        </div>
      </header>

      <!-- NAVIGATION PILLS -->
      <nav class="flex gap-2 mb-8 overflow-x-auto pb-4 custom-scrollbar no-scrollbar">
         <a href="#sec-asesores" class="px-5 py-2.5 bg-white rounded-2xl text-[11px] font-black text-black border border-[#E5E5EA] shadow-sm whitespace-nowrap active:bg-[#F2F2F7] transition-all">ASESORES</a>
         <a href="#sec-planes" class="px-5 py-2.5 bg-white rounded-2xl text-[11px] font-black text-black border border-[#E5E5EA] shadow-sm whitespace-nowrap active:bg-[#F2F2F7] transition-all">PLANES COMERCIALES</a>
         <a href="#sec-zonas" class="px-5 py-2.5 bg-white rounded-2xl text-[11px] font-black text-black border border-[#E5E5EA] shadow-sm whitespace-nowrap active:bg-[#F2F2F7] transition-all">COBERTURA GEO</a>
      </nav>

      <!-- SECCIÓN ASESORES -->
      <section id="sec-asesores" class="mb-14 scroll-mt-32">
        <div class="flex justify-between items-end mb-4 px-1">
          <div>
            <h2 class="text-[10px] font-black text-[#8E8E93] uppercase tracking-[0.3em] mb-1">Equipo Humano</h2>
            <h3 class="text-2xl font-black text-black tracking-tighter uppercase">Asesores</h3>
          </div>
        </div>
        <div class="bg-white/50 rounded-3xl p-1 border border-[#E5E5EA] mb-6">
           <div class="p-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-3">
             ${asesoresList.length > 0 ? asesoresList : '<p class="text-sm text-gray-400 italic p-4 text-center">No hay asesores registrados.</p>'}
           </div>
        </div>
        <div class="bg-white rounded-3xl p-4 border border-[#007AFF]/10 shadow-sm flex gap-3">
           <input type="text" id="inputNewAsesor" class="ios-input flex-1 !bg-[#F2F2F7] focus:bg-white !py-4" placeholder="Nombre completo del asesor">
           <button id="btnAddAsesor" class="bg-[#007AFF] text-white px-8 rounded-2xl font-black text-xs active:scale-95 transition-all shadow-md shadow-[#007AFF]/20">AÑADIR</button>
        </div>
      </section>

      <!-- SECCIÓN PLANES -->
      <section id="sec-planes" class="mb-14 scroll-mt-32">
        <div class="flex justify-between items-end mb-4 px-1">
          <div>
            <h2 class="text-[10px] font-black text-[#8E8E93] uppercase tracking-[0.3em] mb-1">Servicios</h2>
            <h3 class="text-2xl font-black text-black tracking-tighter uppercase">Oferta Comercial</h3>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white/70 backdrop-blur-sm p-5 rounded-[2.5rem] border border-[#007AFF]/10 shadow-sm">
            <h3 class="text-[11px] font-black text-[#007AFF] uppercase tracking-[0.15em] mb-5 flex items-center gap-2">
               <span class="w-1.5 h-1.5 bg-[#007AFF] rounded-full"></span> RESIDENCIALES
            </h3>
            <div class="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
               ${planesDomList || '<p class="text-xs text-gray-400 italic p-2">Sin planes residenciales.</p>'}
            </div>
          </div>
          <div class="bg-white/70 backdrop-blur-sm p-5 rounded-[2.5rem] border border-[#5856D6]/10 shadow-sm">
            <h3 class="text-[11px] font-black text-[#5856D6] uppercase tracking-[0.15em] mb-5 flex items-center gap-2">
               <span class="w-1.5 h-1.5 bg-[#5856D6] rounded-full"></span> CORPORATIVOS
            </h3>
            <div class="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
               ${planesEmpList || '<p class="text-xs text-gray-400 italic p-2">Sin planes corporativos.</p>'}
            </div>
          </div>
        </div>

        <div class="bg-black text-white p-6 rounded-[2.5rem] shadow-2xl space-y-5">
          <div class="flex items-center gap-4 mb-2">
             <div class="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-white">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 6v12m6-6H6" /></svg>
             </div>
             <div>
               <p class="text-xl font-black tracking-tighter uppercase">Crear Nuevo Plan</p>
               <p class="text-[10px] text-white/40 font-bold tracking-widest uppercase">Añade servicios a la cartera</p>
             </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" id="pNombre" class="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder-white/20 focus:bg-white/10 focus:outline-none transition-all text-sm font-bold" placeholder="Nombre (ej: 400MB)">
            <select id="pTipo" class="w-full bg-white/5 border border-white/5 rounded-2xl px-5 py-4 text-white focus:bg-white/10 focus:outline-none transition-all appearance-none text-sm font-bold">
              <option value="Domiciliario" class="text-black">Domiciliario</option>
              <option value="Empresarial" class="text-black">Empresarial</option>
            </select>
          </div>
          <div class="flex items-center justify-between pt-2">
            <label class="flex items-center space-x-4 cursor-pointer group">
              <div class="relative">
                <input type="checkbox" id="pHasTV" class="peer sr-only">
                <div class="w-12 h-7 bg-white/5 rounded-full peer-checked:bg-[#34C759] transition-all border border-white/5"></div>
                <div class="absolute left-1.5 top-1.5 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-5 shadow-lg"></div>
              </div>
              <span class="text-xs font-black text-white/60 group-hover:text-white transition-colors tracking-widest">INCLUYE TELEVISIÓN</span>
            </label>
            <button id="btnAddPlan" class="bg-white text-black px-10 py-4 rounded-2xl font-black text-xs hover:bg-[#F2F2F7] active:scale-95 transition-all shadow-xl shadow-white/5">GUARDAR PLAN</button>
          </div>
        </div>
      </section>

      <!-- SECCIÓN ZONAS (GRID VIEW) -->
      <section id="sec-zonas" class="scroll-mt-32">
        <div class="flex justify-between items-end mb-4 px-1">
          <div>
            <h2 class="text-[10px] font-black text-[#8E8E93] uppercase tracking-[0.3em] mb-1">Estructura Geo</h2>
            <h3 class="text-2xl font-black text-black tracking-tighter uppercase">Gestión de Localidades</h3>
          </div>
        </div>
        
        ${breadcrumbsHtml}
        
        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
           <!-- Sidebar -->
           <div class="lg:col-span-1 space-y-6">
              <div class="bg-white rounded-3xl p-5 border border-[#E5E5EA] shadow-sm">
                 <h4 class="text-xs font-bold uppercase tracking-wider text-[#8E8E93] mb-4">Añadir en ${addLocationText}</h4>
                 <div class="space-y-2 mb-4">
                    <label class="text-[10px] uppercase text-[#C6C6C8] font-bold">Nuevo ${levelName.slice(0, -1)}</label>
                    <input type="text" id="geoNewItem" class="w-full bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/50 rounded-xl px-4 py-3 text-sm text-black outline-none transition-all" placeholder="Nombre..." value="${geoAdmin.newItem || ''}">
                 </div>
                 <button id="btnGeoAdd" class="w-full bg-[#007AFF] text-white px-4 py-3 rounded-xl font-black text-xs hover:bg-[#0066D6] active:scale-95 transition-all shadow-md shadow-[#007AFF]/20 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg> Guardar
                 </button>
              </div>
              
              <div class="p-5 bg-black rounded-3xl shadow-xl hidden lg:block">
                 <div class="flex items-center gap-3 text-white/60 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    <span class="text-[11px] font-bold uppercase tracking-widest">Instrucciones</span>
                 </div>
                 <p class="text-[13px] text-white/80 leading-relaxed">
                    Navega haciendo click en las tarjetas. Puedes añadir sub-niveles dentro de cada categoría seleccionada. La eliminación es permanente.
                 </p>
              </div>
           </div>
           
           <!-- Grid -->
           <div class="lg:col-span-3">
              <div class="flex items-center justify-between mb-4 px-1">
                 <h3 class="font-bold text-black flex items-center gap-2 text-lg">
                    ${levelName} <span class="text-[#8E8E93] font-normal text-sm">(${currentItems.length})</span>
                 </h3>
              </div>
              ${gridHtml}
           </div>
        </div>
      </section>
    </div>
  `;
}
