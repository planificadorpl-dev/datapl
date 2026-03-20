import { geoData as defaultGeoData } from './geo_data.js';
import { geoHierarchy } from './geo_hierarchy.js';
import { renderAdminPanel } from './adminView.js';
import { supabase } from './supabaseClient.js';

// Application State
const DEFAULT_ASESORES = ['Yaisen Herrera', 'Lorena Esqueda', 'Cindy Infante', 'Roxana Yepez', 'Carlos Ruiz', 'Patricia Mendoza', 'Maria Quintero', 'Haymar Barros', 'Yailin Rojas'];

let appState = {
  currentView: 'home', // 'home', 'form', 'history', or 'admin'
  currentAsesor: localStorage.getItem('current_asesor') || '',
  activities: JSON.parse(localStorage.getItem('current_activities') || '[]'),
  history: [],
  historyLoading: false,
  historyError: null,
  asesores: [],
  geoData: {}, // Format: { "Parroquia": ["Sector 1", "Sector 2"] } -- Keep for compatibility if needed
  geoHierarchy: {}, // New Format: { "Estado": { "Municipio": { "Parroquia": ["Sector"] } } }
  planes: [],  // Format: [{ id, nombre, tipo, has_tv, activo }]
};

// Global Initialization Flag
let isAppInitialized = false;

// Initialize Config from Supabase
async function loadGlobalConfig() {
  try {
    // 1. Fetch Asesores
    const { data: qAsesores, error: errA } = await supabase.from('asesores_config').select('*').order('nombre');
    // 2. Fetch GeoData
    const { data: qGeo, error: errG } = await supabase.from('geodata_config').select('*').order('estado').order('municipio').order('parroquia').order('sector');
    // 3. Fetch Planes
    const { data: qPlanes, error: errP } = await supabase.from('planes_config').select('*').order('nombre');

    if (errA || errG || errP) {
       console.error("Error loading config from Supabase:", errA || errG || errP);
       // Fallback on error
       appState.asesores = [...DEFAULT_ASESORES];
       appState.geoHierarchy = geoHierarchy; // Use the one imported at the top
       appState.planes = [];
    } else {
       // Map Asesores
       if(qAsesores && qAsesores.length > 0) {
          appState.asesores = qAsesores.map(row => row.nombre);
       } else {
          appState.asesores = [...DEFAULT_ASESORES];
       }
       
       // Map GeoHierarchy
       if(qGeo && qGeo.length > 0) {
          const newHierarchy = {};
          qGeo.forEach(row => {
             const e = row.estado || "N/A";
             const m = row.municipio || "N/A";
             const p = row.parroquia || "N/A";
             const s = row.sector || "N/A";
             
             if(!newHierarchy[e]) newHierarchy[e] = {};
             if(!newHierarchy[e][m]) newHierarchy[e][m] = {};
             if(!newHierarchy[e][m][p]) newHierarchy[e][m][p] = [];
             
             if(!newHierarchy[e][m][p].includes(s)) {
                newHierarchy[e][m][p].push(s);
             }
          });
          appState.geoHierarchy = newHierarchy;
          
          // Legacy geoData compatibility (Parroquia -> Sectors)
          const legacyGeo = {};
          qGeo.forEach(row => {
             if(!legacyGeo[row.parroquia]) legacyGeo[row.parroquia] = [];
             if(!legacyGeo[row.parroquia].includes(row.sector)) legacyGeo[row.parroquia].push(row.sector);
          });
          appState.geoData = legacyGeo;
       } else {
          appState.geoHierarchy = geoHierarchy;
       }

       // Map Planes
       if(qPlanes && qPlanes.length > 0) {
          appState.planes = qPlanes;
       } else {
          appState.planes = [];
       }
    }
  } catch(e) {
     console.error("Critical error connecting to Supabase:", e);
     appState.asesores = [...DEFAULT_ASESORES];
     appState.geoData = JSON.parse(JSON.stringify(defaultGeoData));
     appState.planes = [];
  } finally {
     isAppInitialized = true;
     render();
  }
}


// ── Custom UI helpers (replaces alert/confirm) ──────────────────────────
async function syncActivity(activity, action = 'ADD') {
  console.log(`Syncing ${action}:`, activity.uid);
  try {
    const response = await fetch('/api/sync-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activity, action })
    });
    const result = await response.json();
    if (!response.ok) {
        console.error("Sync Error Details:", result.error);
        throw new Error(result.error || 'Error en sync');
    }
    console.log(`Sync ${action} success:`, activity.uid);
    return result;
  } catch (err) {
    console.error("Sync Error:", err);
    showToast("Error de sincronización con la nube", "error");
    return null;
  }
}

function showToast(message, type = 'error') {
  const id = 'toast-' + Date.now();
  const colors = {
    error:   'bg-red-500',
    success: 'bg-[#34C759]',
    info:    'bg-[#007AFF]'
  };
  const icons = {
    error:   '✕',
    success: '✓',
    info:    'ℹ'
  };
  const html = `
    <div id="${id}" class="fixed top-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2 ${colors[type]} text-white px-5 py-3 rounded-2xl shadow-lg text-sm font-medium max-w-[90%] opacity-0 -translate-y-4 transition-all duration-300">
      <span class="text-base">${icons[type]}</span>
      <span>${message}</span>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', html);
  const el = document.getElementById(id);
  setTimeout(() => { el.classList.remove('opacity-0', '-translate-y-4'); }, 10);
  setTimeout(() => {
    el.classList.add('opacity-0', '-translate-y-4');
    setTimeout(() => el.remove(), 300);
  }, 3000);
}

function showConfirm(message) {
  return new Promise(resolve => {
    const id = 'confirmModal-' + Date.now();
    const html = `
      <div id="${id}" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 transition-opacity duration-300">
        <div class="bg-white w-[85%] max-w-sm rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-300">
          <div class="p-6 pb-4">
            <p class="text-center text-black font-medium leading-snug">${message}</p>
          </div>
          <div class="flex border-t border-[#E5E5EA]">
            <button data-action="cancel" class="flex-1 py-3.5 text-[#007AFF] font-medium hover:bg-gray-50 transition-colors border-r border-[#E5E5EA]">Cancelar</button>
            <button data-action="ok" class="flex-1 py-3.5 text-[#FF3B30] font-bold hover:bg-gray-50 transition-colors">Eliminar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById(id);
    const box = modal.querySelector('.bg-white');
    setTimeout(() => { modal.classList.remove('opacity-0'); box.classList.remove('scale-95'); }, 10);

    const close = (result) => {
      modal.classList.add('opacity-0');
      box.classList.add('scale-95');
      setTimeout(() => modal.remove(), 300);
      resolve(result);
    };
    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => close(false));
    modal.querySelector('[data-action="ok"]').addEventListener('click', () => close(true));
  });
}

// State Persisters (Now replaced with Supabase inline queries)

function attachAdminEvents() {
  document.getElementById('btnAdminBack')?.addEventListener('click', () => {
    appState.currentView = 'home';
    render();
  });

  document.getElementById('adminGeoSearch')?.addEventListener('input', (e) => {
    appState.geoSearchQuery = e.target.value;
    render();
    // Maintain focus on the search input after re-render
    const searchInput = document.getElementById('adminGeoSearch');
    if (searchInput) {
      searchInput.focus();
      searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
  });

  // Helper to set loading state on buttons
  const setLoading = (btn, isLoading) => {
    if(!btn) return;
    if(isLoading) {
      btn.dataset.ogText = btn.innerHTML;
      btn.innerHTML = `<div class="h-4 w-4 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin"></div>`;
      btn.disabled = true;
      btn.classList.add('opacity-70');
    } else {
      btn.innerHTML = btn.dataset.ogText || 'OK';
      btn.disabled = false;
      btn.classList.remove('opacity-70');
    }
  };

  // PLANES
  document.getElementById('btnAddPlan')?.addEventListener('click', async (e) => {
     const nombre = document.getElementById('pNombre').value.trim();
     const tipo = document.getElementById('pTipo').value;
     const has_tv = document.getElementById('pHasTV').checked;
     
     if(nombre) {
        const btn = e.currentTarget;
        setLoading(btn, true);
        const { data, error } = await supabase.from('planes_config').insert([{ nombre, tipo, has_tv }]).select();
        setLoading(btn, false);
        
        if(error) {
           showToast('Error: ' + error.message);
        } else {
           if(data) appState.planes.push(data[0]);
           render();
        }
     }
  });

  // GLOBAL DELEGATION FOR ADMIN (Check if already attached to avoid duplicates)
  if (!window._adminClickAttached) {
    document.addEventListener('click', async (e) => {
      // Toggle Active
      if (e.target.closest('.btn-toggle-plan-active')) {
         const btn = e.target.closest('.btn-toggle-plan-active');
         const id = btn.dataset.id;
         const plan = appState.planes.find(p => p.id == id);
         if(plan) {
            const newStatus = !plan.activo;
            const { error } = await supabase.from('planes_config').update({ activo: newStatus }).eq('id', id);
            if(!error) {
               plan.activo = newStatus;
               render();
            }
         }
      }
      // Toggle TV
      if (e.target.closest('.btn-toggle-plan-tv')) {
         const btn = e.target.closest('.btn-toggle-plan-tv');
         const id = btn.dataset.id;
         const plan = appState.planes.find(p => p.id == id);
         if(plan) {
            const newTV = !plan.has_tv;
            const { error } = await supabase.from('planes_config').update({ has_tv: newTV }).eq('id', id);
            if(!error) {
               plan.has_tv = newTV;
               render();
            }
         }
      }
      // Delete Plan
      if (e.target.closest('.btn-delete-plan')) {
         if(await showConfirm('¿Estás seguro de eliminar este plan?', 'Eliminar')) {
            const btn = e.target.closest('.btn-delete-plan');
            const id = btn.dataset.id;
            const { error } = await supabase.from('planes_config').delete().eq('id', id);
            if(!error) {
               appState.planes = appState.planes.filter(p => p.id != id);
               render();
            }
         }
      }
    });
    window._adminClickAttached = true;
  }
  // ASESORES
  document.getElementById('btnAddAsesor')?.addEventListener('click', async (e) => {
    const name = document.getElementById('inputNewAsesor').value.trim();
    if (name && !appState.asesores.includes(name)) {
      const btn = e.currentTarget;
      setLoading(btn, true);
      const { error } = await supabase.from('asesores_config').insert([{ nombre: name }]);
      setLoading(btn, false);
      
      if(error) {
        console.error("Supabase Error:", error);
        showToast('Error al guardar en Supabase: ' + error.message);
      } else {
        appState.asesores.push(name);
        appState.asesores.sort();
        render(); // Renders the admin panel with new data
      }
    }
  });

  document.querySelectorAll('.btn-delete-asesor').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      const name = appState.asesores[idx];
      if(await showConfirm('¿Seguro que deseas eliminar este asesor?')) {
        setLoading(btn, true);
        const { error } = await supabase.from('asesores_config').delete().eq('nombre', name);
        
        if (error) {
           setLoading(btn, false);
           showToast('Error al eliminar: ' + error.message);
           return;
        }

        appState.asesores.splice(idx, 1);
        if(!appState.asesores.includes(appState.currentAsesor)) {
           appState.currentAsesor = '';
           localStorage.setItem('current_asesor', '');
        }
        render();
      }
    });
  });

  // ZONAS - GESTIÓN MEJORADA
  const geo = appState.geoHierarchy || {};
  const estSelect = document.getElementById('newGeoEstadoSelect');
  const estText = document.getElementById('newGeoEstadoText');
  const munSelect = document.getElementById('newGeoMunicipioSelect');
  const munText = document.getElementById('newGeoMunicipioText');
  const parText = document.getElementById('newGeoParroquiaText');
  const secText = document.getElementById('newGeoSectorText');

  // Logic for New Estado/Municipio selects
  estSelect?.addEventListener('change', () => {
    const val = estSelect.value;
    if (val === '') {
      estText.classList.remove('hidden');
      munSelect.innerHTML = '<option value="">+ Nuevo Municipio...</option>';
      munText.classList.remove('hidden');
    } else {
      estText.classList.add('hidden');
      const municipios = Object.keys(geo[val] || {}).sort();
      munSelect.innerHTML = '<option value="">+ Nuevo Municipio...</option>' + 
        municipios.map(m => `<option value="${m}">${m}</option>`).join('');
      munSelect.value = '';
      munText.classList.remove('hidden');
    }
  });

  munSelect?.addEventListener('change', () => {
    if (munSelect.value === '') {
      munText.classList.remove('hidden');
    } else {
      munText.classList.add('hidden');
    }
  });

  document.getElementById('btnCreateGeoLocation')?.addEventListener('click', async (e) => {
    const estado = estSelect.value === '' ? estText.value.trim() : estSelect.value;
    const municipio = munSelect.value === '' ? munText.value.trim() : munSelect.value;
    const parroquia = parText.value.trim();
    const sector = secText.value.trim();

    if (estado && municipio && parroquia && sector) {
      const btn = e.currentTarget;
      setLoading(btn, true);
      const { error } = await supabase.from('geodata_config').insert([{ 
        estado, municipio, parroquia, sector 
      }]);
      setLoading(btn, false);

      if (error) {
        showToast('Error al crear ubicación: ' + error.message);
      } else {
        showToast('Ubicación creada con éxito', 'success');
        loadGlobalConfig();
      }
    } else {
      showToast('Por favor completa todos los campos (Estado, Municipio, Parroquia y Sector)');
    }
  });

  document.querySelectorAll('.btn-delete-parroquia').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const est = e.currentTarget.getAttribute('data-estado');
      const mun = e.currentTarget.getAttribute('data-municipio');
      const par = e.currentTarget.getAttribute('data-parroquia');
      
      if(await showConfirm(`¿Seguro que deseas eliminar la parroquia "${par}" (${est} > ${mun}) y todos sus sectores?`)) {
        btn.innerHTML = '...';
        const { error } = await supabase.from('geodata_config').delete().match({ estado: est, municipio: mun, parroquia: par });
        if(error) {
           btn.innerHTML = '✕';
           showToast('Error al eliminar parroquia: ' + error.message);
           return;
        }
        loadGlobalConfig();
      }
    });
  });

  document.querySelectorAll('.btn-add-sector').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const est = e.currentTarget.getAttribute('data-estado');
      const mun = e.currentTarget.getAttribute('data-municipio');
      const par = e.currentTarget.getAttribute('data-parroquia');
      const container = e.currentTarget.closest('.parroquia-item');
      const s = container.querySelector('.input-new-sector').value.trim();
      
      if (s) {
        setLoading(btn, true);
        const { error } = await supabase.from('geodata_config').insert([{ estado: est, municipio: mun, parroquia: par, sector: s }]);
        setLoading(btn, false);

        if(error) {
           showToast('Error añadiendo sector: ' + error.message);
        } else {
           loadGlobalConfig();
        }
      }
    });
  });

  document.querySelectorAll('.btn-delete-sector').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const btnDom = e.currentTarget;
      const est = btnDom.getAttribute('data-estado');
      const mun = btnDom.getAttribute('data-municipio');
      const par = btnDom.getAttribute('data-parroquia');
      const s = btnDom.getAttribute('data-sector');

      if(await showConfirm('¿Eliminar sector?')) {
        btnDom.innerHTML = '...'; 
        const { error } = await supabase.from('geodata_config').delete().match({ estado: est, municipio: mun, parroquia: par, sector: s });
        if(error) {
           btnDom.innerHTML = '&times;';
           showToast('Error al eliminar sector: ' + error.message);
           return;
        }
        loadGlobalConfig();
      }
    });
  });
}

