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
  if (ventasState.currentSubView === 'dashboard') {
    renderDashboard(container, renderApp);
  } else if (ventasState.currentSubView === 'competencia') {
    await renderCompetencia(container, appState, renderApp);
  }
}

function renderDashboard(container, renderApp) {
  container.innerHTML = `
    <div class="px-5 py-6 min-h-screen pb-24">
      <div class="flex items-center gap-3 mb-8">
        <button id="btnVentasBack" class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#007AFF]">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        <div>
          <h1 class="text-[28px] font-bold tracking-tight text-black leading-none">Módulo de Ventas</h1>
          <p class="text-sm text-[#8E8E93] mt-1">Gestión avanzada y estudio de mercado</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-4">
        <!-- Competencia Card -->
        <button id="btnNavCompetencia" class="bg-white rounded-2xl p-5 flex items-center justify-between shadow-sm border border-[#E5E5EA]/50 active:scale-[0.98] transition-transform text-left">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-600"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
            </div>
            <div>
              <h3 class="text-lg font-bold text-black">Estudio de Mercado</h3>
              <p class="text-sm text-[#8E8E93]">Ofertas y planes de la competencia</p>
            </div>
          </div>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-[#C7C7CC]"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>
    </div>
  `;

  document.getElementById('btnVentasBack').addEventListener('click', () => {
    appState.currentView = 'home';
    renderApp();
  });

  document.getElementById('btnNavCompetencia').addEventListener('click', () => {
    ventasState.currentSubView = 'competencia';
    renderVentasPanel(container, appState, renderApp);
  });
}

async function renderCompetencia(container, appState, renderApp) {
  ventasState.loadingOfertas = true;
  
  // Initial render (Loading skeleton)
  container.innerHTML = `
    <div class="px-5 py-6 min-h-screen pb-24">
      <div class="flex items-center gap-3 mb-6">
        <button id="btnCompBack" class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#007AFF]">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
        </button>
        <div>
          <h1 class="text-[24px] font-bold text-black leading-none">Estudio de Mercado</h1>
          <p class="text-xs text-[#8E8E93] mt-1">Ofertas de la competencia</p>
        </div>
      </div>
      <div class="flex justify-center py-20"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
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
    cardsHtml = `<div class="bg-white p-8 rounded-2xl text-center text-[#8E8E93] shadow-sm">No hay datos de ofertas.</div>`;
  } else {
    cardsHtml = ventasState.ofertas.map(oferta => {
      const opName = oferta.operadores_competencia?.nombre || "Desconocido";
      const opColor = oferta.operadores_competencia?.color_hex || "#6b7280";
      
      if (oferta.isEmpty) {
        return `
          <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E5EA]/50 flex items-center justify-between cursor-pointer active:scale-95 transition-transform">
            <div class="flex items-center gap-3">
               <div class="w-3 h-3 rounded-full" style="background-color: ${opColor}"></div>
               <div>
                 <h3 class="font-bold text-black">${opName}</h3>
                 <p class="text-xs text-[#8E8E93]">Sin planes reportados</p>
               </div>
            </div>
            <span class="text-[#007AFF] text-sm font-medium">Registrar</span>
          </div>
        `;
      }

      return `
        <div class="bg-white rounded-2xl p-5 shadow-sm border border-[#E5E5EA]/50">
          <div class="flex items-center gap-2 mb-3">
             <div class="w-3 h-3 rounded-full" style="background-color: ${opColor}"></div>
             <h3 class="font-bold text-black">${opName}</h3>
          </div>
          <div class="flex items-end gap-2 mb-3">
             <span class="text-xs text-[#8E8E93] mb-1">Desde</span>
             <span class="text-2xl font-black text-black">$${oferta.min_precio}</span>
             <span class="text-xs text-[#8E8E93] mb-1">/ mes</span>
          </div>
          <div class="space-y-1">
             <div class="flex items-center gap-2 text-sm text-[#1C1C1E]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-amber-500"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <span>Hasta ${oferta.max_velocidad} Mbps</span>
             </div>
             ${oferta.incluye_tv ? `
             <div class="flex items-center gap-2 text-sm text-[#1C1C1E]">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/></svg>
                <span>Incluye IPTV</span>
             </div>` : ''}
          </div>
        </div>
      `;
    }).join('');
  }

  container.innerHTML = `
    <div class="px-5 py-6 min-h-screen pb-24 bg-[#F2F2F7]">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center gap-3">
          <button id="btnCompBack" class="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-[#007AFF] active:scale-95 transition-transform">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
          <div>
            <h1 class="text-[24px] font-bold text-black leading-none">Mercado</h1>
            <p class="text-xs text-[#8E8E93] mt-1">Ofertas y Planes</p>
          </div>
        </div>
        <button id="btnNewOp" class="w-10 h-10 bg-[#007AFF] rounded-full flex items-center justify-center shadow-sm text-white active:scale-95 transition-transform">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4">
        ${cardsHtml}
      </div>
    </div>
  `;

  document.getElementById('btnCompBack').addEventListener('click', () => {
    ventasState.currentSubView = 'dashboard';
    renderVentasPanel(container, appState, renderApp);
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
