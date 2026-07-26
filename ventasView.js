import { VentasAPI } from './ventasApi.js';
import { supabase } from './supabaseClient.js';

let ventasState = {
  currentSubView: 'dashboard', // dashboard, competencia
  ofertas: [],
  operadores: [],
  loadingOfertas: false,
  filterEstado: '',
  filterMunicipio: '',
  filterParroquia: '',
};

export async function renderVentasPanel(container, appState, renderApp) {
  await renderCompetencia(container, appState, renderApp);
}



async function renderCompetencia(container, appState, renderApp) {
  ventasState.loadingOfertas = true;
  
  // Initial render (Loading skeleton)
  container.innerHTML = `
    <div class="min-h-screen bg-zinc-50 pb-20">
      <div class="bg-white border-b border-zinc-200">
        <div class="max-w-3xl mx-auto px-4 py-8 flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button id="btnCompBackLoading" class="text-zinc-600 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-zinc-900">Estudio de Mercado</h1>
              <p class="text-sm text-zinc-500 mt-1">Ofertas de la competencia</p>
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>
    </div>
  `;

  // Fetch data
  try {
    const ofertas = await VentasAPI.getOfertasRecientes(ventasState.filterEstado, ventasState.filterMunicipio, ventasState.filterParroquia);
    ventasState.ofertas = ofertas;
    const operadores = await VentasAPI.getOperadores();
    ventasState.operadores = operadores;
  } catch (e) {
    console.error(e);
  }
  
  ventasState.loadingOfertas = false;

  // Build the view
  let cardsHtml = '';
  if (ventasState.ofertas.length === 0) {
    cardsHtml = `<div class="bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center mt-6">
        <h3 class="text-zinc-900 font-medium mb-1">No hay datos de ofertas.</h3>
      </div>`;
  } else {
    cardsHtml = ventasState.ofertas.map(oferta => {
      const opName = oferta.operadores_competencia?.nombre || "Desconocido";
      const opColor = oferta.operadores_competencia?.color_hex || "#6b7280";
      
      if (oferta.isEmpty) {
        return `
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200 flex items-center justify-between cursor-pointer hover:border-zinc-300 transition-colors">
            <div class="flex items-center gap-3">
               <div class="w-3 h-3 rounded-full" style="background-color: ${opColor}"></div>
               <div>
                 <h3 class="font-bold text-zinc-900">${opName}</h3>
                 <p class="text-xs text-zinc-500">Sin planes reportados</p>
               </div>
            </div>
            <span class="text-blue-600 text-sm font-medium">Registrar</span>
          </div>
        `;
      }

      return `
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-zinc-200">
          <div class="flex items-center gap-2 mb-3">
             <div class="w-3 h-3 rounded-full" style="background-color: ${opColor}"></div>
             <h3 class="font-bold text-zinc-900">${opName}</h3>
          </div>
          <div class="flex items-end gap-2 mb-3">
             <span class="text-xs text-zinc-500 mb-1">Desde</span>
             <span class="text-2xl font-black text-zinc-900">$${oferta.min_precio}</span>
             <span class="text-xs text-zinc-500 mb-1">/ mes</span>
          </div>
          <div class="space-y-1">
             <div class="flex items-center gap-2 text-sm text-zinc-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Hasta ${oferta.max_velocidad} Mbps</span>
             </div>
             ${oferta.incluye_tv ? `
             <div class="flex items-center gap-2 text-sm text-zinc-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-500"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
                <span>Incluye IPTV</span>
             </div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="min-h-screen bg-zinc-50 pb-20">
      <div class="bg-white border-b border-zinc-200">
        <div class="max-w-3xl mx-auto px-4 py-8 flex items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <button id="btnCompBack" class="text-zinc-600 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 p-2 rounded-xl">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <div>
              <h1 class="text-2xl font-bold tracking-tight text-zinc-900">Estudio de Mercado</h1>
              <p class="text-sm text-zinc-500 mt-1">Ofertas de la competencia</p>
            </div>
          </div>
          <button id="btnNewOp" class="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-all">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span class="hidden sm:inline">Nueva Operadora</span>
          </button>
        </div>
      </div>

      <div class="max-w-3xl mx-auto px-4 py-6">
        <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          ${cardsHtml}
        </div>
      </div>
    </div>
  `;

  document.getElementById('btnCompBack').addEventListener('click', () => {
    appState.currentView = 'home';
    renderApp();
  });

  document.getElementById('btnNewOp')?.addEventListener('click', () => {
    // Basic interaction just to register operator, using native prompt for now
    const name = prompt("Nombre de la nueva operadora:");
    if (name) {
      VentasAPI.saveOperador(name, '#3b82f6', '').then(() => {
        renderCompetencia(container, appState, renderApp);
      }).catch(e => alert("Error: " + e.message));
    }
  });
}