// URL for Secure Node.js Backend Server
const GOOGLE_SCRIPT_URL_SAVE = "/api/save-jornada";
const GOOGLE_SCRIPT_URL_HISTORY = "/api/history";

// Update View Routine
function render() {
  const appContainer = document.getElementById('app');

  if (!isAppInitialized) {
     appContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center p-8 text-center mt-40">
        <div class="h-10 w-10 border-4 border-[#C6C6C8] border-t-[#007AFF] rounded-full animate-spin mb-4"></div>
        <p class="text-[#8E8E93] text-sm">Cargando configuración global...</p>
      </div>
     `;
     return;
  }

  if (appState.currentView === 'home') {
    appContainer.innerHTML = renderHome();
    attachHomeEvents();
    attachTabEvents();
  } else if (appState.currentView === 'activities_panel') {
    appContainer.innerHTML = renderActivitiesPanel();
    attachActivitiesPanelEvents();
  } else if (appState.currentView === 'form') {
    appContainer.innerHTML = renderForm();
    attachFormEvents();
  } else if (appState.currentView === 'solicitud_form') {
    appContainer.innerHTML = renderSolicitudForm();
    attachSolicitudEvents();
  } else if (appState.currentView === 'history') {
    // If arriving at history tab, fetch data
    appContainer.innerHTML = renderHistory();
    attachTabEvents();
  } else if (appState.currentView === 'admin') {
    appContainer.innerHTML = renderAdminPanel(appState);
    attachAdminEvents();
  }
}

function renderBottomTabs(activeTab) {
  return `
    <div class="fixed bottom-0 left-0 right-0 h-[68px] bg-[#F2F2F7] border-t border-[#E5E5EA] flex justify-around items-center px-4 z-20 max-w-md mx-auto">
      <button id="tabHome" class="flex flex-col items-center justify-center w-1/2 h-full ${activeTab === 'home' ? 'text-[#007AFF]' : 'text-[#8E8E93]'} transition-colors duration-200">
        <!-- Home Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="${activeTab === 'home' ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span class="text-[10px] uppercase font-semibold">Hoy</span>
      </button>
      <button id="tabHistory" class="flex flex-col items-center justify-center w-1/2 h-full ${activeTab === 'history' ? 'text-[#007AFF]' : 'text-[#8E8E93]'} transition-colors duration-200">
        <!-- List Icon -->
        <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mb-1" fill="${activeTab === 'history' ? 'currentColor' : 'none'}" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <span class="text-[10px] uppercase font-semibold">Historial</span>
      </button>
    </div>
  `;
}

function attachTabEvents() {
  document.getElementById('tabHome')?.addEventListener('click', () => {
    appState.currentView = 'home';
    render();
  });
  document.getElementById('tabHistory')?.addEventListener('click', () => {
    if (appState.currentView !== 'history') {
        appState.currentView = 'history';
        appState.historyLoading = true;
        render(); // Renders the loading skeleton
        fetchHistory(); // Triggers the network call
    }
  });
}

async function fetchHistory() {
  try {
    const res = await fetch('/api/history');
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();
    appState.history = data;
    appState.historyError = null;
  } catch (err) {
    console.error("Error fetching history:", err);
    appState.historyError = "No se pudo conectar al servidor para obtener el historial.";
  } finally {
    appState.historyLoading = false;
    // Only render if user is still on history view
    if (appState.currentView === 'history') {
      render();
    }
  }
}

// ----------------- HOME VIEW -----------------

function renderHome() {
  const dateStr = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

  return `
    <div class="px-6 py-10 pb-[150px]">
      <header class="mb-8 flex justify-between items-start">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-black mb-1">Actividades</h1>
          <p class="text-[#8E8E93]">${formattedDate}</p>
        </div>
        <button id="btnAdminAccess" class="p-2 text-[#8E8E93] hover:text-black transition-colors rounded-full hover:bg-black/5 active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      <!-- Asesor Selection in Home -->
      <div class="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5EA] mb-6">
        <label class="ios-label !mb-2">¿Quién está reportando?</label>
        <!-- Custom Minimalist Dropdown -->
        <div class="relative w-full text-black h-[48px]" id="customAsesorDropdown">
          <button id="hAsesorBtn" type="button" class="w-full h-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 flex justify-between items-center transition-all duration-200 hover:bg-[#E5E5EA] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50">
            <span id="hAsesorSelectedText" class="${appState.currentAsesor ? 'font-medium text-black' : 'text-[#8E8E93]'}">
              ${appState.currentAsesor || 'Seleccione el Asesor...'}
            </span>
            <svg id="hAsesorIcon" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#8E8E93] transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <!-- Dropdown Options -->
          <div id="hAsesorOptions" class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible scale-95 origin-top transition-all duration-200 overflow-hidden max-h-[300px] overflow-y-auto custom-scrollbar hidden">
            <div class="py-1">
              ${appState.asesores.map(name => `
                  <button type="button" data-value="${name}" class="asesor-option w-full text-left px-4 py-3 text-[15px] hover:bg-[#F2F2F7] transition-colors flex justify-between items-center group">
                    <span class="${appState.currentAsesor === name ? 'font-semibold text-[#007AFF]' : 'text-black group-hover:text-black'}">${name}</span>
                    ${appState.currentAsesor === name ? `
                      <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-[#007AFF]" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    ` : ''}
                  </button>
                `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- DUAL CARDS SECTION -->
      <div class="px-6 grid grid-cols-1 gap-4">
        
        <!-- CARD 1: ACTIVIDADES -->
        <button id="btnGoToActivity" class="relative overflow-hidden bg-white rounded-3xl p-6 shadow-sm border border-[#E5E5EA] text-left transition-transform active:scale-[0.98] ${!appState.currentAsesor ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} group hover:shadow-md">
          <!-- Main Icon -->
          <div class="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white mb-6 z-10 relative">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-person-lines-fill" viewBox="0 0 16 16">
              <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1zM11 3.5a.5.5 0 0 1 .5-.5h4a.5.5 0 0 1 0 1h-4a.5.5 0 0 1-.5-.5zm.5 2.5a.5.5 0 0 0 0 1h4a.5.5 0 0 0 0-1h-4zm2 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2zm0 3a.5.5 0 0 0 0 1h2a.5.5 0 0 0 0-1h-2z"/>
            </svg>
          </div>
          <!-- Background Faded Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute -right-4 -top-2 w-32 h-32 text-[#F2F2F7] z-0 transition-transform duration-500 group-hover:scale-110" fill="currentColor" viewBox="0 0 16 16">
            <path d="M6 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm-5 6s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H1z"/>
          </svg>
          <!-- Texts -->
          <div class="relative z-10">
            <h2 class="text-[22px] font-bold text-black mb-1.5 tracking-tight">Actividades</h2>
            <p class="text-[13px] text-[#8E8E93] leading-snug mb-8 pr-4">Reporte diario de visitas, recorridos y publicidad.</p>
            <span class="text-[13px] font-bold text-black flex items-center gap-1.5 group-hover:gap-2 transition-all">
              Ver Panel de Actividades 
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
        </button>

        <!-- CARD 2: SOLICITUDES -->
        <button id="btnGoToSolicitud" class="relative overflow-hidden bg-white rounded-3xl p-6 shadow-sm border border-[#E5E5EA] text-left transition-transform active:scale-[0.98] ${!appState.currentAsesor ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} group hover:shadow-md">
          <!-- Main Icon -->
          <div class="w-12 h-12 bg-[#F2F2F7] rounded-2xl flex items-center justify-center text-black mb-6 z-10 relative border border-[#E5E5EA]">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" class="bi bi-file-earmark-plus" viewBox="0 0 16 16">
              <path d="M8 6.5a.5.5 0 0 1 .5.5v1.5H10a.5.5 0 0 1 0 1H8.5V11a.5.5 0 0 1-1 0V9.5H6a.5.5 0 0 1 0-1h1.5V7a.5.5 0 0 1 .5-.5z"/>
              <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
            </svg>
          </div>
          <!-- Background Faded Icon -->
          <svg xmlns="http://www.w3.org/2000/svg" class="absolute -right-4 top-2 w-32 h-32 text-[#F2F2F7] z-0 transition-transform duration-500 group-hover:-rotate-12" fill="currentColor" viewBox="0 0 16 16">
            <path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5L14 4.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5h-2z"/>
          </svg>
          <!-- Texts -->
          <div class="relative z-10">
            <h2 class="text-[22px] font-bold text-black mb-1.5 tracking-tight">Solicitudes</h2>
            <p class="text-[13px] text-[#8E8E93] leading-snug mb-8 pr-4">Registro de ventas e instalaciones de fibra.</p>
            <span class="text-[13px] font-bold text-black flex items-center gap-1.5 group-hover:gap-2 transition-all">
              Nueva Solicitud 
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </span>
          </div>
        </button>

      </div>

      ${renderBottomTabs('home')}
    </div>
  `;
}

function attachHomeEvents() {
  // Custom Dropdown Logic
  const ddBtn = document.getElementById('hAsesorBtn');
  const ddOptions = document.getElementById('hAsesorOptions');
  const ddIcon = document.getElementById('hAsesorIcon');
  let isDdOpen = false;

  const toggleDropdown = () => {
    isDdOpen = !isDdOpen;
    if (isDdOpen) {
      ddOptions.classList.remove('hidden');
      // trigger reflow
      void ddOptions.offsetWidth;
      ddOptions.classList.remove('opacity-0', 'invisible', 'scale-95');
      ddOptions.classList.add('opacity-100', 'visible', 'scale-100');
      ddIcon.classList.add('rotate-180');
      ddBtn.classList.add('border-[#007AFF]', 'bg-white');
    } else {
      ddOptions.classList.remove('opacity-100', 'visible', 'scale-100');
      ddOptions.classList.add('opacity-0', 'invisible', 'scale-95');
      ddIcon.classList.remove('rotate-180');
      ddBtn.classList.remove('border-[#007AFF]', 'bg-white');
      setTimeout(() => ddOptions.classList.add('hidden'), 200); // wait for trans
    }
  };

  ddBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  document.getElementById('btnAdminAccess')?.addEventListener('click', () => {
    // Check if modal already exists to prevent duplicates
    if (document.getElementById('adminLoginModal')) return;

    const modalHtml = `
      <div id="adminLoginModal" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 transition-opacity duration-300">
        <div class="bg-white w-[90%] max-w-sm rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-300">
          <div class="p-6">
            <h3 class="text-xl font-bold text-center text-black mb-2">Acceso Administrador</h3>
            <p class="text-sm text-center text-[#8E8E93] mb-6">Por favor, ingresa la contraseña para continuar.</p>
            
            <input type="password" id="adminPasswordInput" class="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 text-black text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#007AFF] transition-all mb-2" placeholder="••••••••" autocomplete="off">
            <p id="adminLoginError" class="text-red-500 text-xs text-center h-4 invisible">Contraseña incorrecta</p>
          </div>
          
          <div class="flex border-t border-[#E5E5EA]">
            <button id="btnCancelAdmin" class="flex-1 py-3 text-[#007AFF] font-medium hover:bg-gray-50 transition-colors border-r border-[#E5E5EA]">Cancelar</button>
            <button id="btnSubmitAdmin" class="flex-1 py-3 text-[#007AFF] font-bold hover:bg-gray-50 transition-colors">Ingresar</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    const modal = document.getElementById('adminLoginModal');
    const modalContent = modal.querySelector('.bg-white');
    const input = document.getElementById('adminPasswordInput');
    const errorMsg = document.getElementById('adminLoginError');

    // Animate in
    setTimeout(() => {
      modal.classList.remove('opacity-0');
      modalContent.classList.remove('scale-95');
      input.focus();
    }, 10);

    const closeModal = () => {
      modal.classList.add('opacity-0');
      modalContent.classList.add('scale-95');
      setTimeout(() => modal.remove(), 300);
    };

    const attemptLogin = () => {
      if (input.value === '25531617') {
        closeModal();
        appState.currentView = 'admin';
        render();
      } else {
        errorMsg.classList.remove('invisible');
        input.classList.add('animate-shake', 'border', 'border-red-400');
        setTimeout(() => input.classList.remove('animate-shake', 'border', 'border-red-400'), 500);
        input.value = '';
        input.focus();
      }
    };

    document.getElementById('btnCancelAdmin').addEventListener('click', closeModal);
    document.getElementById('btnSubmitAdmin').addEventListener('click', attemptLogin);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') attemptLogin();
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (isDdOpen && !document.getElementById('customAsesorDropdown')?.contains(e.target)) {
      toggleDropdown();
    }
  });

  document.querySelectorAll('.asesor-option').forEach(opt => {
    opt.addEventListener('click', (e) => {
      const val = e.currentTarget.getAttribute('data-value');
      appState.currentAsesor = val;
      localStorage.setItem('current_asesor', appState.currentAsesor);
      toggleDropdown();
      render(); // Re-render to update UI states
    });
  });

  document.getElementById('btnGoToActivity')?.addEventListener('click', () => {
    if(!appState.currentAsesor) {
       showToast('Por favor, seleccione un asesor antes de ver actividades.', 'info');
       return;
    }
    appState.currentView = 'activities_panel';
    render();
  });

  document.getElementById('btnGoToSolicitud')?.addEventListener('click', () => {
    if(!appState.currentAsesor) {
       showToast('Por favor, seleccione un asesor antes de crear una solicitud.', 'info');
       return;
    }
    appState.currentView = 'solicitud_form';
    render();
  });
}

// ----------------- ACTIVITIES PANEL VIEW -----------------

function renderActivitiesPanel() {
  let activitiesHtml = '';
  if (appState.activities.length === 0) {
    activitiesHtml = `
      <div class="flex flex-col items-center justify-center p-8 text-center mt-10">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-[#C6C6C8] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <p class="text-[#8E8E93] text-lg font-medium">No hay actividades hoy</p>
        <p class="text-[#8E8E93] text-sm mt-1">Añade una actividad para comenzar tu reporte.</p>
      </div>
    `;
  } else {
    activitiesHtml = `
      <div class="space-y-3 mt-6">
        <h2 class="text-sm font-semibold text-[#8E8E93] uppercase tracking-wider ml-2 mb-3">Registradas hoy (${appState.activities.length})</h2>
        ${appState.activities.map((act, index) => `
          <div class="bg-white rounded-2xl p-4 shadow-ios relative border border-[#E5E5EA]">
            <div class="flex justify-between items-start mb-2">
              <span class="text-xs font-semibold px-2 py-1 bg-[#F2F2F7] text-[#8E8E93] rounded-md">${act.time}</span>
              <button class="delete-btn text-red-500 p-1" data-index="${index}">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
            <h3 class="font-bold text-lg leading-tight mb-1 text-black">${act.activityType}</h3>
            ${act.ubicaciones && act.ubicaciones.length > 0 ? `<p class="text-[#3A3A3C] text-[13px] leading-tight mb-1">📍 ${act.ubicaciones.length > 1 ? act.ubicaciones.length + ' Sectores (' + act.ubicaciones[0].parroquia + '...)' : (act.ubicaciones[0].parroquia + ', ' + act.ubicaciones[0].sector)}</p>` : ''}
            ${act.condominio ? `<p class="text-[#3A3A3C] text-[13px] leading-tight mb-1">🏢 ${act.condominio}</p>` : ''}
            ${act.receivedCalls ? `<p class="text-[#34C759] text-[13px] font-medium leading-tight mb-1">📞 Recibió llamadas (I:${act.llamadasInfo} | A:${act.llamadasAgenda})</p>` : ''}
            <p class="text-[#8E8E93] text-sm mt-1 font-medium bg-[#F2F2F7] inline-block px-2 py-0.5 rounded">S:${act.solicitudes} | C:${act.clientesCaptados}${act.volantes > 0 ? ' | V:'+act.volantes : ''}</p>
          </div>
        `).join('')}
      </div>
    `;
  }

  const sendWhatsappBtn = appState.activities.length > 0 ? `
    <div class="mt-6 flex flex-col gap-3">
      <button id="btnSendWhatsapp" class="btn-flat-success">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-whatsapp" viewBox="0 0 16 16">
            <path d="M13.601 2.326A7.854 7.854 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.933 7.933 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.898 7.898 0 0 0 13.6 2.326zM7.994 14.521a6.573 6.573 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.557 6.557 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592zm3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.729.729 0 0 0-.529.247c-.182.198-.691.677-.691 1.654 0 .977.71 1.916.81 2.049.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232z"/>
        </svg>
        Enviar Reporte por WhatsApp
      </button>
      <button id="btnFinalizeJornada" class="btn-flat-danger">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>
        Finalizar Jornada y Guardar
      </button>
    </div>
    
    <!-- Custom Dialog Modal -->
    <dialog id="confirmModal" class="bg-white rounded-3xl p-6 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm outline-none border border-[#E5E5EA] w-[90%] max-w-[340px]">
      <div class="flex flex-col items-center text-center">
        <div class="w-12 h-12 bg-[#FFEBEE] text-[#C62828] rounded-full flex items-center justify-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 class="text-lg font-bold text-black mb-2 leading-tight">¿Finalizar Jornada?</h3>
        <p class="text-[#3A3A3C] text-sm mb-6">Esto agrupará las actividades de hoy y las preparará para guardarse en tu base de datos de Sheets.</p>
        
        <div class="flex w-full gap-3">
          <button id="btnModalCancel" class="w-1/2 py-3 bg-[#F2F2F7] text-[#3A3A3C] font-semibold rounded-xl active:scale-[0.98] transition-all">Cancelar</button>
          <button id="btnModalConfirm" class="w-1/2 py-3 bg-[#007AFF] text-white font-semibold rounded-xl text-center active:scale-[0.98] transition-all">Aceptar</button>
        </div>
      </div>
    </dialog>
  ` : '';

  return `
    <div class="px-6 py-8 pb-10 bg-white min-h-screen">
      <header class="flex flex-col mb-6 pb-4 border-b border-[#E5E5EA]">
        <div class="flex items-center justify-between w-full mb-3">
          <button id="btnBackToHome" class="text-[#007AFF] font-medium text-lg flex items-center gap-1 active:opacity-70 transition-opacity">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
             </svg>
             Inicio
          </button>
          <h2 class="text-lg font-semibold text-black">Panel de Actividades</h2>
          <div class="w-[74px]"></div> <!-- Spacer -->
        </div>
      </header>
      
      <button id="btnGoToFormFromPanel" class="w-full flex items-center justify-center gap-2 py-3.5 bg-[#007AFF] rounded-xl text-[15px] font-semibold text-white active:scale-[0.98] transition-all mb-4 shadow-sm shadow-[#007AFF]/20">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Añadir reporte de Actividad
      </button>

      ${activitiesHtml}
      ${sendWhatsappBtn}
    </div>
  `;
}

function attachActivitiesPanelEvents() {
  document.getElementById('btnBackToHome')?.addEventListener('click', () => {
    appState.currentView = 'home';
    render();
  });

  document.getElementById('btnGoToFormFromPanel')?.addEventListener('click', () => {
    appState.currentView = 'form';
    render();
  });

  document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      const activity = appState.activities[idx];

      if(await showConfirm('¿Seguro que deseas eliminar esta actividad?')) {
// syncActivity(activity, 'DELETE'); // Disabled for real-time saving
        appState.activities.splice(idx, 1);
        saveActivities();
        render(); // Renders activities panel
      }
    });
  });

  document.getElementById('btnSendWhatsapp')?.addEventListener('click', () => {
    generateWhatsappReport();
  });

  document.getElementById('btnFinalizeJornada')?.addEventListener('click', () => {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.showModal();
  });

  document.getElementById('btnModalCancel')?.addEventListener('click', () => {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.close();
  });

  document.getElementById('btnModalConfirm')?.addEventListener('click', () => {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.close();
    finalizeJornada();
  });
}

function saveActivities() {
  localStorage.setItem('current_activities', JSON.stringify(appState.activities));
}

async function finalizeJornada() {
  if (appState.activities.length === 0) return;

  const btn = document.getElementById('btnFinalizeJornada');
  const ogText = btn.innerHTML;
  btn.innerHTML = `<div class="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>`;
  btn.disabled = true;

  const now = new Date();
  const formattedDate = now.toLocaleDateString('es-ES');
  const asesor = appState.currentAsesor;

  const jornada = {
    date: formattedDate,
    timestamp: now.toISOString(),
    asesor: asesor,
    activitiesCount: appState.activities.length,
    activitiesDetail: [...appState.activities],
    reporteWhatsapp: buildWhatsappReport([...appState.activities], asesor, formattedDate)
  };

  try {
    const res = await fetch('/api/save-jornada', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jornada)
    });

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error || 'Error al guardar la jornada');
    }

    showToast('Jornada guardada exitosamente en la nube', 'success');
    
    // Clear current activities only on success
    appState.activities = [];
    saveActivities();
    
    // Return to home after success
    setTimeout(() => {
      appState.currentView = 'home';
      render();
    }, 1500);

  } catch (err) {
    console.error('Error al finalizar jornada:', err);
    showToast('Error crítico: ' + err.message, 'error');
    btn.innerHTML = ogText;
    btn.disabled = false;
  }
}

// ----------------- HISTORY VIEW -----------------

function renderHistory() {
  let historyHtml = '';
  
  if (appState.historyLoading) {
    historyHtml = `
      <div class="flex flex-col items-center justify-center p-8 text-center mt-20 animate-pulse">
        <div class="h-10 w-10 border-4 border-[#C6C6C8] border-t-[#007AFF] rounded-full animate-spin mb-4"></div>
        <p class="text-[#8E8E93] text-sm">Sincronizando con Google Sheets...</p>
      </div>
    `;
  } else if (appState.historyError) {
    historyHtml = `
      <div class="flex flex-col items-center justify-center p-8 text-center mt-20">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p class="text-red-500 text-sm font-medium">${appState.historyError}</p>
      </div>
    `;
  } else if (appState.history.length === 0) {
    historyHtml = `
      <div class="flex flex-col items-center justify-center p-8 text-center mt-20">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-[#C6C6C8] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        <p class="text-[#8E8E93] text-lg font-medium">Hoja de cálculo vacía</p>
        <p class="text-[#8E8E93] text-sm mt-1">Aún no hay reportes de asesores guardados en Sheets.</p>
      </div>
    `;
  } else {
    const filteredHistory = appState.currentAsesor
      ? appState.history.filter(jor => jor.asesor === appState.currentAsesor)
      : appState.history;

    if (filteredHistory.length === 0) {
      historyHtml = `
        <div class="flex flex-col items-center justify-center p-8 text-center mt-20">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-[#C6C6C8] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
          <p class="text-[#8E8E93] text-lg font-medium">Sin historial</p>
          <p class="text-[#8E8E93] text-sm mt-1">${appState.currentAsesor ? `No hay jornadas guardadas para ${appState.currentAsesor}.` : 'Seleccione un asesor en la pantalla principal.'}</p>
        </div>
      `;
    } else {
    historyHtml = `
      <div class="space-y-4 mt-6">
        ${filteredHistory.map(jor => `
          <div class="bg-white rounded-2xl p-4 shadow-sm border border-[#E5E5EA]">
            <div class="flex justify-between items-center mb-1">
              <h3 class="font-semibold text-lg text-black">${jor.date}</h3>
              <span class="text-xs font-semibold text-[#8E8E93] px-2 py-1 bg-[#F2F2F7] rounded-md">${jor.activitiesCount} act.</span>
            </div>
            <p class="text-sm text-[#3A3A3C] font-medium mb-3">👤 ${jor.asesor}</p>
            <div class="text-[13px] font-medium text-[#8E8E93] pt-3 border-t border-[#E5E5EA] flex justify-between gap-1 overflow-x-auto pb-1 custom-scrollbar">
              <div class="flex flex-col items-center min-w-[40px]"><span class="text-[11px] text-[#C6C6C8]">Soli.</span><span class="text-black">${jor.totals?.solicitudes || 0}</span></div>
              <div class="flex flex-col items-center min-w-[40px]"><span class="text-[11px] text-[#C6C6C8]">Capt.</span><span class="text-black">${jor.totals?.captados || 0}</span></div>
              <div class="flex flex-col items-center min-w-[40px]"><span class="text-[11px] text-[#C6C6C8]">Info.</span><span class="text-black">${jor.totals?.llamadasInfo || 0}</span></div>
              <div class="flex flex-col items-center min-w-[40px]"><span class="text-[11px] text-[#C6C6C8]">Agen.</span><span class="text-black">${jor.totals?.llamadasAgenda || 0}</span></div>
              <div class="flex flex-col items-center min-w-[40px]"><span class="text-[11px] text-[#C6C6C8]">Vol.</span><span class="text-black">${jor.totals?.volantes || 0}</span></div>
            </div>
            <div class="mt-3 pt-3 border-t border-[#E5E5EA] grid grid-cols-2 gap-2">
              <button onclick="showHistoryDetail('${encodeURIComponent(JSON.stringify(jor))}')" class="flex items-center justify-center gap-2 py-2.5 bg-[#F2F2F7] rounded-xl text-[13px] font-semibold text-[#3A3A3C] active:scale-[0.98] transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                Ver Detalles
              </button>
              <button onclick="sendHistoryReportToWhatsapp('${encodeURIComponent(jor.reporteWhatsapp || '')}')" class="flex items-center justify-center gap-2 py-2.5 bg-[#25D366] rounded-xl text-[13px] font-semibold text-white active:scale-[0.98] transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                Enviar WhatsApp
              </button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
    } // end filteredHistory.length > 0
  }

  return `
    <div class="px-6 py-10 pb-28">
      <header class="mb-4">
        <h1 class="text-3xl font-bold tracking-tight text-black mb-1">Historial</h1>
        <p class="text-[#8E8E93]">Tus jornadas pasadas</p>
      </header>

      ${historyHtml}

      ${renderBottomTabs('history')}
    </div>
  `;
}

// ------------- GLOBALS PARA UI -------------
window.getGeoStatesOptionsHTML = function() {
  return Object.keys(appState.geoHierarchy).sort().map(e => `<option value="${e}">${e}</option>`).join('');
};

window.renderLocationBlock = function(idx) {
  const estOpts = window.getGeoStatesOptionsHTML();
  return `
    <div class="location-block bg-[#F2F2F7] p-4 rounded-xl border border-[#E5E5EA] shadow-sm flex flex-col gap-4 relative mt-3" data-index="${idx}">
      ${idx > 0 ? `<button type="button" class="btn-remove-loc absolute -top-3 -right-3 bg-[#FF3B30] text-white rounded-full p-1.5 shadow-md hover:bg-red-600 transition-colors z-10"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>` : ''}
      
      <!-- Fila 1: Estado y Municipio -->
      <div class="flex gap-4">
        <div class="w-1/2">
          <label class="ios-label">Estado</label>
          <div class="relative w-full text-black h-[48px] custom-dropdown-container">
            <select class="hidden-real-select loc-estado" required>
              <option value="" disabled selected>Seleccione...</option>
              ${estOpts}
            </select>
            <button type="button" class="w-full h-full bg-white border border-[#E5E5EA] rounded-xl px-4 flex justify-between items-center transition-all duration-200 hover:bg-[#F2F2F7] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 custom-dd-btn">
              <span class="custom-dd-text text-[#8E8E93] truncate max-w-[120px]">Seleccione...</span>
              <svg class="h-4 w-4 text-[#8E8E93] transition-transform duration-200 custom-dd-icon flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div class="absolute z-50 w-[200px] mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible scale-95 origin-top transition-all duration-200 overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options hidden"></div>
          </div>
        </div>
        <div class="w-1/2">
          <label class="ios-label">Municipio</label>
          <div class="relative w-full text-black h-[48px] custom-dropdown-container">
            <select class="hidden-real-select loc-municipio" required disabled>
              <option value="" disabled selected>Esperando...</option>
            </select>
            <button type="button" class="w-full h-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn pointer-events-none opacity-60">
              <span class="custom-dd-text text-[#8E8E93] truncate max-w-[120px]">Esperando...</span>
              <svg class="h-4 w-4 text-[#8E8E93] transition-transform duration-200 custom-dd-icon flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div class="absolute z-50 right-0 w-[200px] mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible scale-95 origin-top transition-all duration-200 overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options hidden"></div>
          </div>
        </div>
      </div>

      <!-- Fila 2: Parroquia y Sector -->
      <div class="flex gap-4">
        <div class="w-1/2">
          <label class="ios-label">Parroquia</label>
          <div class="relative w-full text-black h-[48px] custom-dropdown-container">
            <select class="hidden-real-select loc-parroquia" required disabled>
              <option value="" disabled selected>Esperando...</option>
            </select>
            <button type="button" class="w-full h-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn pointer-events-none opacity-60">
              <span class="custom-dd-text text-[#8E8E93] truncate max-w-[120px]">Esperando...</span>
              <svg class="h-4 w-4 text-[#8E8E93] transition-transform duration-200 custom-dd-icon flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div class="absolute z-50 w-[200px] mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible scale-95 origin-top transition-all duration-200 overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options hidden"></div>
          </div>
        </div>
        <div class="w-1/2">
          <label class="ios-label">Sector</label>
          <div class="relative w-full text-black h-[48px] custom-dropdown-container">
            <select class="hidden-real-select loc-sector" required disabled>
              <option value="" disabled selected>Esperando...</option>
            </select>
            <button type="button" class="w-full h-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn pointer-events-none opacity-60">
              <span class="custom-dd-text text-[#8E8E93] truncate max-w-[120px]">Esperando...</span>
              <svg class="h-4 w-4 text-[#8E8E93] transition-transform duration-200 custom-dd-icon flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div class="absolute z-50 right-0 w-[200px] mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible scale-95 origin-top transition-all duration-200 overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options hidden"></div>
          </div>
        </div>
      </div>
    </div>
  `;
};

// Helper to setup cascading dropdowns for a 4-level hierarchy
window.setupGeoCascading = function(block, hierarchy) {
  const selEstado = block.querySelector('.loc-estado');
  const selMunicipio = block.querySelector('.loc-municipio');
  const selParroquia = block.querySelector('.loc-parroquia');
  const selSector = block.querySelector('.loc-sector');

  function resetSelect(sel, text = "Esperando...") {
    sel.innerHTML = `<option value="" disabled selected>${text}</option>`;
    sel.disabled = true;
    sel.dispatchEvent(new Event('refreshCustomUI'));
  }

  // Estado Change
  selEstado?.addEventListener('change', () => {
    const est = selEstado.value;
    const municipios = hierarchy[est] ? Object.keys(hierarchy[est]).sort() : [];
    
    if (municipios.length > 0) {
      selMunicipio.innerHTML = '<option value="" disabled selected>Seleccione...</option>' + 
        municipios.map(m => `<option value="${m}">${m}</option>`).join('');
      selMunicipio.disabled = false;
    } else {
      resetSelect(selMunicipio);
    }
    resetSelect(selParroquia);
    resetSelect(selSector);
    selMunicipio.dispatchEvent(new Event('refreshCustomUI'));
  });

  // Municipio Change
  selMunicipio?.addEventListener('change', () => {
    const est = selEstado.value;
    const mun = selMunicipio.value;
    const parroquias = hierarchy[est] && hierarchy[est][mun] ? Object.keys(hierarchy[est][mun]).sort() : [];
    
    if (parroquias.length > 0) {
      selParroquia.innerHTML = '<option value="" disabled selected>Seleccione...</option>' + 
        parroquias.map(p => `<option value="${p}">${p}</option>`).join('');
      selParroquia.disabled = false;
    } else {
      resetSelect(selParroquia);
    }
    resetSelect(selSector);
    selParroquia.dispatchEvent(new Event('refreshCustomUI'));
  });

  // Parroquia Change
  selParroquia?.addEventListener('change', () => {
    const est = selEstado.value;
    const mun = selMunicipio.value;
    const par = selParroquia.value;
    const sectores = hierarchy[est] && hierarchy[est][mun] && hierarchy[est][mun][par] ? hierarchy[est][mun][par].sort() : [];
    
    if (sectores.length > 0) {
      selSector.innerHTML = '<option value="" disabled selected>Seleccione...</option>' + 
        sectores.map(s => `<option value="${s}">${s}</option>`).join('');
      selSector.disabled = false;
    } else {
      resetSelect(selSector);
    }
    selSector.dispatchEvent(new Event('refreshCustomUI'));
  });
};

function renderForm() {
  const now = new Date();
  // Venezuela time for default value (must be HH:MM for <input type="time">)
  const timeDefault = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Caracas',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(now);

  return `
    <div class="px-6 py-8 pb-10 bg-white min-h-screen">
      <header class="flex flex-col items-center justify-center mb-6 pb-4 border-b border-[#E5E5EA]">
        <div class="flex items-center justify-between w-full mb-3">
          <button id="btnCancel" class="text-[#007AFF] font-medium text-lg active:opacity-70 transition-opacity">Cancelar</button>
          <h2 class="text-lg font-semibold text-black">Nueva Actividad</h2>
          <div class="w-[74px]"></div> <!-- Spacer to balance flex centering -->
        </div>

        <!-- Notification chip for newly added activities (hidden by default) -->
        <div id="addedActivitiesChip" class="hidden w-full bg-[#E8F5E9] border border-[#C8E6C9] p-3 rounded-xl flex items-center gap-3 animate-pulse transition-all">
          <div class="w-8 h-8 rounded-full bg-[#34C759] flex items-center justify-center text-white shrink-0">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-bold text-[#2E7D32]" id="chipCountTitle">1 Actividad Añadida</span>
            <span class="text-xs text-[#2E7D32]/80" id="chipDescTitle">Lista para guardar al volver al inicio.</span>
          </div>
        </div>
      </header>
      
      <form id="activityForm" class="space-y-6">
        
        <!-- Tiempo (y Asesor Readonly Visual) -->
        <fieldset class="space-y-4">
          <div class="space-y-4">
            <div>
              <label class="ios-label">Hora</label>
              <input type="text" id="fTime" value="${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}" readonly class="ios-input bg-[#F2F2F7] text-[#8E8E93] cursor-default pointer-events-none">
            </div>
            <div>
              <label class="ios-label">Asesor</label>
              <input type="text" value="${appState.currentAsesor}" readonly class="ios-input bg-[#F2F2F7] text-[#8E8E93] font-semibold cursor-default pointer-events-none">
            </div>
          </div>
        </fieldset>

        <!-- Tipo Actividad -->
        <fieldset>
          <label class="ios-label">Tipo de Actividad</label>
          <div class="relative w-full text-black h-[48px] custom-dropdown-container">
            <select id="fType" required class="hidden-real-select">
              <option value="" disabled selected>Seleccionar...</option>
              <option value="Visita a Condominio">Visita a Condominio</option>
              <option value="Recorrido (Solo)">Recorrido (Solo)</option>
              <option value="Recorrido con Instaladores">Recorrido con Instaladores</option>
              <option value="Recorrido con Distribución">Recorrido con Distribución</option>
              <option value="Stand Publicitario">Stand Publicitario</option>
              <option value="Iglu Publicitario">Iglu Publicitario</option>
              <option value="Caravana">Caravana</option>
            </select>
            <button type="button" class="w-full h-full bg-white border border-[#E5E5EA] rounded-xl px-4 flex justify-between items-center transition-all duration-200 hover:bg-[#F2F2F7] focus:outline-none focus:ring-2 focus:ring-[#007AFF]/50 custom-dd-btn">
              <span class="custom-dd-text text-[#8E8E93]">Seleccionar...</span>
              <svg class="h-4 w-4 text-[#8E8E93] transition-transform duration-200 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible scale-95 origin-top transition-all duration-200 overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options hidden"></div>
          </div>
        </fieldset>

        <!-- Toggle Llamadas -->
        <label for="fPhoneContact" class="bg-white p-4 rounded-xl border border-[#E5E5EA] flex items-center justify-between shadow-sm cursor-pointer" id="toggleCallRow">
          <span class="text-sm font-medium text-[#3A3A3C] select-none pr-4 leading-tight">
            ¿Recibiste llamadas o un cliente te contactó mientras te encontrabas en esta actividad?
          </span>
          <div class="relative shrink-0 w-12 h-7">
            <input type="checkbox" id="fPhoneContact" class="peer sr-only">
            <div class="block w-full h-full bg-[#E5E5EA] peer-checked:bg-[#34C759] rounded-full transition-colors duration-300"></div>
            <div class="absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 peer-checked:translate-x-5"></div>
          </div>
        </label>

        <!-- Sub-marco de llamadas (Hidden) -->
        <fieldset id="phoneMetricsContainer" class="hidden bg-[#F8F8F8] p-4 rounded-xl space-y-4 border border-[#E5E5EA]">
          <h3 class="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">Clientes atendidos por llamada</h3>
          <div class="flex flex-col gap-1 w-full">
            <label class="ios-label">Solo buscan información</label>
            <input type="number" id="fPhoneInfo" min="0" placeholder="0" class="ios-input focus:bg-white">
          </div>
          <div class="flex flex-col gap-1 w-full">
            <label class="ios-label">Confirmados para agendar</label>
            <input type="number" id="fPhoneAgenda" min="0" placeholder="0" class="ios-input focus:bg-white">
          </div>
        </fieldset>

        <!-- Métricas Principales Dinámicas -->
        <fieldset class="bg-[#F2F2F7] p-4 rounded-xl space-y-4 shadow-sm border border-[#E5E5EA]" id="metricsContainer">
          <h3 class="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">Métricas de la Actividad</h3>
          
          <div id="mCondominio" class="flex flex-col gap-1 w-full hidden">
            <label class="ios-label">Nombre del Condominio</label>
            <input type="text" id="fCondominio" placeholder="Ej. Res. El Parque" class="ios-input focus:bg-white">
          </div>

          <div id="mVolantes" class="flex flex-col gap-1 w-full hidden">
            <label class="ios-label">Volantes Entregados</label>
            <input type="number" id="fVolantes" min="0" placeholder="0" class="ios-input focus:bg-white">
          </div>

          <div id="mCaptados" class="flex flex-col gap-1 w-full hidden">
            <label class="ios-label">Clientes Captados</label>
            <input type="number" id="fCaptados" min="0" placeholder="0" class="ios-input focus:bg-white">
          </div>
          
          <div id="mSolicitudes" class="flex flex-col gap-1 w-full hidden">
            <label class="ios-label">Solicitudes Enviadas (Confirmados)</label>
            <input type="number" id="fSolicitudes" min="0" placeholder="0" class="ios-input focus:bg-white">
          </div>
        </fieldset>

        <!-- Ubicación Dinámica -->
        <fieldset id="locationsContainer" class="space-y-0">
          <h3 class="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 hidden" id="locTitle">Ubicación(es) Visitada(s)</h3>
          <!-- JS renders blocks here -->
        </fieldset>
        
        <div class="flex justify-center hidden" id="btnAddLocWrapper">
          <button type="button" id="btnAddLocation" class="ios-btn-secondary !py-2.5 !text-[#007AFF] !border-transparent hover:!bg-[#E5E5EA] w-auto px-5 rounded-full text-sm">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
             </svg>
             Añadir otro sector
          </button>
        </div>

        <!-- Notas -->
        <fieldset>
          <label class="ios-label">Observaciones (Opcional)</label>
          <textarea id="fNotes" rows="3" placeholder="Detalles extra..." class="ios-input resize-y min-h-[80px]"></textarea>
        </fieldset>

        <!-- Botones de Acción -->
        <div class="pt-4 flex flex-col gap-3">
          <button type="submit" name="action" value="add_another" class="ios-btn-secondary !text-[#007AFF] !border-[#007AFF]/20 hover:!bg-[#007AFF]/5">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Añadir Otra Actividad
          </button>
          <button type="submit" name="action" value="save_return" class="ios-btn-primary bg-[#007AFF] hover:bg-[#005bb5]">Guardar y Volver al Inicio</button>
        </div>
      </form>
    </div>
  `;
}

function attachFormEvents() {
  document.getElementById('btnCancel')?.addEventListener('click', () => {
    appState.currentView = 'activities_panel';
    render();
  });

  const typeSelect = document.getElementById('fType');
  const metricsContainer = document.getElementById('metricsContainer');

  const locContainer = document.getElementById('locationsContainer');
  // Initialize the first block on render
  locContainer.innerHTML = '<h3 class="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 hidden" id="locTitle">Ubicación(es) Visitada(s)</h3>' + window.renderLocationBlock(0);
  
  // Setup cascading for initial block
  const initialBlock = locContainer.querySelector('.location-block');
  if(initialBlock) window.setupGeoCascading(initialBlock, appState.geoHierarchy);

  const metricDoms = {
    condominio: document.getElementById('mCondominio'),
    volantes: document.getElementById('mVolantes'),
    captados: document.getElementById('mCaptados'),
    solicitudes: document.getElementById('mSolicitudes')
  };
  const metricInputs = {
    condominio: document.getElementById('fCondominio'),
    volantes: document.getElementById('fVolantes'),
    captados: document.getElementById('fCaptados'),
    solicitudes: document.getElementById('fSolicitudes')
  };
  
  const btnAddLocWrapper = document.getElementById('btnAddLocWrapper');
  const locTitle = document.getElementById('locTitle');

  const fPhoneContact = document.getElementById('fPhoneContact');
  const phoneMetricsContainer = document.getElementById('phoneMetricsContainer');
  const fPhoneInfo = document.getElementById('fPhoneInfo');
  const fPhoneAgenda = document.getElementById('fPhoneAgenda');

  fPhoneContact?.addEventListener('change', (e) => {
    if (e.target.checked) {
      phoneMetricsContainer.classList.remove('hidden');
      fPhoneInfo.required = true;
      fPhoneAgenda.required = true;
    } else {
      phoneMetricsContainer.classList.add('hidden');
      fPhoneInfo.required = false;
      fPhoneAgenda.required = false;
      fPhoneInfo.value = '';
      fPhoneAgenda.value = '';
    }
  });

  const toggleCallRow = document.getElementById('toggleCallRow');
  const fNotesFieldset = document.getElementById('fNotes').closest('fieldset');

  function updateFormFields(val) {
    if(!val) {
       metricsContainer.classList.add('hidden');
       btnAddLocWrapper.classList.add('hidden');
       locTitle.classList.add('hidden');
       
       toggleCallRow?.classList.add('hidden');
       phoneMetricsContainer?.classList.add('hidden');
       locContainer?.classList.add('hidden');
       fNotesFieldset?.classList.add('hidden');
       return;
    }
    
    metricsContainer.classList.remove('hidden');
    toggleCallRow?.classList.remove('hidden');
    locContainer?.classList.remove('hidden');
    fNotesFieldset?.classList.remove('hidden');
    
    if (fPhoneContact?.checked) {
       phoneMetricsContainer?.classList.remove('hidden');
    } else {
       phoneMetricsContainer?.classList.add('hidden');
    }

    // Reset conditionals
    metricDoms.condominio.classList.add('hidden');
    metricInputs.condominio.required = false;
    
    // Always visible when activity is selected
    metricDoms.captados.classList.remove('hidden');
    metricDoms.solicitudes.classList.remove('hidden');
    metricDoms.volantes.classList.remove('hidden');   // Volantes now always shown
    metricInputs.captados.required = true;
    metricInputs.solicitudes.required = true;
    metricInputs.volantes.required = false; // optional

    // Specific logic
    if (val === 'Visita a Condominio') {
      metricDoms.condominio.classList.remove('hidden');
      metricInputs.condominio.required = true;
    }

    // Multi location logic
    const multiLocAllowed = ['Recorrido con Instaladores', 'Recorrido con Distribución', 'Caravana'].includes(val);
    if (multiLocAllowed) {
      btnAddLocWrapper.classList.remove('hidden');
      locTitle.classList.remove('hidden');
    } else {
      btnAddLocWrapper.classList.add('hidden');
      locTitle.classList.add('hidden');
      // Clean up extra locations
      const extraLocs = document.querySelectorAll('.location-block');
      extraLocs.forEach(el => {
          if(el.getAttribute('data-index') !== '0') el.remove();
      });
    }
  }

  updateFormFields(typeSelect?.value);

  typeSelect?.addEventListener('change', function() {
      updateFormFields(this.value);
  });

  // Cascading logic is now handled per block via setupGeoCascading
  
  // Remove location
  locContainer?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-remove-loc');
    if (btn) {
      const block = btn.closest('.location-block');
      if (block) block.remove();
    }
  });

  // Add location
  document.getElementById('btnAddLocation')?.addEventListener('click', () => {
    const existingCount = locContainer.querySelectorAll('.location-block').length;
    // Generate unique index based on timestamp to avoid collision
    const nextIdx = Date.now();
    const locHtml = window.renderLocationBlock(nextIdx);
    locContainer.insertAdjacentHTML('beforeend', locHtml);
    
    // Find the newly added block
    const newBlock = locContainer.querySelector(`.location-block[data-index="${nextIdx}"]`);
    if(newBlock) window.setupGeoCascading(newBlock, appState.geoHierarchy);

    initCustomFormDropdowns();
  });

  const form = document.getElementById('activityForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Gather locations (4 levels)
    const ubicaciones = [];
    document.querySelectorAll('.location-block').forEach(block => {
      ubicaciones.push({
        estado: block.querySelector('.loc-estado').value || '',
        municipio: block.querySelector('.loc-municipio').value || '',
        parroquia: block.querySelector('.loc-parroquia').value || '',
        sector: block.querySelector('.loc-sector').value || ''
      });
    });

    // Checkbox data
    const receivedCalls = document.getElementById('fPhoneContact').checked;
    
    // Simplified time handler: if already formatted, return as is.
    function formatTimeValue(val) {
      if (!val) return '';
      // If it already has am/pm, just return it
      if (val.toLowerCase().includes('m.')) return val;
      
      const [hStr, mStr] = val.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr;
      const period = h >= 12 ? 'p. m.' : 'a. m.';
      h = h % 12 || 12;
      return `${h}:${m} ${period}`;
    }

    // ── Duplicate sector validation (por tipo de actividad) ────────────────
    // La misma combinación de tipo + parroquia + sector no puede repetirse en la misma jornada
    const currentType = document.getElementById('fType').value;
    const usedLocations = new Set();
    appState.activities.forEach(act => {
      (act.ubicaciones || []).forEach(loc => {
        if (act.activityType && loc.parroquia && loc.sector && loc.sector !== 'N/A') {
          usedLocations.add(`${act.activityType}|||${loc.parroquia}|||${loc.sector}`);
        }
      });
    });

    const duplicates = ubicaciones.filter(loc =>
      loc.parroquia && loc.sector && loc.sector !== 'N/A' &&
      usedLocations.has(`${currentType}|||${loc.parroquia}|||${loc.sector}`)
    );

    if (duplicates.length > 0) {
      const names = duplicates.map(d => `${d.parroquia} – ${d.sector}`).join(', ');
      showToast(`⚠️ Ya registraste "${currentType}" en: ${names}. Edita esa actividad en vez de crear una nueva.`, 'error');
      return; // Block submission
    }
    // ──────────────────────────────────────────────────────────────────────

    const activity = {
      uid: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      time: formatTimeValue(document.getElementById('fTime').value),
      date: new Date().toLocaleDateString('es-VE'), // Consistent date for sync
      asesor: appState.currentAsesor,
      activityType: document.getElementById('fType').value,
      ubicaciones: ubicaciones,
      clientesCaptados: metricInputs.captados.value || 0,
      solicitudes: metricInputs.solicitudes.value || 0,
      condominio: metricInputs.condominio.value || '',
      volantes: metricInputs.volantes.value || 0,
      receivedCalls: receivedCalls,
      llamadasInfo: receivedCalls ? (fPhoneInfo.value || 0) : 0,
      llamadasAgenda: receivedCalls ? (fPhoneAgenda.value || 0) : 0,
      notes: document.getElementById('fNotes').value.trim()
    };

    appState.activities.push(activity);
    saveActivities();
    
    // Push to Google Sheets in real-time
    // syncActivity is now disabled for real-time saving as per user request
    // await syncActivity(activity, 'ADD');

    const submitterValue = e.submitter ? e.submitter.value : 'save_return';
    if(submitterValue === 'add_another') {
        // Clear fields
        document.getElementById('fType').value = "";
        metricInputs.captados.value = "";
        metricInputs.solicitudes.value = "";
        metricInputs.condominio.value = "";
        metricInputs.volantes.value = "";
        
        document.getElementById('fPhoneContact').checked = false;
        fPhoneContact.dispatchEvent(new Event('change'));
        document.getElementById('fNotes').value = "";

        // Reset locations
        locContainer.innerHTML = '<h3 class="text-xs font-semibold text-[#8E8E93] uppercase tracking-wider mb-2 hidden" id="locTitle">Ubicación(es) Visitada(s)</h3>' + window.renderLocationBlock(0);
        
        const typeSelectObj = document.getElementById('fType');
        updateFormFields(null);
        typeSelectObj.dispatchEvent(new Event('refreshCustomUI'));
        initCustomFormDropdowns();

        // Visual feedback / Chip Logic
        let unsavedCountElement = document.getElementById('chipCountTitle');
        let chipRoot = document.getElementById('addedActivitiesChip');
        
        let totalC = appState.activities.length;
        unsavedCountElement.innerText = `${totalC} Actividad${totalC > 1 ? 'es' : ''} Añadida${totalC > 1 ? 's' : ''}`;
        chipRoot.classList.remove('hidden');
        chipRoot.classList.remove('animate-pulse');
        void chipRoot.offsetWidth; // trigger reflow
        chipRoot.classList.add('animate-pulse');

        const btnTag = document.querySelector('button[value="add_another"]');
        const ogText = btnTag.innerHTML;
        btnTag.innerHTML = `✓ Listo, Añade Otra`;
        btnTag.classList.add('!bg-[#E8F5E9]', '!text-[#2E7D32]', '!border-[#C8E6C9]');
        setTimeout(() => {
          btnTag.innerHTML = ogText;
          btnTag.classList.remove('!bg-[#E8F5E9]', '!text-[#2E7D32]', '!border-[#C8E6C9]');
        }, 2000);

    } else {
        appState.currentView = 'activities_panel';
        render();
    }
  });

  initCustomFormDropdowns();
}

