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


  // 3. ZONAS (HIERARCHICAL VIEW - OPTIMIZED)
  const zonesList = [];
  const geo = appState.geoHierarchy || {};
  const query = (appState.geoSearchQuery || '').toLowerCase();
  
  Object.keys(geo).sort().forEach(est => {
    const municipios = geo[est];
    let munHtml = '';
    
    // Filter by search query if applicable
    const filteredMuns = Object.keys(municipios).filter(m => {
        if (!query) return true;
        if (est.toLowerCase().includes(query)) return true;
        if (m.toLowerCase().includes(query)) return true;
        // Check if any parroquia or sector matches
        return Object.keys(municipios[m]).some(p => {
            if (p.toLowerCase().includes(query)) return true;
            return (municipios[m][p] || []).some(s => s.toLowerCase().includes(query));
        });
    });

    if (filteredMuns.length === 0 && query) return;

    filteredMuns.sort().forEach(mun => {
        const parroquias = municipios[mun];
        let parHtml = '';
        
        Object.keys(parroquias).sort().forEach(par => {
            const sectors = parroquias[par] || [];
            parHtml += `
              <div class="parroquia-item bg-white/40 p-2 rounded-xl border border-[#E5E5EA]">
                <div class="flex justify-between items-center mb-1.5 px-0.5">
                  <span class="text-[9px] font-black text-[#8E8E93] uppercase tracking-tighter">📍 ${par}</span>
                  <button class="btn-delete-parroquia text-[#FF3B30] p-1 hover:bg-red-50 rounded-md transition-colors" data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  </button>
                </div>
                <div class="flex flex-wrap gap-1 mb-2">
                  ${sectors.map(s => `
                    <div class="group flex items-center gap-0.5 bg-white border border-[#E5E5EA] px-1.5 py-0.5 rounded-md text-[10px] shadow-sm">
                      <span class="text-[#3A3A3C]">${s}</span>
                      <button class="btn-delete-sector text-[#8E8E93] hover:text-[#FF3B30]" data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}" data-sector="${s}">&times;</button>
                    </div>
                  `).join('')}
                </div>
                <div class="flex gap-1.5">
                  <input type="text" class="input-new-sector ios-input !py-1 !px-2 !text-[10px] !rounded-lg flex-1 focus:bg-white" placeholder="Sumar sector...">
                  <button class="btn-add-sector bg-black text-white px-2 py-1 rounded-lg text-[10px] font-bold hover:bg-[#1C1C1E] active:scale-95 transition-all" data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}">Añadir</button>
                </div>
              </div>
            `;
        });
        
        munHtml += `
          <details class="municipio-details group mb-3 last:mb-0" ${query ? 'open' : ''}>
            <summary class="flex items-center justify-between bg-[#F8F8F8] p-3 rounded-2xl border border-[#E5E5EA] cursor-pointer list-none hover:bg-white transition-all shadow-sm">
               <div class="flex items-center gap-2">
                 <div class="w-1.5 h-3.5 bg-[#FF9500] rounded-full transition-all group-open:h-5"></div>
                 <span class="font-black text-black text-[12px] uppercase tracking-tight">${mun}</span>
                 <span class="text-[9px] text-[#8E8E93] font-bold ml-1">${Object.keys(parroquias).length} PARROQUIAS</span>
               </div>
               <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#8E8E93] transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
               </svg>
            </summary>
            <div class="p-3 pt-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-x border-b border-[#E5E5EA] rounded-b-2xl -mt-4 bg-[#F8F8F8]/30">
                ${parHtml || '<p class="text-xs text-gray-400 italic">No hay parroquias.</p>'}
            </div>
          </details>
        `;
    });

    zonesList.push(`
      <div class="estado-section mb-12 border-l-2 border-[#007AFF]/10 pl-4 py-2">
        <div class="flex items-center justify-between mb-6 px-1">
           <h3 class="text-2xl font-black text-black tracking-tighter flex items-center gap-3">
             <span class="text-[#007AFF] text-3xl">#</span> ${est}
           </h3>
           <div class="h-[1px] flex-1 bg-gradient-to-r from-[#007AFF]/20 to-transparent ml-4"></div>
        </div>
        <div>
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
           <div class="p-2">
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
            <div class="space-y-1.5">
               ${planesDomList || '<p class="text-xs text-gray-400 italic p-2">Sin planes residenciales.</p>'}
            </div>
          </div>
          <div class="bg-white/70 backdrop-blur-sm p-5 rounded-[2.5rem] border border-[#5856D6]/10 shadow-sm">
            <h3 class="text-[11px] font-black text-[#5856D6] uppercase tracking-[0.15em] mb-5 flex items-center gap-2">
               <span class="w-1.5 h-1.5 bg-[#5856D6] rounded-full"></span> CORPORATIVOS
            </h3>
            <div class="space-y-1.5">
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

      <!-- SECCIÓN ZONAS (OPTIMIZADA) -->
      <section id="sec-zonas" class="scroll-mt-32">
        <div class="flex justify-between items-end mb-8 px-1">
          <div>
            <h2 class="text-[10px] font-black text-[#8E8E93] uppercase tracking-[0.3em] mb-1">Estructura Geo</h2>
            <h3 class="text-2xl font-black text-black tracking-tighter uppercase">Cobertura</h3>
          </div>
        </div>

        <!-- SEARCH BAR -->
        <div class="bg-white p-2 rounded-3xl border border-[#E5E5EA] shadow-sm mb-6 flex gap-2">
           <div class="flex-1 relative">
             <input type="text" id="adminGeoSearch" class="w-full bg-[#F2F2F7] py-3.5 pl-12 pr-4 rounded-2xl text-sm font-bold text-black focus:outline-none focus:ring-2 focus:ring-[#007AFF]/20 transition-all" 
                    placeholder="Buscar Estado, Municipio, Parroquia o Sector..." value="${appState.geoSearchQuery || ''}">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-[#8E8E93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
             </svg>
           </div>
        </div>
        
        <!-- AGREGAR ESTADO/MUNICIPIO -->
        <div class="bg-white p-6 rounded-[2.5rem] border border-[#E5E5EA] mb-12 shadow-sm">
           <div class="flex items-center gap-4 mb-8">
              <div class="w-14 h-14 bg-[#F2F2F7] rounded-[1.5rem] shadow-sm flex items-center justify-center text-[#FF9500] border border-[#E5E5EA]">
                 <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <p class="text-xl font-black text-black tracking-tighter uppercase leading-none mb-1">Nueva Área</p>
                <p class="text-[10px] text-[#8E8E93] font-bold uppercase tracking-widest">Añade estados y municipios</p>
              </div>
           </div>
           
           <div class="space-y-6">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div class="space-y-2">
                    <label class="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest ml-1">Región / Estado</label>
                    <div class="relative">
                      <select id="newGeoEstadoSelect" class="ios-input !bg-[#F2F2F7] !border-transparent !font-bold text-sm">
                         <option value="">+ CREAR NUEVO ESTADO...</option>
                         ${Object.keys(geo).sort().map(e => `<option value="${e}" ${e === appState.lastSelectedEstado ? 'selected' : ''}>${e}</option>`).join('')}
                      </select>
                      <input type="text" id="newGeoEstadoText" class="ios-input absolute inset-0 !bg-[#F2F2F7] !font-bold text-sm ${appState.lastSelectedEstado ? 'hidden' : ''}" placeholder="Escribe el Estado">
                    </div>
                 </div>
                 <div class="space-y-2">
                    <label class="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest ml-1">Municipio / Localidad</label>
                    <div class="relative">
                       <select id="newGeoMunicipioSelect" class="ios-input !bg-[#F2F2F7] !border-transparent !font-bold text-sm">
                          <option value="">+ CREAR NUEVO MUNICIPIO...</option>
                       </select>
                       <input type="text" id="newGeoMunicipioText" class="ios-input absolute inset-0 !bg-[#F2F2F7] !font-bold text-sm" placeholder="Escribe el Municipio">
                    </div>
                 </div>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div class="space-y-2">
                    <label class="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest ml-1">Parroquia</label>
                    <input type="text" id="newGeoParroquiaText" class="ios-input !bg-[#F2F2F7] !border-transparent !font-bold text-sm" placeholder="Nombre de la Parroquia">
                 </div>
                 <div class="space-y-2">
                    <label class="text-[10px] font-black text-[#8E8E93] uppercase tracking-widest ml-1">Sector Base</label>
                    <input type="text" id="newGeoSectorText" class="ios-input !bg-[#F2F2F7] !border-transparent !font-bold text-sm" placeholder="Ej: Urbanización Centro">
                 </div>
              </div>
              <button id="btnCreateGeoLocation" class="w-full bg-[#007AFF] text-white py-4 rounded-2xl font-black text-xs tracking-widest hover:bg-[#0066D6] active:scale-95 transition-all shadow-lg shadow-[#007AFF]/20 uppercase">Guardar Ubicación</button>
           </div>
        </div>

        <!-- LISTADO DE ZONAS -->
        <div id="parishesContainer" class="space-y-4">
           ${parishesHtml || '<p class="text-sm text-[#8E8E93] font-bold text-center py-20 bg-white rounded-3xl border border-[#E5E5EA]">NO SE ENCONTRARON ZONAS PARA MOSTRAR</p>'}
        </div>
      </section>
    </div>
  `;
}
