export function renderAdminPanel(appState) {
  // 1. ASESORES LIST
  const asesoresList = appState.asesores.map((a, i) => `
    <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-[#E5E5EA] mb-2 shadow-sm group hover:border-[#007AFF]/30 transition-all">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-[#F2F2F7] rounded-full flex items-center justify-center text-[#007AFF] font-bold text-xs">
          ${a.charAt(0)}
        </div>
        <span class="font-medium text-black text-sm">${a}</span>
      </div>
      <button class="btn-delete-asesor opacity-0 group-hover:opacity-100 text-red-500 p-2 hover:bg-red-50 rounded-lg transition-all" data-index="${i}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </button>
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
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="btn-toggle-plan-tv p-1.5 hover:bg-blue-50 rounded-md text-[#007AFF]" data-id="${p.id}" title="Cambiar TV">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </button>
          <button class="btn-toggle-plan-active p-1.5 hover:bg-orange-50 rounded-md ${p.activo === false ? 'text-gray-400' : 'text-[#FF9500]'}" data-id="${p.id}" title="Toggle Activo">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
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
        <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button class="btn-toggle-plan-active p-1.5 hover:bg-orange-50 rounded-md ${p.activo === false ? 'text-gray-400' : 'text-[#FF9500]'}" data-id="${p.id}">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
          </button>
          <button class="btn-delete-plan p-1.5 hover:bg-red-50 rounded-md text-[#FF3B30]" data-id="${p.id}">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>
    `).join('');

  // 3. ZONAS (HIERARCHICAL VIEW)
  const zonesList = [];
  const geo = appState.geoHierarchy || {};
  
  Object.keys(geo).sort().forEach(est => {
    const municipios = geo[est];
    let munHtml = '';
    
    Object.keys(municipios).sort().forEach(mun => {
        const parroquias = municipios[mun];
        let parHtml = '';
        
        Object.keys(parroquias).sort().forEach(par => {
            const sectors = parroquias[par] || [];
            parHtml += `
              <div class="parroquia-item mb-4 last:mb-0">
                <div class="flex justify-between items-center mb-2 px-1">
                  <span class="text-[11px] font-bold text-[#3A3A3C] uppercase tracking-wide">📍 ${par}</span>
                  <button class="btn-delete-parroquia text-[#FF3B30] p-1 hover:bg-red-50 rounded-md transition-colors" data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <div class="flex flex-wrap gap-1.5 mb-2 pl-1">
                  ${sectors.map(s => `
                    <div class="group flex items-center gap-1 bg-white border border-[#E5E5EA] px-2 py-1 rounded-full text-xs shadow-sm shadow-black/5">
                      <span class="text-[#3A3A3C]">${s}</span>
                      <button class="btn-delete-sector text-[#8E8E93] hover:text-[#FF3B30] transition-colors" data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}" data-sector="${s}">&times;</button>
                    </div>
                  `).join('')}
                </div>
                <div class="flex gap-2 px-1">
                  <input type="text" class="input-new-sector ios-input !py-1.5 !px-3 !text-xs !rounded-lg flex-1 focus:bg-white" placeholder="Sectores nuevos...">
                  <button class="btn-add-sector bg-black text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-[#1C1C1E] active:scale-95 transition-all" data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}">Añadir</button>
                </div>
              </div>
            `;
        });
        
        munHtml += `
          <div class="municipio-card bg-[#F8F8F8] rounded-2xl border border-[#E5E5EA] mb-4 p-4 shadow-sm">
             <div class="flex items-center gap-2 mb-4 border-b border-[#E5E5EA] pb-3">
               <div class="w-2 h-4 bg-[#FF9500] rounded-full"></div>
               <span class="font-bold text-black text-sm uppercase tracking-tight">${mun}</span>
             </div>
             <div class="space-y-4">
                ${parHtml || '<p class="text-xs text-gray-400 italic">No hay parroquias.</p>'}
             </div>
          </div>
        `;
    });

    zonesList.push(`
      <div class="estado-section mb-10">
        <div class="flex items-center justify-between mb-4 px-1">
           <h3 class="text-lg font-black text-black tracking-tight flex items-center gap-2">
             <span class="text-[#007AFF]">#</span> ${est}
           </h3>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
           ${munHtml || '<p class="text-sm text-gray-400 italic ml-4">No hay municipios registrados.</p>'}
        </div>
      </div>
    `);
  });

  const parishesHtml = zonesList.join('');

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
      <nav class="flex gap-2 mb-8 overflow-x-auto pb-2 custom-scrollbar no-scrollbar">
         <a href="#sec-asesores" class="px-4 py-2 bg-white rounded-full text-xs font-bold text-black border border-[#E5E5EA] shadow-sm whitespace-nowrap">Asesores</a>
         <a href="#sec-planes" class="px-4 py-2 bg-white rounded-full text-xs font-bold text-black border border-[#E5E5EA] shadow-sm whitespace-nowrap">Planes</a>
         <a href="#sec-zonas" class="px-4 py-2 bg-white rounded-full text-xs font-bold text-black border border-[#E5E5EA] shadow-sm whitespace-nowrap">Zonas Geográficas</a>
      </nav>

      <!-- SECCIÓN ASESORES -->
      <section id="sec-asesores" class="mb-14 scroll-mt-24">
        <div class="flex justify-between items-end mb-4 px-1">
          <div>
            <h2 class="text-xs font-bold text-[#8E8E93] uppercase tracking-[0.2em] mb-1">Equipo</h2>
            <h3 class="text-xl font-black text-black">Asesores</h3>
          </div>
        </div>
        <div class="bg-white/50 rounded-3xl p-1 border border-[#E5E5EA] mb-6">
           <div class="p-2">
             ${asesoresList.length > 0 ? asesoresList : '<p class="text-sm text-gray-400 italic p-4 text-center">No hay asesores registrados.</p>'}
           </div>
        </div>
        <div class="bg-white rounded-2xl p-4 border border-[#007AFF]/10 shadow-sm flex gap-2">
           <input type="text" id="inputNewAsesor" class="ios-input flex-1 !bg-[#F2F2F7] focus:bg-white" placeholder="Nombre completo">
           <button id="btnAddAsesor" class="bg-[#007AFF] text-white px-5 rounded-xl font-bold text-sm active:scale-95 transition-all">Añadir</button>
        </div>
      </section>

      <!-- SECCIÓN PLANES -->
      <section id="sec-planes" class="mb-14 scroll-mt-24">
        <div class="flex justify-between items-end mb-4 px-1">
          <div>
            <h2 class="text-xs font-bold text-[#8E8E93] uppercase tracking-[0.2em] mb-1">Servicios</h2>
            <h3 class="text-xl font-black text-black">Oferta Comercial</h3>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-white/70 backdrop-blur-sm p-4 rounded-3xl border border-[#007AFF]/10 shadow-sm">
            <h3 class="text-[10px] font-black text-[#007AFF] uppercase tracking-widest mb-4 flex items-center gap-2">
               <span class="w-1 h-1 bg-[#007AFF] rounded-full"></span> Domiciliarios
            </h3>
            <div class="space-y-1">
               ${planesDomList || '<p class="text-xs text-gray-400 italic p-2">Sin planes residenciales.</p>'}
            </div>
          </div>
          <div class="bg-white/70 backdrop-blur-sm p-4 rounded-3xl border border-[#007AFF]/10 shadow-sm">
            <h3 class="text-[10px] font-black text-[#5856D6] uppercase tracking-widest mb-4 flex items-center gap-2">
               <span class="w-1 h-1 bg-[#5856D6] rounded-full"></span> Empresariales
            </h3>
            <div class="space-y-1">
               ${planesEmpList || '<p class="text-xs text-gray-400 italic p-2">Sin planes corporativos.</p>'}
            </div>
          </div>
        </div>

        <div class="bg-black text-white p-5 rounded-3xl shadow-xl space-y-4">
          <div class="flex items-center gap-3 mb-2">
             <div class="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
             </div>
             <p class="text-lg font-black tracking-tight">Nuevo Plan</p>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" id="pNombre" class="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 focus:bg-white/20 focus:outline-none transition-all" placeholder="Nombre (ej: 400MB)">
            <select id="pTipo" class="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white focus:bg-white/20 focus:outline-none transition-all appearance-none">
              <option value="Domiciliario" class="text-black">Domiciliario</option>
              <option value="Empresarial" class="text-black">Empresarial</option>
            </select>
          </div>
          <div class="flex items-center justify-between pt-2">
            <label class="flex items-center space-x-3 cursor-pointer group">
              <div class="relative">
                <input type="checkbox" id="pHasTV" class="peer sr-only">
                <div class="w-10 h-6 bg-white/10 rounded-full peer-checked:bg-[#34C759] transition-all"></div>
                <div class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-4"></div>
              </div>
              <span class="text-sm font-bold text-white/80 group-hover:text-white transition-colors">Incluye TV</span>
            </label>
            <button id="btnAddPlan" class="bg-white text-black px-8 py-3 rounded-2xl font-black text-sm hover:bg-gray-100 active:scale-95 transition-all">CREAR PLAN</button>
          </div>
        </div>
      </section>

      <!-- SECCIÓN ZONAS (NUEVA GESTIÓN) -->
      <section id="sec-zonas" class="scroll-mt-24">
        <div class="flex justify-between items-end mb-6 px-1">
          <div>
            <h2 class="text-xs font-bold text-[#8E8E93] uppercase tracking-[0.2em] mb-1">Geografía</h2>
            <h3 class="text-xl font-black text-black">Zonas de Cobertura</h3>
          </div>
        </div>
        
        <!-- AGREGAR ESTADO/MUNICIPIO (EL MEJORADO) -->
        <div class="bg-[#F8F8F8] p-6 rounded-[32px] border-2 border-dashed border-[#E5E5EA] mb-10 group hover:border-[#007AFF]/30 transition-all">
           <div class="flex items-center gap-3 mb-6">
              <div class="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-[#007AFF]">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <p class="text-lg font-black text-black tracking-tight">Nueva Ubicación</p>
                <p class="text-[10px] text-[#8E8E93] font-bold uppercase tracking-widest">Crea Estados o Municipios</p>
              </div>
           </div>
           
           <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-[#8E8E93] uppercase ml-1">Estado</label>
                    <div class="relative">
                      <select id="newGeoEstadoSelect" class="ios-input !bg-white !shadow-none appearance-none">
                         <option value="">+ Nuevo Estado...</option>
                         ${Object.keys(geo).sort().map(e => `<option value="${e}">${e}</option>`).join('')}
                      </select>
                      <input type="text" id="newGeoEstadoText" class="ios-input absolute inset-0 bg-white hidden" placeholder="Nombre del Estado">
                    </div>
                 </div>
                 <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-[#8E8E93] uppercase ml-1">Municipio</label>
                    <div class="relative">
                       <select id="newGeoMunicipioSelect" class="ios-input !bg-white !shadow-none appearance-none">
                          <option value="">+ Nuevo Municipio...</option>
                       </select>
                       <input type="text" id="newGeoMunicipioText" class="ios-input absolute inset-0 bg-white hidden" placeholder="Nombre del Municipio">
                    </div>
                 </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-[#8E8E93] uppercase ml-1">Parroquia</label>
                    <input type="text" id="newGeoParroquiaText" class="ios-input !bg-white" placeholder="Nombre de la Parroquia">
                 </div>
                 <div class="space-y-1.5">
                    <label class="text-[10px] font-bold text-[#8E8E93] uppercase ml-1">Primer Sector</label>
                    <input type="text" id="newGeoSectorText" class="ios-input !bg-white" placeholder="Nombre del Sector">
                 </div>
              </div>
              <button id="btnCreateGeoLocation" class="w-full bg-black text-white py-4 rounded-2xl font-black text-sm tracking-tight hover:bg-[#1C1C1E] active:scale-95 transition-all mt-2">GUARDAR UBICACIÓN</button>
           </div>
        </div>

        <div id="parishesContainer">
           ${parishesHtml || '<p class="text-sm text-gray-400 italic p-10 text-center">No hay datos geográficos para mostrar.</p>'}
        </div>
      </section>
    </div>
  `;
}