// ----------------- DROPDOWN SYSTEM -----------------
function initCustomFormDropdowns() {
    const container = document.getElementById('activityForm');
    if(container) {
      container.querySelectorAll('.custom-dropdown-container:not(.initialized)').forEach(dd => {
         dd.classList.add('initialized');
         const realSelect = dd.querySelector('select');
         const btn = dd.querySelector('.custom-dd-btn');
         const textSpan = dd.querySelector('.custom-dd-text');
         const icon = dd.querySelector('.custom-dd-icon');
         const optionsContainer = dd.querySelector('.custom-dd-options');
         let isOpen = false;
         
         function renderOpt() {
           const optionsHTML = Array.from(realSelect.options).map(opt => {
              if (opt.disabled) return '';
              const isSelected = opt.selected || opt.value === realSelect.value;
              return `<button type="button" data-value="${opt.value}" class="custom-dd-option w-full text-left px-4 py-3 text-[14px] hover:bg-[#F2F2F7] transition-colors flex justify-between items-center group"><span class="${isSelected ? 'font-semibold text-[#007AFF]' : 'text-[#3A3A3C] group-hover:text-black'}">${opt.text}</span></button>`;
           }).join('');
           optionsContainer.innerHTML = `<div class="py-1">${optionsHTML}</div>`;
           optionsContainer.querySelectorAll('.custom-dd-option').forEach(optBtn => {
             optBtn.addEventListener('click', (ev) => {
               ev.stopPropagation();
               realSelect.value = optBtn.getAttribute('data-value');
               realSelect.dispatchEvent(new Event('change', { bubbles: true }));
               updateVis();
               toggleDd();
             });
           });
         }

         function updateVis() {
           const selectedOpt = realSelect.options[realSelect.selectedIndex];
           if(!selectedOpt || selectedOpt.disabled || !realSelect.value) {
               textSpan.textContent = realSelect.options[0]?.text || "Seleccionar...";
               textSpan.classList.add('text-[#8E8E93]');
               textSpan.classList.remove('font-medium', 'text-black');
           } else {
               textSpan.textContent = selectedOpt.text;
               textSpan.classList.remove('text-[#8E8E93]');
               textSpan.classList.add('font-medium', 'text-black');
           }
           if(realSelect.disabled) {
              btn.classList.add('bg-[#F2F2F7]', 'pointer-events-none', 'opacity-60', 'border-transparent');
              btn.classList.remove('bg-white', 'hover:bg-[#F2F2F7]', 'border-[#E5E5EA]', 'ring-2', 'ring-[#007AFF]/20');
           } else {
              btn.classList.remove('bg-[#F2F2F7]', 'pointer-events-none', 'opacity-60', 'border-transparent');
              btn.classList.add('bg-white', 'border-[#E5E5EA]', 'hover:bg-[#F2F2F7]');
           }
         }

         function toggleDd() {
           if(realSelect.disabled) return;
           isOpen = !isOpen;
           if (isOpen) {
             document.querySelectorAll('.custom-dd-options:not(.hidden)').forEach(el => {
               if(el !== optionsContainer) {
                   el.classList.add('hidden', 'opacity-0', 'invisible', 'scale-95');
                   el.classList.remove('opacity-100', 'visible', 'scale-100');
               }
             });
             renderOpt();
             optionsContainer.classList.remove('hidden');
             void optionsContainer.offsetWidth; // trigger reflow
             optionsContainer.classList.remove('opacity-0', 'invisible', 'scale-95');
             optionsContainer.classList.add('opacity-100', 'visible', 'scale-100');
             icon.classList.add('rotate-180');
             btn.classList.add('border-[#007AFF]', 'ring-2', 'ring-[#007AFF]/20');
           } else {
             optionsContainer.classList.remove('opacity-100', 'visible', 'scale-100');
             optionsContainer.classList.add('opacity-0', 'invisible', 'scale-95');
             icon.classList.remove('rotate-180');
             btn.classList.remove('border-[#007AFF]', 'ring-2', 'ring-[#007AFF]/20');
             setTimeout(() => optionsContainer.classList.add('hidden'), 200);
           }
         }
         
         const existingListener = btn.onclick;
         if(!existingListener) {
            btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); toggleDd(); });
            realSelect.addEventListener('refreshCustomUI', () => updateVis());
            document.addEventListener('click', (ev) => { if (isOpen && !dd.contains(ev.target)) toggleDd(); });
         }
         
         updateVis();
      });
    }
}

