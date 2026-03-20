export function renderAdminPanel(appState) {
  const asesoresList = appState.asesores.map((a, i) => `
    <div class="flex justify-between items-center bg-white p-3 rounded-xl border border-[#E5E5EA] mb-2 shadow-sm">
      <span class="font-medium text-black">${a}</span>
      <button class="btn-delete-asesor text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors" data-index="${i}">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
      </button>
    </div>
  `).join('');

  const zonesList = [];
  Object.keys(appState.geoHierarchy).forEach(est => {
    Object.keys(appState.geoHierarchy[est]).forEach(mun => {
      Object.keys(appState.geoHierarchy[est][mun]).forEach(par => {
        const sectors = appState.geoHierarchy[est][mun][par] || [];
        const displayLabel = `${est} > ${mun} > ${par}`;
        
        zonesList.push(`
          <div class="border border-[#E5E5EA] rounded-xl mb-3 overflow-hidden bg-white shadow-sm">
            <div class="flex justify-between items-center bg-[#F2F2F7] p-3">
              <span class="font-bold text-black text-[10px] uppercase">${displayLabel}</span>
              <button class="btn-delete-parroquia text-red-500 p-1.5 hover:bg-red-100 rounded-lg transition-colors" 
                      data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <div class="p-3">
              <div class="flex flex-wrap gap-2 mb-3">
                ${sectors.map((s, i) => `
                   <div class="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-md text-sm border border-gray-200">
                     <span class="text-[#3A3A3C]">${s}</span>
                     <button class="btn-delete-sector text-red-400 hover:text-red-600 ml-1" 
                             data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}" data-sector="${s}">&times;</button>
                   </div>
                `).join('')}
              </div>
              <div class="flex gap-2">
                  <input type="text" class="input-new-sector ios-input !py-2 text-sm flex-1" placeholder="Nuevo sector">
                  <button class="btn-add-sector bg-black text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-gray-800" 
                          data-estado="${est}" data-municipio="${mun}" data-parroquia="${par}">Añadir</button>
              </div>
            </div>
          </div>
        `);
      });
    });
  });

  const parishesHtml = zonesList.join('');

  return `
    <div class="px-6 py-10 pb-20 bg-[#F2F2F7] min-h-screen">
      <header class="flex items-center mb-8 border-b border-[#E5E5EA] pb-4">
        <button id="btnAdminBack" class="mr-4 text-[#007AFF] hover:bg-blue-50 p-2 rounded-full transition-colors flex items-center">
           <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
           </svg>
           <span class="font-medium ml-1">Volver</span>
        </button>
        <div>
          <h1 class="text-2xl font-bold tracking-tight text-black">Panel Admin</h1>
          <p class="text-sm text-[#8E8E93]">Gestión de Configuración</p>
        </div>
      </header>

      <!-- SECCIÓN ASESORES -->
      <section class="mb-10 lg:max-w-4xl">
        <h2 class="text-lg font-bold text-black mb-3 ml-1 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#007AFF]" viewBox="0 0 20 20" fill="currentColor"><path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/></svg>
          Asesores Registrados
        </h2>
        <div class="mb-4">
           ${asesoresList.length > 0 ? asesoresList : '<p class="text-sm text-gray-500 italic ml-2">No hay asesores.</p>'}
        </div>
        <div class="flex gap-2">
           <input type="text" id="inputNewAsesor" class="ios-input flex-1" placeholder="Nombre y Apellido">
           <button id="btnAddAsesor" class="ios-btn-primary !w-auto !py-0 px-6 shrink-0">Añadir</button>
        </div>
      </section>

      <!-- SECCIÓN PLANES -->
      <section class="mb-10 lg:max-w-4xl">
        <h2 class="text-lg font-bold text-black mb-3 ml-1 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#007AFF]" viewBox="0 0 20 20" fill="currentColor"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
          Planes de Servicio
        </h2>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div class="bg-[#F8F8F8] p-4 rounded-2xl border border-[#E5E5EA]">
            <h3 class="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Domiciliarios</h3>
            ${planesDomList || '<p class="text-xs text-gray-400 italic">Sin planes</p>'}
          </div>
          <div class="bg-[#F8F8F8] p-4 rounded-2xl border border-[#E5E5EA]">
            <h3 class="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Empresariales</h3>
            ${planesEmpList || '<p class="text-xs text-gray-400 italic">Sin planes</p>'}
          </div>
        </div>

        <div class="bg-white p-4 rounded-2xl border border-[#007AFF]/20 shadow-sm space-y-3">
          <p class="text-sm font-bold text-black border-b border-gray-50 pb-2">Crear Nuevo Plan</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" id="pNombre" class="ios-input !py-2 text-sm" placeholder="Nombre (ej: 400MB)">
            <select id="pTipo" class="ios-input !py-2 text-sm">
              <option value="Domiciliario">Domiciliario</option>
              <option value="Empresarial">Empresarial</option>
            </select>
          </div>
          <div class="flex items-center justify-between">
            <label class="flex items-center space-x-2 cursor-pointer">
              <input type="checkbox" id="pHasTV" class="w-4 h-4 text-[#007AFF] rounded focus:ring-[#007AFF]">
              <span class="text-sm text-gray-700">Incluye Televisión</span>
            </label>
            <button id="btnAddPlan" class="ios-btn-primary !w-auto !py-2 px-6">Crear Plan</button>
          </div>
        </div>
      </section>

      <!-- SECCIÓN ZONAS -->
      <section class="lg:max-w-4xl">
        <h2 class="text-lg font-bold text-black mb-3 ml-1 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-[#007AFF]" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd"/></svg>
          Geo Configuración (Estado > Municipio > Parroquia)
        </h2>
        
        <div class="mb-5 flex gap-2">
           <input type="text" id="inputNewParroquia" class="ios-input flex-1" placeholder="Nueva (No habilitado desde aquí)">
           <button id="btnAddParroquia" class="ios-btn-primary !w-auto !py-0 px-6 shrink-0 opacity-50 cursor-not-allowed" disabled>Crear</button>
        </div>

        <div id="parishesContainer">
           ${parishesHtml || '<p class="text-sm text-gray-500 italic ml-2">No hay parroquias registradas.</p>'}
        </div>
      </section>
    </div>
  `;
}
