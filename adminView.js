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
  const planesAdmin = appState.planesAdmin || { showForm: false, editId: null };
  const domiciliarios = (appState.planes || []).filter(p => p.tipo === "Domiciliario");
  const empresariales = (appState.planes || []).filter(p => p.tipo === "Empresarial");
  const tvLabel = 'TV';

  const renderPlanRow = (p) => {
    if (planesAdmin.editId === p.id) {
       return `
          <div class="flex-1 space-y-3 py-1">
             <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" id="edit-plan-nombre-${p.id}" value="${p.nombre}" class="bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/50 rounded-xl px-3 py-2 text-sm text-black outline-none transition-all w-full font-bold" placeholder="Nombre del Plan">
                <select id="edit-plan-tipo-${p.id}" class="bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/50 rounded-xl px-3 py-2 text-sm text-black outline-none transition-all w-full appearance-none font-bold">
                   <option value="Domiciliario" ${p.tipo === 'Domiciliario' ? 'selected' : ''}>Domiciliario</option>
                   <option value="Empresarial" ${p.tipo === 'Empresarial' ? 'selected' : ''}>Empresarial</option>
                </select>
             </div>
             <div class="flex flex-wrap items-center gap-4 mt-2">
                <label class="flex items-center space-x-2 cursor-pointer group">
                  <div class="relative">
                    <input type="checkbox" id="edit-plan-activo-${p.id}" class="peer sr-only" ${p.activo ? 'checked' : ''}>
                    <div class="w-10 h-6 bg-[#E5E5EA] rounded-full peer-checked:bg-[#34C759] transition-all"></div>
                    <div class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-4 shadow-sm"></div>
                  </div>
                  <span class="text-[11px] font-bold text-[#8E8E93] uppercase">Activo</span>
                </label>
                <label class="flex items-center space-x-2 cursor-pointer group">
                  <div class="relative">
                    <input type="checkbox" id="edit-plan-tv-${p.id}" class="peer sr-only" ${p.has_tv ? 'checked' : ''}>
                    <div class="w-10 h-6 bg-[#E5E5EA] rounded-full peer-checked:bg-[#007AFF] transition-all"></div>
                    <div class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-all peer-checked:translate-x-4 shadow-sm"></div>
                  </div>
                  <span class="text-[11px] font-bold text-[#8E8E93] uppercase">Incluye ${tvLabel}</span>
                </label>
                <div class="flex gap-2 ml-auto">
                   <button class="btn-save-edit-plan bg-[#007AFF] text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-[#0066D6] transition-colors flex items-center gap-1 shadow-sm shadow-[#007AFF]/20" data-id="${p.id}">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg> Guardar
                   </button>
                   <button class="btn-cancel-edit-plan bg-white border border-[#E5E5EA] text-[#8E8E93] px-2.5 py-1.5 rounded-lg hover:bg-[#F2F2F7] transition-colors shadow-sm" data-id="${p.id}">
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
                   </button>
                </div>
             </div>
          </div>
       `;
    }

    return `
       <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
             <span class="font-bold text-[14px] ${p.activo === false ? 'text-[#C6C6C8] line-through' : 'text-black'}">${p.nombre}</span>
             ${p.has_tv ? `<span class="bg-purple-100 text-purple-700 text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">+ ${tvLabel}</span>` : ''}
             ${p.activo === false ? `<span class="bg-[#F2F2F7] text-[#8E8E93] border border-[#E5E5EA] text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider shadow-sm">Inactivo</span>` : ''}
          </div>
       </div>
       <div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
          <button class="btn-edit-plan text-[#8E8E93] hover:text-[#007AFF] hover:bg-blue-50 p-2 rounded-lg transition-colors" data-id="${p.id}" title="Editar">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
          </button>
          <button class="btn-delete-plan text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" data-id="${p.id}" title="Eliminar">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
       </div>
    `;
  };

  const renderPlanCard = (title, data, iconSvg) => `
    <div class="bg-white rounded-3xl border border-[#E5E5EA] shadow-sm overflow-hidden flex flex-col h-full">
       <div class="px-5 py-4 border-b border-[#E5E5EA] flex items-center gap-2 bg-[#F8F8F8]/50">
          <div class="text-[#8E8E93]">${iconSvg}</div>
          <h3 class="text-xs font-black uppercase tracking-widest text-[#8E8E93]">Planes ${title}</h3>
       </div>
       <div class="p-4 space-y-2 flex-1 max-h-[350px] overflow-y-auto custom-scrollbar">
          ${data.length === 0 ? `<p class="text-sm text-[#C6C6C8] italic text-center py-6 font-bold">No hay planes configurados.</p>` : ''}
          ${data.map(p => `
             <div class="group flex items-center justify-between p-3 rounded-2xl bg-white border border-transparent hover:border-[#E5E5EA] hover:shadow-sm hover:bg-[#F8F8F8] transition-all">
                ${renderPlanRow(p)}
             </div>
          `).join('')}
       </div>
    </div>
  `;


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
    <div class="px-4 lg:px-8 py-10 pb-20 bg-[#F2F2F7] min-h-screen max-w-7xl mx-auto">
      <header class="flex items-center mb-8 border-b border-[#E5E5EA] pb-4 backdrop-blur-md sticky top-0 bg-[#F2F2F7]/80 z-20 -mx-4 lg:-mx-8 px-4 lg:px-8">
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
        <div class="flex justify-between items-end mb-6 px-1">
          <div>
            <h2 class="text-[10px] font-black text-[#8E8E93] uppercase tracking-[0.3em] mb-1">Servicios</h2>
            <h3 class="text-2xl font-black text-black tracking-tighter uppercase">Oferta Comercial</h3>
          </div>
          <button id="btnTogglePlanForm" class="bg-white border border-[#E5E5EA] shadow-sm text-black px-4 py-2 rounded-xl font-bold text-xs hover:bg-[#F2F2F7] active:scale-95 transition-all flex items-center gap-2">
             ${planesAdmin.showForm ? `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg> Cancelar` : `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg> Nuevo Plan`}
          </button>
        </div>

        ${planesAdmin.showForm ? `
        <div class="bg-white rounded-3xl border border-[#007AFF]/30 shadow-sm overflow-hidden mb-6 animate-slide-up">
           <div class="px-5 py-4 border-b border-[#E5E5EA] bg-[#F8F8F8]/50">
              <h3 class="text-xs font-black uppercase tracking-widest text-[#007AFF]">Nuevo Plan</h3>
           </div>
           <div class="p-5 space-y-5">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label class="text-[10px] uppercase text-[#8E8E93] font-bold block mb-1.5 tracking-wider">Nombre del Plan</label>
                    <input type="text" id="pNombre" class="w-full bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/50 rounded-xl px-4 py-3 text-sm text-black outline-none transition-all font-bold" placeholder="Ej: 400MB">
                 </div>
                 <div>
                    <label class="text-[10px] uppercase text-[#8E8E93] font-bold block mb-1.5 tracking-wider">Tipo</label>
                    <select id="pTipo" class="w-full bg-[#F2F2F7] border border-transparent focus:border-[#007AFF]/50 rounded-xl px-4 py-3 text-sm text-black outline-none transition-all appearance-none font-bold">
                      <option value="Domiciliario">Domiciliario</option>
                      <option value="Empresarial">Empresarial</option>
                    </select>
                 </div>
              </div>
              <div class="flex flex-wrap items-center gap-8 pt-2">
                 <label class="flex items-center space-x-3 cursor-pointer group">
                   <div class="relative">
                     <input type="checkbox" id="pActivo" class="peer sr-only" checked>
                     <div class="w-12 h-7 bg-[#E5E5EA] rounded-full peer-checked:bg-[#34C759] transition-all"></div>
                     <div class="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-all peer-checked:translate-x-5 shadow-sm"></div>
                   </div>
                   <span class="text-sm font-bold text-[#3A3A3C]">Activo</span>
                 </label>
                 <label class="flex items-center space-x-3 cursor-pointer group">
                   <div class="relative">
                     <input type="checkbox" id="pHasTV" class="peer sr-only">
                     <div class="w-12 h-7 bg-[#E5E5EA] rounded-full peer-checked:bg-[#007AFF] transition-all"></div>
                     <div class="absolute left-1 top-1 bg-white w-5 h-5 rounded-full transition-all peer-checked:translate-x-5 shadow-sm"></div>
                   </div>
                   <span class="text-sm font-bold text-[#3A3A3C]">Incluye ${tvLabel}</span>
                 </label>
              </div>
              <div class="flex justify-end pt-2 border-t border-[#E5E5EA]">
                 <button id="btnAddPlan" class="bg-[#007AFF] text-white px-6 py-2.5 rounded-xl font-black text-xs hover:bg-[#0066D6] active:scale-95 transition-all shadow-md shadow-[#007AFF]/20 flex items-center justify-center gap-2 mt-4">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg> Crear Plan
                 </button>
              </div>
           </div>
        </div>
        ` : ''}

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
           ${renderPlanCard("Domiciliarios", domiciliarios, `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`)}
           ${renderPlanCard("Empresariales", empresariales, `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`)}
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
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    <span class="text-[11px] font-bold uppercase tracking-widest">Instrucciones</span>
                 </div>
                 <p class="text-[13px] text-white/80 leading-relaxed">
                    Navega haciendo click en las tarjetas. Puedes añadir sub-niveles dentro de cada categoría. La eliminación es permanente.
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