// ----------------- SOLICITUD FORM VIEW -----------------

function renderSolicitudForm() {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];

  return `
    <div class="px-6 py-8 pb-10 bg-white min-h-screen">
      <header class="flex flex-col items-center justify-center mb-6 pb-4 border-b border-[#E5E5EA]">
        <div class="flex items-center justify-between w-full mb-3">
          <button id="btnCancelSolicitud" class="text-[#007AFF] font-medium text-lg active:opacity-70 transition-opacity">Cancelar</button>
          <h2 class="text-lg font-semibold text-black">Nueva Solicitud</h2>
          <div class="w-[74px]"></div> <!-- Spacer to balance flex centering -->
        </div>
      </header>
      
      <form id="solicitudForm" class="space-y-6">
        
        <!-- Fechas y Promotor -->
        <fieldset class="space-y-4">
          <div class="space-y-4">
            <div>
              <label class="ios-label">Fecha de Solicitud (Actual)</label>
              <input type="date" id="sFechaSoli" value="${dateStr}" required readonly class="ios-input bg-[#F2F2F7] text-[#8E8E93] cursor-default pointer-events-none">
            </div>
            <div>
              <label class="ios-label">Promotor/a</label>
              <input type="text" id="sPromotor" value="${appState.currentAsesor}" readonly class="ios-input bg-[#F2F2F7] text-[#8E8E93] font-semibold cursor-default pointer-events-none">
            </div>
          </div>
          <div>
            <label class="ios-label">Fecha de Disponibilidad</label>
            <input type="date" id="sFechaDisp" required class="ios-input focus:bg-white text-black bg-[#F8F8F8]">
          </div>
        </fieldset>

        <hr class="border-[#E5E5EA]">

        <!-- Datos del Cliente -->
        <fieldset class="space-y-4">
          <h3 class="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Datos del Cliente</h3>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="ios-label">Nombres</label>
              <input type="text" id="sNombres" required class="ios-input focus:bg-white text-black bg-[#F8F8F8]">
            </div>
            <div>
              <label class="ios-label">Apellidos</label>
              <input type="text" id="sApellidos" required class="ios-input focus:bg-white text-black bg-[#F8F8F8]">
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-3">
            <div class="flex gap-2 relative">
              <div class="w-1/3 relative custom-dropdown-container">
                <select id="sCedulaTipo" required class="hidden-real-select">
                  <option value="V-">V-</option>
                  <option value="E-">E-</option>
                  <option value="J-">J-</option>
                </select>
                <button type="button" class="w-full h-[48px] bg-[#F8F8F8] border border-[#E5E5EA] rounded-xl flex justify-center items-center custom-dd-btn">
                  <span class="custom-dd-text font-medium text-black">V-</span>
                </button>
                <div class="absolute z-50 w-[80px] mt-1.5 bg-white border border-[#E5E5EA] rounded-xl shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden custom-dd-options"></div>
              </div>
              <div class="w-2/3">
                <label class="ios-label absolute -top-6 left-0">Cédula/RIF</label>
                <input type="text" id="sCedulaNum" required pattern="[0-9]*" inputmode="numeric" class="ios-input focus:bg-white text-black bg-[#F8F8F8]">
              </div>
            </div>
            <div>
              <label class="ios-label">Género</label>
              <div class="relative w-full text-black h-[48px] custom-dropdown-container">
                <select id="sGenero" required class="hidden-real-select">
                  <option value="" disabled selected>Elegir...</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
                <button type="button" class="w-full h-full bg-[#F8F8F8] border border-[#E5E5EA] rounded-xl px-4 flex justify-between items-center transition-all duration-200 hover:bg-white custom-dd-btn">
                  <span class="custom-dd-text text-[#8E8E93]">Elegir...</span>
                  <svg class="h-4 w-4 text-[#8E8E93] transition-transform duration-200 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden custom-dd-options"></div>
              </div>
            </div>
          </div>

          <div>
            <label class="ios-label">Fecha de Nacimiento</label>
            <input type="date" id="sFechaNac" class="ios-input focus:bg-white text-black bg-[#F8F8F8]">
          </div>
        </fieldset>

        <hr class="border-[#E5E5EA]">

        <!-- Ubicación -->
        <fieldset class="space-y-4">
          <h3 class="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Ubicación</h3>
          
          <div>
            <label class="ios-label">Estado</label>
            <div class="relative w-full text-black h-[48px] custom-dropdown-container">
              <select id="sEstado" required class="hidden-real-select loc-estado">
                <option value="" disabled selected>Seleccione...</option>
                ${Object.keys(appState.geoHierarchy).sort().map(e => `<option value="${e}">${e}</option>`).join('')}
              </select>
              <button type="button" class="w-full h-full bg-[#F8F8F8] border border-[#E5E5EA] rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn">
                <span class="custom-dd-text text-[#8E8E93]">Seleccione...</span>
                <svg class="h-4 w-4 text-[#8E8E93] custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible hidden custom-dd-options"></div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="ios-label">Municipio</label>
              <div class="relative w-full text-black h-[48px] custom-dropdown-container">
                <select id="sMunicipio" required class="hidden-real-select loc-municipio" disabled>
                  <option value="" disabled selected>Esperando...</option>
                </select>
                <button type="button" class="w-full h-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn pointer-events-none opacity-60">
                  <span class="custom-dd-text text-[#8E8E93] truncate max-w-[90%]">Esperando...</span>
                  <svg class="h-4 w-4 text-[#8E8E93] custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options"></div>
              </div>
            </div>
            
            <div>
              <label class="ios-label">Parroquia</label>
              <div class="relative w-full text-black h-[48px] custom-dropdown-container">
                <select id="sParroquia" required class="hidden-real-select loc-parroquia" disabled>
                  <option value="" disabled selected>Esperando...</option>
                </select>
                <button type="button" class="w-full h-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn pointer-events-none opacity-60">
                  <span class="custom-dd-text text-[#8E8E93] truncate max-w-[90%]">Esperando...</span>
                  <svg class="h-4 w-4 text-[#8E8E93] shrink-0 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options"></div>
              </div>
            </div>
          </div>


          <div>
            <label class="ios-label">Sector</label>
            <div class="relative w-full text-black h-[48px] custom-dropdown-container">
              <select id="sSector" required class="hidden-real-select loc-sector" disabled>
                <option value="" disabled selected>Esperando...</option>
              </select>
              <button type="button" class="w-full h-full bg-[#F2F2F7] border border-transparent rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn pointer-events-none opacity-60">
                <span class="custom-dd-text text-[#8E8E93] truncate max-w-[90%]">Esperando...</span>
                <svg class="h-4 w-4 text-[#8E8E93] shrink-0 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options"></div>
            </div>
          </div>

          <div>
            <label class="ios-label">Calle / Casa / Apto</label>
            <textarea id="sDireccion" required rows="2" class="ios-input focus:bg-white text-black bg-[#F8F8F8] resize-none" placeholder="Ej: Res. Las Rosas, Torre B, Apto 24"></textarea>
          </div>
        </fieldset>

        <hr class="border-[#E5E5EA]">

        <!-- Servicio Técnico -->
        <fieldset class="space-y-4">
          <h3 class="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Detalles del Servicio</h3>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="ios-label">Tipo de Servicio</label>
              <div class="relative w-full text-black h-[48px] custom-dropdown-container" id="ddTipoSrv">
                <select id="sTipoServicio" required class="hidden-real-select">
                  <option value="Domiciliario" selected>Domiciliario</option>
                  <option value="Empresarial">Empresarial</option>
                </select>
                <button type="button" class="w-full h-full bg-[#F8F8F8] border border-[#E5E5EA] rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn">
                  <span class="custom-dd-text font-medium text-black">Domiciliario</span>
                  <svg class="h-4 w-4 text-[#8E8E93] custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible hidden custom-dd-options"></div>
              </div>
            </div>

            <div>
              <label class="ios-label">Power Go</label>
              <div class="relative w-full text-black h-[48px] custom-dropdown-container">
                <select id="sPowerGo" required class="hidden-real-select">
                  <option value="NO" selected>NO</option>
                  <option value="SI">SI</option>
                </select>
                <button type="button" id="btnPowerGo" class="w-full h-full bg-[#F8F8F8] border border-[#E5E5EA] rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn">
                  <span class="custom-dd-text font-medium text-black">NO</span>
                  <svg class="h-4 w-4 text-[#8E8E93] custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible hidden custom-dd-options"></div>
              </div>
            </div>
          </div>

          <div>
            <label class="ios-label">Plan</label>
            <div class="relative w-full text-black h-[48px] custom-dropdown-container">
              <select id="sPlan" required class="hidden-real-select">
                <option value="" disabled selected>Seleccione plan...</option>
                <!-- Opciones dinámicas base tipo de servicio -->
              </select>
              <button type="button" class="w-full h-full bg-[#F8F8F8] border border-[#E5E5EA] rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn">
                <span class="custom-dd-text text-[#8E8E93] truncate max-w-[90%]">Seleccione plan...</span>
                <svg class="h-4 w-4 text-[#8E8E93] shrink-0 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options"></div>
            </div>
          </div>
        </fieldset>

        <hr class="border-[#E5E5EA]">

        <!-- Contacto Adicional -->
        <fieldset class="space-y-4">
          <h3 class="text-xs font-bold text-[#8E8E93] uppercase tracking-wider mb-2">Contacto / Varios</h3>
          
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="ios-label">Teléfono Ppal.</label>
              <input type="tel" id="sTelefonoP" required placeholder="0414-0000000" class="ios-input focus:bg-white text-black bg-[#F8F8F8]">
            </div>
            <div>
              <label class="ios-label">Teléfono Sec. <span class="text-[#8E8E93] font-normal">(Opcional)</span></label>
              <input type="tel" id="sTelefonoS" placeholder="0412-0000000" class="ios-input focus:bg-white text-black bg-[#F8F8F8]">
            </div>
          </div>

          <div>
            <label class="ios-label">Correo Electrónico <span class="text-[#8E8E93] font-normal">(Opcional)</span></label>
            <input type="email" id="sCorreo" placeholder="cliente@correo.com" class="ios-input focus:bg-white text-black bg-[#F8F8F8]">
          </div>

          <div>
            <label class="ios-label">Fuente</label>
            <div class="relative w-full text-black h-[48px] custom-dropdown-container">
              <select id="sFuente" required class="hidden-real-select">
                <option value="" disabled selected>Seleccionar...</option>
                <option value="Volante">Volante</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook</option>
                <option value="Recorrido">Recorrido</option>
                <option value="Referido">Referido</option>
                <option value="Otro">Otro</option>
              </select>
              <button type="button" class="w-full h-full bg-[#F8F8F8] border border-[#E5E5EA] rounded-xl px-4 flex justify-between items-center transition-all duration-200 custom-dd-btn">
                <span class="custom-dd-text text-[#8E8E93]">Seleccionar...</span>
                <svg class="h-4 w-4 text-[#8E8E93] custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
              </button>
              <div class="absolute z-50 w-full mt-1.5 bg-white border border-[#E5E5EA] rounded-2xl shadow-xl opacity-0 invisible hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options"></div>
            </div>
          </div>

        </fieldset>

        <div class="pt-6">
          <button type="submit" class="ios-btn-primary shadow-lg shadow-[#007AFF]/20 w-full mb-3">Guardar y Enviar WhatsApp</button>
        </div>
      </form>
    </div>
  `;
}

function attachSolicitudEvents() {
  document.getElementById('btnCancelSolicitud')?.addEventListener('click', () => {
    appState.currentView = 'home';
    render();
  });

  const tipoSrv = document.getElementById('sTipoServicio');
  const planSelect = document.getElementById('sPlan');
  const powerGoSelect = document.getElementById('sPowerGo');

  function updatePlanes() {
    const tipo = tipoSrv.value;
    const availablePlanes = appState.planes.filter(p => !p.activo === false); // Filter only active ones
    const filtered = availablePlanes.filter(p => p.tipo === tipo);

    planSelect.innerHTML = '<option value="" disabled selected>Seleccione plan...</option>';
    
    if (filtered.length > 0) {
      filtered.forEach(p => {
        const opt = document.createElement('option');
        const displayName = p.nombre + (p.has_tv ? ' + TV' : '');
        opt.value = displayName;
        opt.textContent = displayName;
        planSelect.appendChild(opt);
      });
    } else {
      // Fallback
      const fallbackPlanes = tipo === 'Domiciliario' ? 
        ['400MB', '600MB', '1GB', '400MB + TV', '600MB + TV', '1GB + TV'] : 
        ['50MB', '100MB', '200MB', 'Plan Dedicado'];
        
      fallbackPlanes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        planSelect.appendChild(opt);
      });
    }

    if (tipo === 'Empresarial') {
      powerGoSelect.value = 'NO';
      powerGoSelect.disabled = true;
    } else {
      powerGoSelect.disabled = false;
    }

    planSelect.dispatchEvent(new Event('refreshCustomUI'));
    powerGoSelect.dispatchEvent(new Event('refreshCustomUI'));
  }

  tipoSrv?.addEventListener('change', updatePlanes);

  // Geographical Cascading (Unified)
  const geoBlock = document.getElementById('solicitudForm');
  if(geoBlock) window.setupGeoCascading(geoBlock, appState.geoHierarchy);
  
  // Prevent Custom dropdowns from failing if not instantly updated
  setTimeout(() => {
    // Only init inside this view to prevent double binding other forms
    const container = document.getElementById('solicitudForm');
    if(container) {
      container.querySelectorAll('.custom-dropdown-container:not(.initialized)').forEach(dd => {
         // Same initialization logic as in form
         dd.classList.add('initialized');
         const realSelect = dd.querySelector('select');
         const btn = dd.querySelector('.custom-dd-btn');
         const textSpan = dd.querySelector('.custom-dd-text');
         const icon = dd.querySelector('.custom-dd-icon');
         const optionsContainer = dd.querySelector('.custom-dd-options');
         let isOpen = false;
         
         function renderOpt() {
           const optionsHTML = Array.from(realSelect.options).map(opt => {
              if (opt.disabled) return '';
              const isSelected = opt.selected || opt.value === realSelect.value;
              return `<button type="button" data-value="${opt.value}" class="custom-dd-option w-full text-left px-4 py-3 text-[14px] hover:bg-[#F2F2F7] transition-colors flex justify-between items-center group"><span class="${isSelected ? 'font-semibold text-[#007AFF]' : 'text-[#3A3A3C] group-hover:text-black'}">${opt.text}</span></button>`;
           }).join('');
           optionsContainer.innerHTML = `<div class="py-1">${optionsHTML}</div>`;
           optionsContainer.querySelectorAll('.custom-dd-option').forEach(optBtn => {
             optBtn.addEventListener('click', (ev) => {
               ev.stopPropagation();
               realSelect.value = optBtn.getAttribute('data-value');
               realSelect.dispatchEvent(new Event('change', { bubbles: true }));
               updateVis();
               toggleDd();
             });
           });
         }

         function updateVis() {
           const selectedOpt = realSelect.options[realSelect.selectedIndex];
           if(!selectedOpt || selectedOpt.disabled || !realSelect.value) {
               textSpan.textContent = realSelect.options[0]?.text || "Elegir...";
               textSpan.classList.add('text-[#8E8E93]');
               textSpan.classList.remove('font-medium', 'text-black');
           } else {
               textSpan.textContent = selectedOpt.text;
               textSpan.classList.remove('text-[#8E8E93]');
               textSpan.classList.add('font-medium', 'text-black');
           }
           if(realSelect.disabled) {
              btn.classList.add('bg-[#F2F2F7]', 'pointer-events-none', 'opacity-60', 'border-transparent');
              btn.classList.remove('bg-white', 'hover:bg-white', 'border-[#E5E5EA]', 'ring-2', 'ring-[#007AFF]/20');
           } else {
              btn.classList.remove('bg-[#F2F2F7]', 'pointer-events-none', 'opacity-60', 'border-transparent');
              btn.classList.add('bg-[#F8F8F8]', 'border-[#E5E5EA]', 'hover:bg-white');
           }
         }

         function toggleDd() {
           if(realSelect.disabled) return;
           isOpen = !isOpen;
           if (isOpen) {
             document.querySelectorAll('.custom-dd-options:not(.hidden)').forEach(el => {
               if(el !== optionsContainer) {
                   el.classList.add('hidden', 'opacity-0', 'invisible', 'scale-95');
                   el.classList.remove('opacity-100', 'visible', 'scale-100');
               }
             });
             renderOpt();
             optionsContainer.classList.remove('hidden');
             void optionsContainer.offsetWidth; // trigger reflow
             optionsContainer.classList.remove('opacity-0', 'invisible', 'scale-95');
             optionsContainer.classList.add('opacity-100', 'visible', 'scale-100');
             icon.classList.add('rotate-180');
             btn.classList.add('border-[#007AFF]', 'ring-2', 'ring-[#007AFF]/20');
           } else {
             optionsContainer.classList.remove('opacity-100', 'visible', 'scale-100');
             optionsContainer.classList.add('opacity-0', 'invisible', 'scale-95');
             icon.classList.remove('rotate-180');
             btn.classList.remove('border-[#007AFF]', 'ring-2', 'ring-[#007AFF]/20');
             setTimeout(() => optionsContainer.classList.add('hidden'), 200);
           }
         }
         btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); toggleDd(); });
         realSelect.addEventListener('refreshCustomUI', () => updateVis());
         document.addEventListener('click', (ev) => { if (isOpen && !dd.contains(ev.target)) toggleDd(); });
         updateVis();
      });
      updatePlanes(); // Init first load
    }
  }, 10);

  // Form submit handler to validate and send to WA
  const formEl = document.getElementById('solicitudForm');
  formEl?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const btnSubmit = formEl.querySelector('button[type="submit"]');
    const ogText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = `<div class="h-5 w-5 border-2 border-white border-t-transparent flex-shrink-0 rounded-full animate-spin mx-auto"></div>`;
    btnSubmit.disabled = true;

    try {
      // 1. Recopilar datos
      const formData = {
        fecha_disp: document.getElementById('sFechaDisp').value,
        promotor: appState.currentAsesor,
        nombres: document.getElementById('sNombres').value.trim(),
        apellidos: document.getElementById('sApellidos').value.trim(),
        cedula: document.getElementById('sCedulaTipo').value + document.getElementById('sCedulaNum').value.trim(),
        genero: document.getElementById('sGenero').value,
        estado: document.getElementById('sEstado').value,
        municipio: document.getElementById('sMunicipio').value,
        parroquia: document.getElementById('sParroquia').value,
        sector: document.getElementById('sSector').value,
        direccion: document.getElementById('sDireccion').value.trim(),
        tipo_servicio: document.getElementById('sTipoServicio').value,
        plan: document.getElementById('sPlan').value,
        telefono_principal: document.getElementById('sTelefonoP').value.trim(),
        telefono_secundario: document.getElementById('sTelefonoS').value.trim(),
        correo: document.getElementById('sCorreo').value.trim(),
        power_go: document.getElementById('sPowerGo').value === 'SI',
        fecha_nacimiento: document.getElementById('sFechaNac').value || null,
        fuente: document.getElementById('sFuente').value
      };

      // 2. Guardar en Supabase
      const { data, error } = await supabase.from('solicitudes').insert([{
        fecha_disponibilidad: formData.fecha_disp,
        promotor: formData.promotor,
        nombres: formData.nombres,
        apellidos: formData.apellidos,
        cedula: formData.cedula,
        genero: formData.genero,
        estado: formData.estado,
        municipio: formData.municipio,
        parroquia: formData.parroquia,
        sector: formData.sector,
        direccion: formData.direccion,
        tipo_servicio: formData.tipo_servicio,
        plan: formData.plan,
        telefono_principal: formData.telefono_principal,
        telefono_secundario: formData.telefono_secundario || null,
        correo: formData.correo || null,
        power_go: formData.power_go,
        fecha_nacimiento: formData.fecha_nacimiento,
        fuente: formData.fuente
      }]);

      if (error) throw error;

      // 3. Generar Reporte de WhatsApp
      let formatDate = (dateString) => {
        if (!dateString) return '';
        const [y, m, d] = dateString.split('-');
        return `${d}/${m}/${y}`;
      };

      let todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
      
      let waMsg = `*Nueva Solicitud de Servicio*\n\n`;
      waMsg += `Fecha de solicitud: ${todayStr}\n`;
      waMsg += `Fecha de Disponibilidad: ${formatDate(formData.fecha_disp)}\n\n`;
      waMsg += `Nombres y Apellido: ${formData.nombres} ${formData.apellidos}\n`;
      waMsg += `Cédula/RIF: ${formData.cedula}\n`;
      waMsg += `Teléfono principal: ${formData.telefono_principal}\n`;
      waMsg += `Teléfono secundario: ${formData.telefono_secundario || formData.telefono_principal}\n`;
      waMsg += `Estado: ${formData.estado}, Municipio: ${formData.municipio}, Parroquia: ${formData.parroquia}, Sector: ${formData.sector}, Calle / Casa / Apto: ${formData.direccion}\n`;
      waMsg += `Tipo de Servicio: ${formData.plan} ${formData.tipo_servicio}\n`;
      waMsg += `Promotor/a: ${formData.promotor}\n`;
      waMsg += `Correo Electrónico: ${formData.correo || ''}\n`;
      waMsg += `Power Go: ${formData.power_go ? 'SI' : 'NO'}\n`;
      waMsg += `Fuente: ${formData.fuente}`;

      // Open WA
      window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`, '_blank');

      // 4. Reset & Return home
      showToast('Solicitud guardada correctamente', 'success');
      appState.currentView = 'home';
      render();

    } catch (err) {
      console.error('Error guardando solicitud:', err);
      showToast('Error al guardar la solicitud: ' + err.message, 'error');
      btnSubmit.innerHTML = ogText;
      btnSubmit.disabled = false;
    }
  });
}

// ----------------- WHATSAPP LOGIC -----------------

function buildWhatsappReport(activities, asesor, date) {
  const TAB = '   ';

  // Compute totals
  let totalSoli = 0, totalCap = 0, totalVol = 0, totalInfo = 0, totalAgenda = 0;
  activities.forEach(a => {
    totalSoli   += parseInt(a.solicitudes       || 0);
    totalCap    += parseInt(a.clientesCaptados  || 0);
    totalVol    += parseInt(a.volantes          || 0);
    totalInfo   += parseInt(a.llamadasInfo      || 0);
    totalAgenda += parseInt(a.llamadasAgenda    || 0);
  });

  let msg = '';
  msg += `REPORTE DIARIO\n`;
  msg += `Fecha:  ${date}\n`;
  msg += `Asesor: ${asesor}\n\n`;

  msg += `RESUMEN\n`;
  msg += `Solicitudes confirmadas: ${totalSoli}\n`;
  msg += `Clientes captados:       ${totalCap}\n`;
  if (totalVol > 0)
    msg += `Volantes entregados:     ${totalVol}\n`;
  if (totalInfo > 0 || totalAgenda > 0) {
    msg += `Llamadas (info):   ${totalInfo}\n`;
    msg += `Llamadas (agenda): ${totalAgenda}\n`;
  }

  msg += `\nACTIVIDADES (${activities.length})\n`;

  activities.forEach((act, i) => {
    const type = act.activityType || 'Actividad';
    msg += `\n${i + 1}. ${type} (${act.time})\n`;

    // Location
    if (act.ubicaciones && act.ubicaciones.length > 0) {
      if (act.ubicaciones.length === 1) {
        const u = act.ubicaciones[0];
        if (u.parroquia || u.sector)
          msg += `${TAB}Ubicacion: ${u.parroquia}, ${u.sector}\n`;
      } else {
        act.ubicaciones.forEach((u, ui) => {
          msg += `${TAB}Sector ${ui + 1}: ${u.parroquia}, ${u.sector}\n`;
        });
      }
    }

    // Type-specific: Condominio
    if (type === 'Visita a Condominio' && act.condominio) {
      msg += `${TAB}Condominio: ${act.condominio}\n`;
    }

    // Metrics
    msg += `${TAB}Clientes captados:    ${act.clientesCaptados || 0}\n`;
    msg += `${TAB}Solicitudes enviadas: ${act.solicitudes || 0}\n`;
    msg += `${TAB}Volantes entregados:  ${act.volantes || 0}\n`;

    // Calls
    if (act.receivedCalls) {
      msg += `${TAB}Llamadas recibidas:\n`;
      msg += `${TAB}   Buscaban info:  ${act.llamadasInfo || 0}\n`;
      msg += `${TAB}   Para agendar:   ${act.llamadasAgenda || 0}\n`;
    }

    // Notes
    if (act.notes && act.notes.trim()) {
      msg += `${TAB}Obs: ${act.notes.trim()}\n`;
    }
  });

  return msg.trim();
}

function generateWhatsappReport() {
  if (appState.activities.length === 0) return;
  const now = new Date();
  const formattedDate = now.toLocaleDateString('es-ES');
  const reportText = buildWhatsappReport(appState.activities, appState.currentAsesor, formattedDate);
  const encodedMessage = encodeURIComponent(reportText);
  window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
}

function sendHistoryReportToWhatsapp(alreadyEncoded) {
  if (!alreadyEncoded) { showToast('No hay reporte guardado para esta jornada.', 'info'); return; }
  // The text arrives pre-encoded from the onclick HTML attribute — use it directly in the URL
  window.open(`https://wa.me/?text=${alreadyEncoded}`, '_blank');
}
window.sendHistoryReportToWhatsapp = sendHistoryReportToWhatsapp;

// Modal para detalles de historial
function showHistoryDetail(jorJson) {
  const jor = JSON.parse(decodeURIComponent(jorJson));
  const existing = document.getElementById('historyDetailModal');
  if (existing) existing.remove();

  const detailsHtml = (jor.details || []).map(d => `
    <div class="flex items-start gap-3 bg-[#F2F2F7] p-3 rounded-xl border border-[#E5E5EA]">
      <span class="text-xs font-bold text-[#8E8E93] min-w-[40px] mt-0.5">${d.time}</span>
      <div class="flex flex-col">
        <span class="text-sm font-semibold text-[#1C1C1E]">${d.type}</span>
        ${d.location ? `<span class="text-xs text-[#8E8E93] mt-0.5">${d.location}</span>` : ''}
      </div>
    </div>
  `).join('');

  const modal = document.createElement('div');
  modal.id = 'historyDetailModal';
  modal.className = 'fixed inset-0 z-[100] flex items-end justify-center bg-black/40 backdrop-blur-sm';
  modal.innerHTML = `
    <div class="bg-white w-full max-w-md rounded-t-3xl p-6 pb-10 shadow-2xl animate-slide-up" style="max-height:85vh;overflow-y:auto">
      <div class="flex justify-between items-center mb-4">
        <div>
          <h2 class="text-xl font-bold text-black">${jor.date}</h2>
          <p class="text-sm text-[#8E8E93]">👤 ${jor.asesor} · ${jor.activitiesCount} actividades</p>
        </div>
        <button onclick="document.getElementById('historyDetailModal').remove()" class="text-[#8E8E93] p-2 rounded-full hover:bg-[#F2F2F7] transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      <div class="grid grid-cols-5 gap-2 bg-[#F2F2F7] rounded-2xl p-3 mb-5">
        <div class="flex flex-col items-center"><span class="text-[10px] text-[#8E8E93]">Soli.</span><span class="text-sm font-bold text-black">${jor.totals?.solicitudes || 0}</span></div>
        <div class="flex flex-col items-center"><span class="text-[10px] text-[#8E8E93]">Capt.</span><span class="text-sm font-bold text-black">${jor.totals?.captados || 0}</span></div>
        <div class="flex flex-col items-center"><span class="text-[10px] text-[#8E8E93]">Info.</span><span class="text-sm font-bold text-black">${jor.totals?.llamadasInfo || 0}</span></div>
        <div class="flex flex-col items-center"><span class="text-[10px] text-[#8E8E93]">Agen.</span><span class="text-sm font-bold text-black">${jor.totals?.llamadasAgenda || 0}</span></div>
        <div class="flex flex-col items-center"><span class="text-[10px] text-[#8E8E93]">Vol.</span><span class="text-sm font-bold text-black">${jor.totals?.volantes || 0}</span></div>
      </div>

      <p class="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-3">Actividades del día</p>
      <div class="space-y-2">
        ${detailsHtml || '<p class="text-sm text-[#8E8E93]">Sin detalles disponibles.</p>'}
      </div>
    </div>
  `;
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}
window.showHistoryDetail = showHistoryDetail;

// ----------------- INIT -----------------
render(); // Show loading screen
loadGlobalConfig();

