import { geoData as defaultGeoData } from './geo_data.js';
import { geoHierarchy } from './geo_hierarchy.js';
import { renderAdminPanel } from './adminView.js';
import { supabase } from './supabaseClient.js';
import { renderVentasPanel } from './ventasView.js';

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
  solicitudesHistory: [],
  solicitudesLoading: false,
  solicitudSubView: 'form', // 'form' or 'history'
  activitySubView: 'panel',
  geoAdmin: {
    level: 0,
    selection: { estado: '', municipio: '', parroquia: '' },
    newItem: ''
  },
  planesAdmin: {
    showForm: false,
    editId: null
  }
};

// Global Initialization Flag
let isAppInitialized = false;

// Initialize Config from Supabase
function formatDate(dateString) {
  if (!dateString) return '';
  const [y, m, d] = dateString.split('-');
  return `${d}/${m}/${y}`;
}

function generateSolicitudWAMsg(formData) {
  let todayStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
  let waMsg = `*Nueva Solicitud de Servicio*\n\n`;
  waMsg += `Fecha de solicitud: ${todayStr}\n`;
  waMsg += `Fecha de Disponibilidad: ${formatDate(formData.fecha_disp || formData.fecha_disponibilidad)}\n\n`;
  waMsg += `Nombres y Apellido: ${formData.nombres} ${formData.apellidos}\n`;
  waMsg += `Cédula/RIF: ${formData.cedula}\n`;
  waMsg += `Teléfono principal: ${formData.telefono_principal}\n`;
  waMsg += `Teléfono secundario: ${formData.telefono_secundario || formData.telefono_principal}\n`;
  waMsg += `Ubicación: ${formData.estado}, ${formData.municipio}, ${formData.parroquia}, ${formData.sector}, ${formData.direccion}\n`;
  waMsg += `Tipo de Servicio: ${formData.plan} ${formData.tipo_servicio}\n`;
  waMsg += `Promotor/a: ${formData.promotor}\n`;
  waMsg += `Correo Electrónico: ${formData.correo || ''}\n`;
  waMsg += `Fuente: ${formData.fuente}`;
  
  if (formData.actividad_name) {
    waMsg += `\nActividad vinculada: ${formData.actividad_name}`;
  }
  
  return waMsg;
}

async function loadSolicitudesHistory() {
  if (!appState.currentAsesor) return;
  appState.solicitudesLoading = true;
  appState.solicitudesHistory = [];
  try {
    const { data, error } = await supabase
      .from('solicitudes')
      .select('*')
      .eq('promotor', appState.currentAsesor)
      .order('fecha_solicitud', { ascending: false });

    if (error) throw error;
    appState.solicitudesHistory = data || [];
  } catch (err) {
    console.error("Error fetching solicitudes:", err);
    showToast("Error al cargar historial: " + err.message, "error");
  } finally {
    appState.solicitudesLoading = false;
    render();
  }
}

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
       appState.asesores = DEFAULT_ASESORES.map(name => ({ nombre: name, activo: true }));
       appState.geoHierarchy = geoHierarchy; // Use the one imported at the top
       appState.planes = [];
    } else {
       // Map Asesores
       if(qAsesores && qAsesores.length > 0) {
          appState.asesores = qAsesores.map(row => ({ id: row.id, nombre: row.nombre, activo: row.activo !== false }));
       } else {
          appState.asesores = DEFAULT_ASESORES.map(name => ({ nombre: name, activo: true }));
       }
       
       // Map GeoHierarchy
       if(qGeo && qGeo.length > 0) {
          const newHierarchy = {};
          qGeo.forEach(row => {
             const e = row.estado;
             if (!e) return;
             if(!newHierarchy[e]) newHierarchy[e] = {};

             const m = row.municipio;
             if (!m || m === "_PENDING_") return;
             if(!newHierarchy[e][m]) newHierarchy[e][m] = {};

             const p = row.parroquia;
             if (!p || p === "_PENDING_") return;
             if(!newHierarchy[e][m][p]) newHierarchy[e][m][p] = [];

             const s = row.sector;
             if (!s || s === "_PENDING_") return;
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
     appState.asesores = DEFAULT_ASESORES.map(name => ({ nombre: name, activo: true }));
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

function showPrompt(title, placeholder) {
  return new Promise(resolve => {
    const id = 'promptModal-' + Date.now();
    const html = `
      <div id="${id}" class="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm opacity-0 transition-opacity duration-300">
        <div class="bg-white w-[85%] max-w-sm rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-300">
          <div class="p-6 pb-4">
            <p class="text-center text-black font-bold mb-4">${title}</p>
            <input type="text" id="${id}-input" class="w-full bg-[#F2F2F7] rounded-xl px-4 py-3 text-sm text-black focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all" placeholder="${placeholder}" autocomplete="off">
          </div>
          <div class="flex border-t border-[#E5E5EA]">
            <button data-action="cancel" class="flex-1 py-3.5 text-[#8E8E93] font-medium hover:bg-gray-50 transition-colors border-r border-[#E5E5EA]">Cancelar</button>
            <button data-action="ok" class="flex-1 py-3.5 text-[#007AFF] font-bold hover:bg-gray-50 transition-colors">Guardar</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById(id);
    const box = modal.querySelector('.bg-white');
    const input = document.getElementById(`${id}-input`);
    
    setTimeout(() => { 
      modal.classList.remove('opacity-0'); 
      box.classList.remove('scale-95'); 
      input.focus();
    }, 10);

    const close = (value) => {
      modal.classList.add('opacity-0');
      box.classList.add('scale-95');
      setTimeout(() => modal.remove(), 300);
      resolve(value);
    };
    
    modal.querySelector('[data-action="cancel"]').addEventListener('click', () => close(null));
    modal.querySelector('[data-action="ok"]').addEventListener('click', () => {
      const val = input.value.trim();
      close(val === '' ? null : val);
    });
    input.addEventListener('keydown', (e) => {
      if(e.key === 'Enter') {
         const val = input.value.trim();
         close(val === '' ? null : val);
      }
      if(e.key === 'Escape') close(null);
    });
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
  document.getElementById('btnTogglePlanForm')?.addEventListener('click', () => {
     appState.planesAdmin.showForm = !appState.planesAdmin.showForm;
     render();
  });

  document.getElementById('btnAddPlan')?.addEventListener('click', async (e) => {
     const nombre = document.getElementById('pNombre').value.trim();
     const tipo = document.getElementById('pTipo').value;
     const activo = document.getElementById('pActivo').checked;
     const has_tv = document.getElementById('pHasTV').checked;
     
     if(nombre) {
        const btn = e.currentTarget;
        setLoading(btn, true);
        const { data, error } = await supabase.from('planes_config').insert([{ nombre, tipo, activo, has_tv }]).select();
        setLoading(btn, false);
        
        if(error) {
           showToast('Error: ' + error.message);
        } else {
           if(data) appState.planes.push(data[0]);
           appState.planesAdmin.showForm = false;
           render();
        }
     } else {
        showToast('El nombre del plan es requerido');
     }
  });

  // GLOBAL DELEGATION FOR ADMIN (Check if already attached to avoid duplicates)
  if (!window._adminClickAttached) {
    document.addEventListener('click', async (e) => {
      // Planes: Enter edit mode
      if (e.target.closest('.btn-edit-plan')) {
         const btn = e.target.closest('.btn-edit-plan');
         appState.planesAdmin.editId = parseInt(btn.dataset.id);
         render();
      }
      
      // Planes: Cancel edit mode
      if (e.target.closest('.btn-cancel-edit-plan')) {
         appState.planesAdmin.editId = null;
         render();
      }
      
      // Planes: Save edit
      if (e.target.closest('.btn-save-edit-plan')) {
         const btn = e.target.closest('.btn-save-edit-plan');
         const id = parseInt(btn.dataset.id);
         const nombre = document.getElementById(`edit-plan-nombre-${id}`).value.trim();
         const tipo = document.getElementById(`edit-plan-tipo-${id}`).value;
         const activo = document.getElementById(`edit-plan-activo-${id}`).checked;
         const has_tv = document.getElementById(`edit-plan-tv-${id}`).checked;
         
         if(!nombre) {
            showToast('El nombre no puede estar vacío');
            return;
         }
         
         setLoading(btn, true);
         const { error } = await supabase.from('planes_config').update({ nombre, tipo, activo, has_tv }).eq('id', id);
         setLoading(btn, false);
         
         if(error) {
            showToast('Error al actualizar: ' + error.message);
         } else {
            const planIdx = appState.planes.findIndex(p => p.id === id);
            if(planIdx !== -1) {
               appState.planes[planIdx] = { ...appState.planes[planIdx], nombre, tipo, activo, has_tv };
            }
            appState.planesAdmin.editId = null;
            render();
            showToast('Plan actualizado');
         }
      }

      // Planes: Delete Plan
      if (e.target.closest('.btn-delete-plan')) {
         if(await showConfirm('¿Estás seguro de eliminar este plan?', 'Eliminar')) {
            const btn = e.target.closest('.btn-delete-plan');
            const id = parseInt(btn.dataset.id);
            const { error } = await supabase.from('planes_config').delete().eq('id', id);
            if(!error) {
               appState.planes = appState.planes.filter(p => p.id !== id);
               render();
               showToast('Plan eliminado');
            } else {
               showToast('Error al eliminar: ' + error.message);
            }
         }
      }
    });
    window._adminClickAttached = true;
  }
  // ASESORES
  document.getElementById('btnAddAsesor')?.addEventListener('click', async (e) => {
    const name = document.getElementById('inputNewAsesor').value.trim();
    if (name && !appState.asesores.some(a => a.nombre === name)) {
      const btn = e.currentTarget;
      setLoading(btn, true);
      const { error } = await supabase.from('asesores_config').insert([{ nombre: name, activo: true }]);
      setLoading(btn, false);
      
      if(error) {
        console.error("Supabase Error:", error);
        showToast('Error al guardar en Supabase: ' + error.message);
      } else {
        appState.asesores.push({ nombre: name, activo: true });
        appState.asesores.sort((a, b) => a.nombre.localeCompare(b.nombre));
        render(); // Renders the admin panel with new data
      }
    }
  });

  document.querySelectorAll('.btn-toggle-asesor').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      const asesorObj = appState.asesores[idx];
      const newStatus = asesorObj.activo === false ? true : false;
      
      setLoading(btn, true);
      const { error } = await supabase.from('asesores_config')
        .update({ activo: newStatus })
        .eq('nombre', asesorObj.nombre);
        
      setLoading(btn, false);
      if (error) {
         showToast('Error al actualizar estatus: ' + error.message);
         return;
      }
      asesorObj.activo = newStatus;
      render();
    });
  });

  document.querySelectorAll('.btn-delete-asesor').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const idx = e.currentTarget.getAttribute('data-index');
      const name = appState.asesores[idx].nombre;
      if(await showConfirm('¿Seguro que deseas eliminar este asesor?')) {
        setLoading(btn, true);
        const { error } = await supabase.from('asesores_config').delete().eq('nombre', name);
        
        if (error) {
           setLoading(btn, false);
           showToast('Error al eliminar: ' + error.message);
           return;
        }

        appState.asesores.splice(idx, 1);
        if(!appState.asesores.some(a => a.nombre === appState.currentAsesor)) {
           appState.currentAsesor = '';
           localStorage.setItem('current_asesor', '');
        }
        render();
      }
    });
  });

  // ZONAS - GESTIÓN DE LOCALIDADES (GRID VIEW)
  
  // 1. Breadcrumbs
  document.querySelectorAll('.btn-geo-nav').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const level = parseInt(e.currentTarget.getAttribute('data-level'));
      appState.geoAdmin.level = level;
      if (level === 0) appState.geoAdmin.selection = { estado: '', municipio: '', parroquia: '' };
      else if (level === 1) appState.geoAdmin.selection = { ...appState.geoAdmin.selection, municipio: '', parroquia: '' };
      else if (level === 2) appState.geoAdmin.selection = { ...appState.geoAdmin.selection, parroquia: '' };
      appState.geoAdmin.newItem = '';
      render();
    });
  });

  // 2. Card Click (Navigate Level)
  document.querySelectorAll('.btn-geo-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-geo-delete')) return; // Ignore if delete button was clicked
      const item = e.currentTarget.getAttribute('data-item');
      if (appState.geoAdmin.level === 0) {
        appState.geoAdmin.selection.estado = item;
        appState.geoAdmin.level = 1;
      } else if (appState.geoAdmin.level === 1) {
        appState.geoAdmin.selection.municipio = item;
        appState.geoAdmin.level = 2;
      } else if (appState.geoAdmin.level === 2) {
        appState.geoAdmin.selection.parroquia = item;
        appState.geoAdmin.level = 3;
      }
      appState.geoAdmin.newItem = '';
      render();
    });
  });

  // 3. Delete Click
  document.querySelectorAll('.btn-geo-delete').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation(); // Don't trigger card click
      const item = e.currentTarget.getAttribute('data-item');
      
      if(await showConfirm(`¿Estás seguro de eliminar "${item}"? Se eliminarán todas las entradas asociadas a este nivel.`, 'Eliminar')) {
        setLoading(btn, true);
        
        let query = supabase.from('geodata_config').delete();
        if (appState.geoAdmin.level === 0) query = query.eq('estado', item);
        else if (appState.geoAdmin.level === 1) query = query.eq('estado', appState.geoAdmin.selection.estado).eq('municipio', item);
        else if (appState.geoAdmin.level === 2) query = query.eq('estado', appState.geoAdmin.selection.estado).eq('municipio', appState.geoAdmin.selection.municipio).eq('parroquia', item);
        else query = query.eq('estado', appState.geoAdmin.selection.estado).eq('municipio', appState.geoAdmin.selection.municipio).eq('parroquia', appState.geoAdmin.selection.parroquia).eq('sector', item);

        const { error } = await query;
        if(error) {
           setLoading(btn, false);
           showToast('Error al eliminar: ' + error.message, 'error');
           return;
        }
        
        showToast('Eliminado con éxito', 'success');
        loadGlobalConfig(); // Re-fetches geodata and triggers render()
      }
    });
  });

  // 4. Add Click
  const inputNew = document.getElementById('geoNewItem');
  inputNew?.addEventListener('input', (e) => {
    appState.geoAdmin.newItem = e.target.value;
  });
  
  document.getElementById('btnGeoAdd')?.addEventListener('click', async (e) => {
    const newItem = (appState.geoAdmin.newItem || '').trim();
    if (!newItem) {
       showToast('Ingresa un nombre primero', 'info');
       return;
    }
    
    const btn = e.currentTarget;
    setLoading(btn, true);
    
    let payload = { estado: '_PENDING_', municipio: '_PENDING_', parroquia: '_PENDING_', sector: '_PENDING_' };
    
    if (appState.geoAdmin.level === 0) {
      payload.estado = newItem;
    } else if (appState.geoAdmin.level === 1) {
      payload.estado = appState.geoAdmin.selection.estado;
      payload.municipio = newItem;
    } else if (appState.geoAdmin.level === 2) {
      payload.estado = appState.geoAdmin.selection.estado;
      payload.municipio = appState.geoAdmin.selection.municipio;
      payload.parroquia = newItem;
    } else {
      payload.estado = appState.geoAdmin.selection.estado;
      payload.municipio = appState.geoAdmin.selection.municipio;
      payload.parroquia = appState.geoAdmin.selection.parroquia;
      payload.sector = newItem;
    }

    const { error } = await supabase.from('geodata_config').insert([payload]);
    
    setLoading(btn, false);
    if(error) {
       showToast('Error al añadir: ' + error.message, 'error');
    } else {
       appState.geoAdmin.newItem = '';
       showToast('Guardado con éxito', 'success');
       loadGlobalConfig();
    }
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
    appContainer.innerHTML = renderActivitiesView();
    attachActivitiesEvents();
    attachTabEvents();
  } else if (appState.currentView === 'form') {
    appContainer.innerHTML = renderActivityFormView();
    attachActivityFormEvents();
    attachTabEvents();
  } else if (appState.currentView === 'solicitud_form') {
    appContainer.innerHTML = renderSolicitudForm();
    attachSolicitudEvents();
    attachTabEvents();
  } else if (appState.currentView === 'history') {
    // If arriving at history tab, fetch data
    appContainer.innerHTML = renderHistory();
    attachTabEvents();
  } else if (appState.currentView === 'admin') {
    appContainer.innerHTML = renderAdminPanel(appState);
    attachAdminEvents();
  } else if (appState.currentView === 'ventas') {
    renderVentasPanel(appContainer, appState, render);
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
    // Re-render if user is still on any history view
    const onGlobalHistory = appState.currentView === 'history';
    const onActivityHistory = appState.currentView === 'activities_panel' && appState.activitySubView === 'history';
    if (onGlobalHistory || onActivityHistory) {
      render();
    }
  }
}

// ----------------- HOME VIEW -----------------

function renderHome() {
  const isSupervisor = false; // Add supervisor logic if needed
  
  return `
    <div class="min-h-screen bg-zinc-50 pb-20">
      <!-- PremiumPageLayout Equivalent Header -->
      <div class="bg-white border-b border-zinc-200">
        <div class="max-w-6xl mx-auto px-6 py-10 flex justify-between items-start">
          <div>
            <h1 class="text-3xl font-bold tracking-tight text-zinc-900">Ventas</h1>
            <p class="text-zinc-500 mt-2 text-sm max-w-lg">Gestión de actividades comerciales y solicitudes de servicio.</p>
          </div>
          <!-- Admin Gear -->
          <button id="btnAdminAccess" class="p-3 bg-white shadow-sm border border-zinc-200 text-zinc-400 hover:text-zinc-900 transition-all rounded-xl active:scale-95">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>

      <div class="max-w-6xl mx-auto px-6 py-8">
        <!-- Selector de Asesor -->
        <div class="mb-8 p-4 bg-white border border-zinc-200 rounded-2xl shadow-sm">
          <label class="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 block">Sesión Actual: ¿Quién está reportando?</label>
          <div class="relative w-full text-zinc-900 h-12 mt-1" id="customAsesorDropdown">
            <button id="hAsesorBtn" type="button" class="w-full h-full bg-zinc-50 border border-zinc-200 rounded-xl px-4 flex justify-between items-center transition-all duration-200 hover:bg-zinc-100">
              <span id="hAsesorSelectedText" class="text-sm ${appState.currentAsesor ? 'font-bold text-zinc-900' : 'text-zinc-500'}">
                ${appState.currentAsesor || 'Seleccione el Asesor...'}
              </span>
              <svg id="hAsesorIcon" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-zinc-400 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div id="hAsesorOptions" class="absolute z-[110] w-full mt-2 bg-white border border-zinc-200 rounded-xl shadow-xl opacity-0 invisible scale-95 origin-top transition-all duration-200 overflow-hidden max-h-[300px] overflow-y-auto hidden">
              <div class="py-1">
                ${appState.asesores.filter(a => a.activo !== false).map(a => `
                    <button type="button" data-value="${a.nombre}" class="asesor-option w-full text-left px-4 py-3 text-sm hover:bg-zinc-50 transition-colors flex justify-between items-center group border-b border-zinc-100 last:border-0">
                      <span class="${appState.currentAsesor === a.nombre ? 'font-bold text-blue-600' : 'text-zinc-700 group-hover:text-zinc-900'}">${a.nombre}</span>
                      ${appState.currentAsesor === a.nombre ? `
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                        </svg>
                      ` : ''}
                    </button>
                  `).join('')}
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- CARD 1: ACTIVIDADES -->
          <button id="btnGoToActivity" class="group block text-left h-full bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden ${!appState.currentAsesor ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}">
            <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-[0.06] transition-opacity transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 text-blue-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
            </div>
            <div class="flex flex-col h-full justify-between relative z-10">
              <div class="w-14 h-14 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>
              </div>
              <div>
                <h2 class="font-bold text-xl text-zinc-900 mb-2">Actividades</h2>
                <p class="text-sm text-zinc-500 mb-6">Reporte diario de visitas, recorridos y captación de clientes.</p>
              </div>
              <div class="flex items-center gap-2 text-sm font-semibold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                <span>Entrar</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </div>
            </div>
          </button>

          <!-- CARD 2: SOLICITUDES -->
          <button id="btnGoToSolicitud" class="group block text-left h-full bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden ${!appState.currentAsesor ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}">
            <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-[0.06] transition-opacity transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 text-violet-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
            </div>
            <div class="flex flex-col h-full justify-between relative z-10">
              <div class="w-14 h-14 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
              </div>
              <div>
                <h2 class="font-bold text-xl text-zinc-900 mb-2">Solicitudes</h2>
                <p class="text-sm text-zinc-500 mb-6">Registro de prospectos y ventas de servicios de fibra.</p>
              </div>
              <div class="flex items-center gap-2 text-sm font-semibold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                <span>Entrar</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </div>
            </div>
          </button>

          <!-- CARD 3: ESTUDIO DE MERCADO -->
          <button id="btnGoToVentas" class="group block text-left h-full bg-white rounded-2xl border border-zinc-200 p-8 shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden ${!appState.currentAsesor ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}">
            <div class="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-[0.06] transition-opacity transform translate-x-2 -translate-y-2 group-hover:translate-x-0 group-hover:translate-y-0 text-emerald-600">
               <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.25 16.23"/><path d="M12 12v-5.5"/><circle cx="12" cy="12" r="1.5"/></svg>
            </div>
            <div class="flex flex-col h-full justify-between relative z-10">
              <div class="w-14 h-14 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.25 16.23"/><path d="M12 12v-5.5"/><circle cx="12" cy="12" r="1.5"/></svg>
              </div>
              <div>
                <h2 class="font-bold text-xl text-zinc-900 mb-2">Estudio de Mercado</h2>
                <p class="text-sm text-zinc-500 mb-6">Consulta y reporte de ofertas y planes de la competencia en campo.</p>
              </div>
              <div class="flex items-center gap-2 text-sm font-semibold text-zinc-500 group-hover:text-zinc-900 transition-colors">
                <span>Entrar</span>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="group-hover:translate-x-1 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
              </div>
            </div>
          </button>
        </div>
      </div>
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

  document.getElementById('btnGoToVentas')?.addEventListener('click', () => {
    if(!appState.currentAsesor) {
       showToast('Por favor, seleccione un asesor antes de acceder a Ventas.', 'info');
       return;
    }
    appState.currentView = 'ventas';
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
            ${act.ubicaciones && act.ubicaciones.parroquia ? `<p class="text-[#3A3A3C] text-[13px] leading-tight mb-1">📍 ${act.ubicaciones.parroquia}, ${act.ubicaciones.sector}</p>` : ''}
            ${act.condominio ? `<p class="text-[#3A3A3C] text-[13px] leading-tight mb-1">🏢 ${act.condominio}</p>` : ''}
            ${act.receivedCalls ? `<p class="text-[#34C759] text-[13px] font-medium leading-tight mb-1">📞 Recibió llamadas (I:${act.llamadasInfo} | A:${act.llamadasAgenda})</p>` : ''}
            <p class="text-[#8E8E93] text-sm mt-1 font-medium bg-[#F2F2F7] inline-block px-2 py-0.5 rounded">C:${act.clientesCaptados}${act.volantes > 0 ? ' | V:'+act.volantes : ''}</p>
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
      <header class="mb-4 text-center">
        <h1 class="text-3xl font-black tracking-tighter text-black mb-1">Historial</h1>
        <p class="text-[#8E8E93] font-medium">Reportes pasados en Sheets</p>
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
window.renderLocationBlock = function() {
  const estados = appState.geoHierarchy ? Object.keys(appState.geoHierarchy).sort() : [];

  return `
    <div class="location-block ios-group">
      <!-- Estado: full width -->
      <div class="ios-item">
        <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Estado</label>
        <div class="relative w-full custom-dropdown-container">
          <select class="hidden-real-select loc-estado" required>
            <option value="" disabled selected>Seleccione...</option>
            ${estados.map(e => `<option value="${e}">${e}</option>`).join('')}
          </select>
          <button type="button" class="custom-dd-btn">
            <span class="custom-dd-text text-[#8E8E93] font-medium">Seleccione...</span>
            <svg class="h-4 w-4 text-[#8E8E93] custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
          </button>
          <div class="absolute z-50 w-full mt-2 bg-white border border-[#E5E5EA] rounded-2xl shadow-2xl opacity-0 invisible hidden custom-dd-options overflow-hidden max-h-[250px] overflow-y-auto custom-scrollbar"></div>
        </div>
      </div>

      <!-- Municipio + Parroquia: 2 columnas -->
      <div class="grid grid-cols-2">
        <div class="ios-item border-r border-[#E5E5EA]/60">
          <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Municipio</label>
          <div class="relative w-full custom-dropdown-container">
            <select class="hidden-real-select loc-municipio" required disabled>
              <option value="" disabled selected>Esperando...</option>
            </select>
            <button type="button" class="custom-dd-btn">
              <span class="custom-dd-text text-[#8E8E93] truncate">Esperando...</span>
            </button>
            <div class="absolute z-50 w-full mt-2 bg-white border border-[#E5E5EA] rounded-2xl shadow-2xl opacity-0 invisible hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options overflow-hidden"></div>
          </div>
        </div>
        <div class="ios-item">
          <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Parroquia</label>
          <div class="relative w-full custom-dropdown-container">
            <select class="hidden-real-select loc-parroquia" required disabled>
              <option value="" disabled selected>Esperando...</option>
            </select>
            <button type="button" class="custom-dd-btn">
              <span class="custom-dd-text text-[#8E8E93] truncate">Esperando...</span>
            </button>
            <div class="absolute z-50 w-full mt-2 bg-white border border-[#E5E5EA] rounded-2xl shadow-2xl opacity-0 invisible hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options overflow-hidden"></div>
          </div>
        </div>
      </div>

      <!-- Sector: full width -->
      <div class="ios-item">
        <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Sector</label>
        <div class="relative w-full custom-dropdown-container">
          <select class="hidden-real-select loc-sector" required disabled>
            <option value="" disabled selected>Esperando...</option>
          </select>
          <button type="button" class="custom-dd-btn">
            <span class="custom-dd-text text-[#8E8E93] truncate">Esperando...</span>
          </button>
          <div class="absolute z-50 w-full mt-2 bg-white border border-[#E5E5EA] rounded-2xl shadow-2xl opacity-0 invisible hidden max-h-[250px] overflow-y-auto custom-scrollbar custom-dd-options overflow-hidden"></div>
        </div>
      </div>
    </div>
  `;
};

function renderActivitiesView() {
  const isPanel = appState.activitySubView === 'panel';
  const isHistory = appState.activitySubView === 'history';
  const currentAsesor = appState.currentAsesor;

  return `
    <div class="min-h-screen bg-zinc-50 pb-20">
      <div class="bg-white border-b border-zinc-200">
        <div class="max-w-4xl mx-auto px-4 py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <button id="btnCancel" class="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 font-medium text-sm bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Volver al Menú
              </button>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-zinc-900">Actividades</h1>
            <p class="text-zinc-500 text-sm mt-1">Asesor: ${currentAsesor || 'No seleccionado'}</p>
          </div>
        </div>
      </div>

      <div class="max-w-4xl mx-auto px-4 py-6">
        <!-- Tabs -->
        <div class="flex w-full mb-6 bg-zinc-100/80 p-1 rounded-xl">
          <button id="toggleActPanel" class="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${isPanel ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/><path d="M16 18h.01"/></svg>
            Hoy
            ${isPanel && appState.activities.length > 0 ? `<span class="bg-zinc-200 text-zinc-900 px-1.5 py-0.5 rounded text-[10px] ml-1">${appState.activities.length}</span>` : ''}
          </button>
          <button id="toggleActHistory" class="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${isHistory ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
            Historial
          </button>
        </div>

        ${isPanel ? renderTodayActivitiesContent() : renderActivityHistoryList()}
      </div>
    </div>
  `;
}

function renderTodayActivitiesContent() {
  let activitiesHtml = '';
  
  if (appState.activities.length === 0) {
    activitiesHtml = `
      <div class="bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center my-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-zinc-300 mb-3"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>
        <h3 class="text-zinc-900 font-medium mb-1">No hay actividades abiertas</h3>
        <p class="text-sm text-zinc-500">Añade una actividad para comenzar tu reporte diario.</p>
      </div>
    `;
  } else {
    activitiesHtml = `
      <div class="flex items-center justify-between px-1 mb-4 mt-6">
        <h3 class="font-bold text-zinc-900 text-lg">Hoy (${appState.activities.length})</h3>
      </div>
      <div class="space-y-4 mb-6">
        ${appState.activities.map((act, index) => {
          let locParts = [];
          if(act.ubicaciones) {
             if(act.ubicaciones.parroquia) locParts.push(act.ubicaciones.parroquia);
             if(act.ubicaciones.sector) locParts.push(act.ubicaciones.sector);
          }
          const locStr = locParts.join(' > ');
          
          return `
          <div class="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div class="flex items-center justify-between px-5 pt-4 pb-2">
              <div>
                <h4 class="font-bold text-zinc-900 text-base leading-tight">${act.activityType}</h4>
                <p class="text-xs text-zinc-400 mt-0.5">${act.time} · Hoy</p>
              </div>
              <button class="delete-btn text-red-400 hover:text-red-600 p-1 transition-colors" data-index="${index}" title="Eliminar">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
              </button>
            </div>
            <div class="px-5 pb-3 space-y-1.5">
              ${locStr ? `
                <div class="flex items-start gap-2 text-sm text-zinc-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0 text-emerald-500"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>${locStr}</span>
                </div>
              ` : ''}
              ${act.condominio ? `
                <div class="flex items-center gap-2 text-sm text-zinc-600">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 text-blue-500"><rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>
                   <span>${act.condominio}</span>
                </div>
              ` : ''}
              ${act.notes ? `
                <div class="flex items-start gap-2 text-sm text-zinc-500 italic">
                   <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mt-0.5 shrink-0 text-zinc-400"><path d="M13.4 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7.4"/><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><path d="M18.4 2.6a2.17 2.17 0 0 1 3 3L16 11l-4 1 1-4Z"/></svg>
                   <span>${act.notes}</span>
                </div>
              ` : ''}
            </div>
            <div class="bg-zinc-50 px-5 py-3 flex items-center gap-3 flex-wrap border-t border-zinc-100">
              <span class="inline-flex items-center border px-2 py-0.5 text-xs font-semibold rounded-md ${act.clientesCaptados > 0 ? 'border-zinc-200 text-zinc-900 bg-white' : 'border-zinc-200 text-zinc-500'}">
                ${act.clientesCaptados || 0} captados
              </span>
              ${(act.volantes || 0) > 0 ? `
              <span class="inline-flex items-center border border-zinc-200 px-2 py-0.5 text-xs font-semibold rounded-md text-zinc-900 bg-white">
                ${act.volantes} volantes
              </span>` : ''}
            </div>
          </div>
          `;
        }).join('')}
      </div>
    `;
  }

  return `
    <div>
      <button id="btnGoToForm" class="w-full flex items-center justify-center gap-2 py-3.5 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-base font-semibold text-white transition-all mb-4">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        Añadir Actividad
      </button>
      
      ${activitiesHtml}
      
      ${appState.activities.length > 0 ? `
        <div class="flex flex-col gap-3 pb-6 mt-4">
          <button id="btnFinalizeJornada" class="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 h-14 rounded-xl text-base font-bold text-white transition-colors shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            Cierre de Jornada
          </button>
          <p class="text-xs text-center text-zinc-400">
            Archiva las actividades del día, genera el reporte completo y lo envía por WhatsApp.
          </p>
        </div>
      ` : ''}
    </div>

    <!-- Shadcn-like Alert Dialog -->
    <dialog id="confirmModal" class="bg-white rounded-lg p-0 shadow-lg backdrop:bg-zinc-950/80 outline-none border border-zinc-200 w-[90%] max-w-[400px]">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-zinc-900 mb-2">¿Finalizar Jornada?</h3>
        <p class="text-sm text-zinc-500 mb-6">Esta acción procesará las actividades abiertas y generará el reporte de campo para el cierre del día.</p>
        <div class="flex w-full gap-2 justify-end">
          <button id="btnModalCancel" class="px-4 py-2 bg-white text-zinc-900 font-medium rounded-md border border-zinc-200 hover:bg-zinc-100 transition-colors">Cancelar</button>
          <button id="btnModalConfirm" class="px-4 py-2 bg-zinc-900 text-white font-medium rounded-md hover:bg-zinc-800 transition-colors">Continuar</button>
        </div>
      </div>
    </dialog>
  `;
}

function renderActivityFormView() {
  return `
    <div class="min-h-screen pb-20 bg-[#F2F2F7]">
      <header class="ios-header">
        <div class="max-w-md mx-auto">
          <div class="flex items-center justify-between px-1">
            <button id="btnBackToPanel" class="text-[#007AFF] font-medium text-[17px] active:opacity-50 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
              </svg>
              Volver
            </button>
            <h2 class="text-[17px] font-black text-black">Nueva Actividad</h2>
            <div class="w-[60px]"></div>
          </div>
        </div>
      </header>
      <div class="max-w-md mx-auto">
        ${renderActivityFormBody()}
      </div>
    </div>
  `;
}

function renderActivityFormBody() {
  return `
      <div class="px-5 py-6">
        <!-- NOTIFICATION CHIP -->
        <div id="addedActivitiesChip" class="hidden mb-6 bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-[#E5E5EA]/50">
          <div class="w-10 h-10 rounded-full bg-[#34C759] flex items-center justify-center text-white shadow-lg shadow-[#34C759]/20">
             <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-sm font-bold text-black" id="chipCountTitle">1 Actividad Añadida</span>
            <span class="text-xs text-[#8E8E93]" id="chipDescTitle">Lista para guardar al finalizar.</span>
          </div>
        </div>

        <form id="activityForm" class="space-y-0">
          
          <!-- SECTION 1: INFO GENERAL -->
          <p class="ios-label uppercase">Información General</p>
          <div class="ios-group">
            <div class="ios-item">
              <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Hora del Reporte</label>
              <input type="text" id="fTime" value="${new Date().toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', hour12: true })}" readonly class="ios-input !text-[#8E8E93] pointer-events-none">
            </div>
            <div class="ios-item">
              <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Asesor en Turno</label>
              <input type="text" value="${appState.currentAsesor}" readonly class="ios-input font-semibold pointer-events-none text-[#1C1C1E]">
            </div>
            <div class="ios-item">
              <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Tipo de Actividad</label>
              <div class="relative w-full custom-dropdown-container">
                <select id="fType" required class="hidden-real-select">
                  <option value="" disabled selected>Seleccionar...</option>
                  <option value="Visita a Condominio">🏢 Visita a Condominio</option>
                  <option value="Recorrido (Solo)">🚶 Recorrido (Solo)</option>
                  <option value="Recorrido con Instaladores">🚐 Recorrido con Instaladores</option>
                  <option value="Recorrido con Distribución">📦 Recorrido con Distribución</option>
                  <option value="Stand Publicitario">🎪 Stand Publicitario</option>
                  <option value="Iglu Publicitario">🛖 Iglu Publicitario</option>
                  <option value="Caravana">📣 Caravana</option>
                </select>
                <button type="button" class="custom-dd-btn">
                  <span class="custom-dd-text text-[#8E8E93] font-medium">Seleccionar...</span>
                  <svg class="h-4 w-4 text-[#8E8E93] custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                </button>
                <div class="absolute z-50 w-full mt-2 bg-white border border-[#E5E5EA] rounded-2xl shadow-2xl opacity-0 invisible scale-95 origin-top transition-all duration-300 hidden custom-dd-options overflow-hidden"></div>
              </div>
            </div>
          </div>

          <!-- SECTION 2: MÉTRICAS Y CONTACTO -->
          <div id="metricsCard" class="hidden">
            <p class="ios-label uppercase">Métricas del Reporte</p>
            <div class="ios-group">
              <div class="ios-item !py-1">
                <label for="fPhoneContact" class="py-3 flex items-center justify-between cursor-pointer">
                  <div class="flex flex-col">
                    <span class="text-[15px] font-semibold text-black">Contacto Telefónico</span>
                    <span class="text-[12px] text-[#8E8E93]">¿Recibiste llamadas?</span>
                  </div>
                  <div class="relative shrink-0 w-12 h-7">
                    <input type="checkbox" id="fPhoneContact" class="peer sr-only">
                    <div class="block w-full h-full bg-[#E5E5EA] peer-checked:bg-[#34C759] rounded-full transition-colors duration-300"></div>
                    <div class="absolute left-1 top-1 bg-white w-5 h-5 rounded-full shadow-sm transition-transform duration-300 peer-checked:translate-x-5"></div>
                  </div>
                </label>
              </div>

              <div id="phoneMetricsContainer" class="hidden animate-in fade-in slide-in-from-top-2 duration-300 bg-[#F2F2F7]/50">
                <div class="grid grid-cols-2">
                  <div class="ios-item border-r border-[#E5E5EA]/60">
                    <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Solo Info.</label>
                    <input type="number" id="fPhoneInfo" min="0" placeholder="0" class="ios-input">
                  </div>
                  <div class="ios-item">
                    <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Agendados</label>
                    <input type="number" id="fPhoneAgenda" min="0" placeholder="0" class="ios-input">
                  </div>
                </div>
              </div>

              <div id="mCondominio" class="hidden ios-item">
                <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Nombre del Condominio</label>
                <input type="text" id="fCondominio" placeholder="Ej. Res. Las Rosas" class="ios-input">
              </div>

              <div id="metricsRow" class="grid grid-cols-1 border-b border-[#E5E5EA]/60 last:border-b-0">
                <div id="mCaptados" class="hidden ios-item !border-b-0">
                  <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Captados</label>
                  <input type="number" id="fCaptados" min="0" placeholder="0" class="ios-input">
                </div>
              </div>

              <div id="mVolantes" class="hidden ios-item">
                <label class="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">Volantes Entregados</label>
                <input type="number" id="fVolantes" min="0" placeholder="0" class="ios-input">
              </div>
            </div>
          </div>

          <!-- SECTION 3: UBICACIÓN -->
          <div id="locationCard" class="hidden">
            <p class="ios-label uppercase">Ubicación de Actividad</p>
            <div id="locationsContainer" class="mb-8">
              <!-- Rendered by window.renderLocationBlock as ios-group -->
            </div>
          </div>

          <!-- SECTION 4: NOTAS -->
          <div id="notesCard" class="hidden">
            <p class="ios-label uppercase">Observaciones</p>
            <div class="ios-group">
              <div class="px-4 py-3">
                <textarea id="fNotes" rows="3" placeholder="Detalles o incidencias..." class="w-full text-[16px] text-black bg-transparent focus:outline-none resize-none min-h-[90px]"></textarea>
              </div>
            </div>
          </div>

          <!-- ACTIONS -->
          <div class="pt-2 space-y-3">
            <button type="submit" name="action" value="save_return" class="btn-ios-primary">
              <span>Guardar y Finalizar</span>
              <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
            </button>
            
            <button type="submit" name="action" value="add_another" class="btn-ios-secondary">
              Añadir Otra Actividad
            </button>
          </div>
        </form>
      </div>
  `;
}

function renderActivityHistoryList() {
  if (appState.historyLoading) {
    return `
      <div class="flex items-center justify-center py-20">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900"></div>
      </div>
    `;
  }

  const filteredHistory = appState.currentAsesor
    ? appState.history.filter(jor => jor.asesor === appState.currentAsesor)
    : appState.history;

  if (filteredHistory.length === 0) {
    return `
      <div class="bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center my-6">
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mx-auto text-zinc-300 mb-3"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
        <h3 class="text-zinc-900 font-medium mb-1">Sin historial</h3>
        <p class="text-sm text-zinc-500">Las jornadas cerradas aparecerán aquí.</p>
      </div>
    `;
  }

  return `
    <div class="space-y-4">
      ${filteredHistory.map((jor, idx) => `
        <div class="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
          <button class="w-full flex items-center justify-between p-5 hover:bg-zinc-50 transition-colors text-left" onclick="showHistoryDetail('${encodeURIComponent(JSON.stringify(jor))}')">
            <div>
              <h4 class="font-bold text-zinc-900 capitalize">${jor.date}</h4>
              <div class="flex flex-wrap items-center gap-2 mt-2">
                <span class="inline-flex items-center border border-zinc-200 px-2 py-0.5 text-xs font-semibold rounded-md text-zinc-700 bg-zinc-100">${jor.activitiesCount} actividades</span>
                <span class="inline-flex items-center border border-zinc-200 px-2 py-0.5 text-xs font-semibold rounded-md text-zinc-500">${jor.totals?.captados || 0} captados</span>
                ${jor.totals?.volantes > 0 ? `<span class="inline-flex items-center border border-zinc-200 px-2 py-0.5 text-xs font-semibold rounded-md text-zinc-500">${jor.totals?.volantes} volantes</span>` : ''}
                <span class="text-xs text-violet-500 font-medium ml-1">${jor.asesor}</span>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-zinc-400 shrink-0"><path d="m9 18 6-6-6-6"/></svg>
          </button>
          <div class="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex gap-2">
            <button onclick="sendHistoryReportToWhatsapp('${encodeURIComponent(jor.reporteWhatsapp || '')}')" class="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Enviar por WhatsApp
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}


function attachActivitiesEvents() {
  // --- SUB-NAVIGATION TABS ---
  document.getElementById('toggleActPanel')?.addEventListener('click', () => {
    if (appState.activitySubView === 'panel') return;
    appState.activitySubView = 'panel';
    render();
  });
  document.getElementById('toggleActHistory')?.addEventListener('click', () => {
    if (appState.activitySubView === 'history') return;
    appState.activitySubView = 'history';
    appState.historyLoading = true;
    render();
    fetchHistory();
  });

  document.getElementById('btnCancel')?.addEventListener('click', () => {
    appState.currentView = 'home';
    render();
  });

  // --- PANEL (HOY) EVENTS ---
  if (appState.activitySubView === 'panel') {
    document.getElementById('btnGoToForm')?.addEventListener('click', () => {
      appState.currentView = 'form';
      render();
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = e.currentTarget.getAttribute('data-index');
        if (await showConfirm('¿Seguro que deseas eliminar esta actividad?')) {
          appState.activities.splice(idx, 1);
          saveActivities();
          render();
        }
      });
    });

    document.getElementById('btnSendWhatsapp')?.addEventListener('click', () => generateWhatsappReport());

    document.getElementById('btnFinalizeJornada')?.addEventListener('click', () => {
      const modal = document.getElementById('confirmModal');
      if (modal) modal.showModal();
    });
    document.getElementById('btnModalCancel')?.addEventListener('click', () => {
      document.getElementById('confirmModal')?.close();
    });
    document.getElementById('btnModalConfirm')?.addEventListener('click', () => {
      document.getElementById('confirmModal')?.close();
      finalizeJornada();
    });
    return; // No form setup needed for panel
  }

  // Only setup form elements if on form sub-view (legacy path, now unused)
  if (appState.activitySubView !== 'form') return;

  const typeSelect = document.getElementById('fType');
  const metricsCard = document.getElementById('metricsCard');
  const locationCard = document.getElementById('locationCard');
  const notesCard = document.getElementById('notesCard');
  const locContainer = document.getElementById('locationsContainer');

  // Initialize the first block on render
  if (locContainer) locContainer.innerHTML = window.renderLocationBlock();
  
  // Setup cascading for initial block
  const initialBlock = locContainer?.querySelector('.location-block');
  if(initialBlock) window.setupGeoCascading(initialBlock, appState.geoHierarchy);

  setTimeout(() => {
    initCustomFormDropdowns('activityForm');
  }, 10);

  const metricDoms = {
    condominio: document.getElementById('mCondominio'),
    volantes: document.getElementById('mVolantes'),
    captados: document.getElementById('mCaptados')
  };
  const metricInputs = {
    condominio: document.getElementById('fCondominio'),
    volantes: document.getElementById('fVolantes'),
    captados: document.getElementById('fCaptados')
  };
  
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

  function updateFormFields(val) {
    if(!val) {
       metricsCard?.classList.add('hidden');
       locationCard?.classList.add('hidden');
       notesCard?.classList.add('hidden');
       return;
    }
    
    metricsCard?.classList.remove('hidden');
    locationCard?.classList.remove('hidden');
    notesCard?.classList.remove('hidden');
    
    // Reset conditionals
    metricDoms.condominio.classList.add('hidden');
    metricInputs.condominio.required = false;
    
    // Metrics visibility
    metricDoms.captados.classList.remove('hidden');
    metricDoms.volantes.classList.remove('hidden');
    metricInputs.captados.required = true;

    if (val === 'Visita a Condominio') {
      metricDoms.condominio.classList.remove('hidden');
      metricInputs.condominio.required = true;
    }
  }

  updateFormFields(typeSelect?.value);

  typeSelect?.addEventListener('change', function() {
      updateFormFields(this.value);
  });

  const form = document.getElementById('activityForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.submitter;
    const submitterValue = btnSubmit ? btnSubmit.value : 'save_return';
    
    // Gather locations
    const block = document.getElementById('locationsContainer');
    const ubicacion = {
      estado: block.querySelector('.loc-estado').value || '',
      municipio: block.querySelector('.loc-municipio').value || '',
      parroquia: block.querySelector('.loc-parroquia').value || '',
      sector: block.querySelector('.loc-sector').value || ''
    };

    const receivedCalls = document.getElementById('fPhoneContact').checked;
    
    function formatTimeValue(val) {
      if (!val) return '';
      if (val.toLowerCase().includes('m.')) return val;
      const [hStr, mStr] = val.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr;
      const period = h >= 12 ? 'p. m.' : 'a. m.';
      h = h % 12 || 12;
      return `${h}:${m} ${period}`;
    }

    // Duplicate validation
    const currentType = document.getElementById('fType').value;
    const usedLocations = new Set();
    appState.activities.forEach(act => {
      if (act.ubicaciones && act.activityType === currentType && act.ubicaciones.parroquia && act.ubicaciones.sector && act.ubicaciones.sector !== 'N/A') {
        usedLocations.add(`${act.ubicaciones.parroquia}|||${act.ubicaciones.sector}`);
      }
    });

    if (
      ubicacion.parroquia && ubicacion.sector && ubicacion.sector !== 'N/A' &&
      usedLocations.has(`${ubicacion.parroquia}|||${ubicacion.sector}`)
    ) {
      showToast(`⚠️ Ya registraste "${currentType}" en: ${ubicacion.parroquia} – ${ubicacion.sector}.`, 'error');
      return;
    }

    const activity = {
      uid: 'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      time: formatTimeValue(document.getElementById('fTime').value),
      date: new Date().toLocaleDateString('es-VE'),
      asesor: appState.currentAsesor,
      activityType: currentType,
      ubicaciones: ubicacion,
      clientesCaptados: metricInputs.captados.value || 0,
      solicitudes: 0,
      condominio: metricInputs.condominio.value || '',
      volantes: metricInputs.volantes.value || 0,
      receivedCalls: receivedCalls,
      llamadasInfo: receivedCalls ? (fPhoneInfo.value || 0) : 0,
      llamadasAgenda: receivedCalls ? (fPhoneAgenda.value || 0) : 0,
      notes: document.getElementById('fNotes').value.trim()
    };

    appState.activities.push(activity);
    saveActivities();
    
    if(submitterValue === 'add_another') {
        const ogContent = btnSubmit.innerHTML;
        btnSubmit.innerHTML = `✓ Listo`;
        btnSubmit.classList.add('!bg-green-50', '!text-green-600', '!border-green-200');
        
        // Reset fields
        document.getElementById('activityForm').reset();
        fPhoneContact.checked = false;
        fPhoneContact.dispatchEvent(new Event('change'));
        locContainer.innerHTML = window.renderLocationBlock();
        window.setupGeoCascading(locContainer.querySelector('.location-block'), appState.geoHierarchy);
        updateFormFields(null);
        initCustomFormDropdowns('activityForm');

        // Reveal Chip
        const chip = document.getElementById('addedActivitiesChip');
        if(chip) {
           chip.classList.remove('hidden');
           document.getElementById('chipCountTitle').innerText = `${appState.activities.length} Actividad${appState.activities.length > 1 ? 'es' : ''} Añadida${appState.activities.length > 1 ? 's' : ''}`;
        }

        setTimeout(() => {
          btnSubmit.innerHTML = ogContent;
          btnSubmit.classList.remove('!bg-green-50', '!text-green-600', '!border-green-200');
        }, 1500);
    } else {
        appState.currentView = 'activities_panel';
        appState.activitySubView = 'form'; // Reset sub-view for next time
        render();
    }
  });

  initCustomFormDropdowns('activityForm');
}

function attachActivityFormEvents() {
  document.getElementById('btnBackToPanel')?.addEventListener('click', () => {
    appState.currentView = 'activities_panel';
    appState.activitySubView = 'panel';
    render();
  });

  const typeSelect = document.getElementById('fType');
  const metricsCard = document.getElementById('metricsCard');
  const locationCard = document.getElementById('locationCard');
  const notesCard = document.getElementById('notesCard');
  const locContainer = document.getElementById('locationsContainer');

  if (locContainer) locContainer.innerHTML = window.renderLocationBlock();
  const initialBlock = locContainer?.querySelector('.location-block');
  if (initialBlock) window.setupGeoCascading(initialBlock, appState.geoHierarchy);

  setTimeout(() => { initCustomFormDropdowns('activityForm'); }, 10);

  const metricDoms = {
    condominio: document.getElementById('mCondominio'),
    volantes:   document.getElementById('mVolantes'),
    captados:   document.getElementById('mCaptados')
  };
  const metricInputs = {
    condominio:  document.getElementById('fCondominio'),
    volantes:    document.getElementById('fVolantes'),
    captados:    document.getElementById('fCaptados')
  };

  const fPhoneContact      = document.getElementById('fPhoneContact');
  const phoneMetricsContainer = document.getElementById('phoneMetricsContainer');
  const fPhoneInfo         = document.getElementById('fPhoneInfo');
  const fPhoneAgenda       = document.getElementById('fPhoneAgenda');

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

  function updateFormFields(val) {
    if (!val) {
      metricsCard?.classList.add('hidden');
      locationCard?.classList.add('hidden');
      notesCard?.classList.add('hidden');
      return;
    }
    metricsCard?.classList.remove('hidden');
    locationCard?.classList.remove('hidden');
    notesCard?.classList.remove('hidden');
    metricDoms.condominio.classList.add('hidden');
    metricInputs.condominio.required = false;
    metricDoms.captados.classList.remove('hidden');
    metricDoms.volantes.classList.remove('hidden');
    metricInputs.captados.required = true;
    if (val === 'Visita a Condominio') {
      metricDoms.condominio.classList.remove('hidden');
      metricInputs.condominio.required = true;
    }
  }

  updateFormFields(typeSelect?.value);
  typeSelect?.addEventListener('change', function() { updateFormFields(this.value); });

  const form = document.getElementById('activityForm');
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = e.submitter;
    const submitterValue = btnSubmit ? btnSubmit.value : 'save_return';

    const block = document.getElementById('locationsContainer');
    const ubicacion = {
      estado:    block.querySelector('.loc-estado').value    || '',
      municipio: block.querySelector('.loc-municipio').value || '',
      parroquia: block.querySelector('.loc-parroquia').value || '',
      sector:    block.querySelector('.loc-sector').value    || ''
    };

    const receivedCalls = document.getElementById('fPhoneContact').checked;

    function formatTimeValue(val) {
      if (!val) return '';
      if (val.toLowerCase().includes('m.')) return val;
      const [hStr, mStr] = val.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr;
      const period = h >= 12 ? 'p. m.' : 'a. m.';
      h = h % 12 || 12;
      return `${h}:${m} ${period}`;
    }

    const currentType = document.getElementById('fType').value;
    const usedLocations = new Set();
    appState.activities.forEach(act => {
      if (act.ubicaciones && act.activityType === currentType && act.ubicaciones.parroquia && act.ubicaciones.sector && act.ubicaciones.sector !== 'N/A') {
        usedLocations.add(`${act.ubicaciones.parroquia}|||${act.ubicaciones.sector}`);
      }
    });
    if (ubicacion.parroquia && ubicacion.sector && ubicacion.sector !== 'N/A' &&
        usedLocations.has(`${ubicacion.parroquia}|||${ubicacion.sector}`)) {
      showToast(`⚠️ Ya registraste "${currentType}" en: ${ubicacion.parroquia} – ${ubicacion.sector}.`, 'error');
      return;
    }

    const activity = {
      uid:             'act_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      time:            formatTimeValue(document.getElementById('fTime').value),
      date:            new Date().toLocaleDateString('es-VE'),
      asesor:          appState.currentAsesor,
      activityType:    currentType,
      ubicaciones:     ubicacion,
      clientesCaptados: metricInputs.captados.value  || 0,
      solicitudes:     0,
      condominio:      metricInputs.condominio.value  || '',
      volantes:        metricInputs.volantes.value    || 0,
      receivedCalls:   receivedCalls,
      llamadasInfo:    receivedCalls ? (fPhoneInfo.value  || 0) : 0,
      llamadasAgenda:  receivedCalls ? (fPhoneAgenda.value || 0) : 0,
      notes:           document.getElementById('fNotes').value.trim()
    };

    appState.activities.push(activity);
    saveActivities();

    if (submitterValue === 'add_another') {
      const ogContent = btnSubmit.innerHTML;
      btnSubmit.innerHTML = `✓ Listo`;
      btnSubmit.classList.add('!bg-green-50', '!text-green-600', '!border-green-200');
      document.getElementById('activityForm').reset();
      fPhoneContact.checked = false;
      fPhoneContact.dispatchEvent(new Event('change'));
      locContainer.innerHTML = window.renderLocationBlock();
      window.setupGeoCascading(locContainer.querySelector('.location-block'), appState.geoHierarchy);
      updateFormFields(null);
      initCustomFormDropdowns();
      const chip = document.getElementById('addedActivitiesChip');
      if (chip) {
        chip.classList.remove('hidden');
        document.getElementById('chipCountTitle').innerText = `${appState.activities.length} Actividad${appState.activities.length > 1 ? 'es' : ''} Añadida${appState.activities.length > 1 ? 's' : ''}`;
      }
      setTimeout(() => {
        btnSubmit.innerHTML = ogContent;
        btnSubmit.classList.remove('!bg-green-50', '!text-green-600', '!border-green-200');
      }, 1500);
    } else {
      appState.currentView = 'activities_panel';
      appState.activitySubView = 'panel';
      render();
    }
  });

  initCustomFormDropdowns('activityForm');
}

// ----------------- SOLICITUD FORM VIEW -----------------

function renderSolicitudForm() {
  const isForm = appState.solicitudSubView === 'form';
  const isHistory = appState.solicitudSubView === 'history';

  // Wrapper with Tabs
  return `
    <div class="min-h-screen pb-20 bg-[#F2F2F7]">
      <!-- SEGMENTED CONTROL HEADER -->
      <header class="ios-header !pb-0">
        <div class="max-w-md mx-auto">
          <div class="flex items-center justify-between mb-3 px-1">
            <button id="btnCancelSolicitud" class="text-[#007AFF] font-medium text-[17px] active:opacity-50">Cerrar</button>
            <h2 class="text-[17px] font-black text-black">Solicitudes</h2>
            <div class="w-[50px]"></div>
          </div>
          
          <div class="flex bg-[#E3E3E8] p-0.5 rounded-lg mb-3 mx-2 relative h-8 select-none">
            <div id="solToggleIndicator" class="absolute h-[28px] top-0.5 bg-white rounded-md shadow-sm transition-all duration-300 ease-out" 
                 style="width: calc(50% - 2px); left: ${isForm ? '2px' : 'calc(50%)'}"></div>
            <button id="toggleSolForm" class="flex-1 z-10 text-[13px] font-bold transition-all duration-300 ${isForm ? 'text-black' : 'text-[#8E8E93]'}">Registro</button>
            <button id="toggleSolHistory" class="flex-1 z-10 text-[13px] font-bold transition-all duration-300 ${isHistory ? 'text-black' : 'text-[#8E8E93]'}">Historial</button>
          </div>
        </div>
      </header>

      <div class="max-w-md mx-auto">
        ${isForm ? renderSolicitudFormBody() : renderSolicitudHistoryList()}
      </div>
    </div>
  `;
}

function renderSolicitudFormBody() {
  const isSupervisor = false; // logic placeholder
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
  
  return `
    <div class="min-h-screen bg-zinc-50 pb-20">
      <div class="bg-white border-b border-zinc-200">
        <div class="max-w-3xl mx-auto px-4 py-8 flex items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-2">
              <button id="btnCancelSolicitud" class="text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1 font-medium text-sm bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Volver
              </button>
            </div>
            <h1 class="text-2xl font-bold tracking-tight text-zinc-900">Nueva Solicitud</h1>
            <p class="text-zinc-500 text-sm mt-1">Registro de un nuevo prospecto de servicio.</p>
          </div>
        </div>
      </div>

      <div class="max-w-3xl mx-auto px-4 py-6">
        <form id="solicitudForm" class="space-y-6">
          
          <!-- Cliente Info -->
          <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div class="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h3 class="font-bold text-zinc-900">Información del Cliente</h3>
            </div>
            <div class="p-6 space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-medium text-zinc-700">Nombres *</label>
                <input type="text" id="sNombres" required class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all">
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium text-zinc-700">Apellidos *</label>
                <input type="text" id="sApellidos" required class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all">
              </div>
              
              <div class="grid grid-cols-3 gap-4">
                <div class="space-y-2 col-span-1">
                  <label class="text-sm font-medium text-zinc-700">Tipo</label>
                  <select id="sCedulaTipo" class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all">
                    <option value="V-">V</option>
                    <option value="J-">J</option>
                    <option value="E-">E</option>
                    <option value="G-">G</option>
                  </select>
                </div>
                <div class="space-y-2 col-span-2">
                  <label class="text-sm font-medium text-zinc-700">Identificación *</label>
                  <input type="number" id="sCedulaNum" required class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" placeholder="Ej. 12345678">
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Género *</label>
                  <select id="sGenero" required class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all">
                    <option value="" disabled selected>Seleccione...</option>
                    <option value="Masculino">Masculino</option>
                    <option value="Femenino">Femenino</option>
                    <option value="Empresa">Empresa</option>
                  </select>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">F. Nacimiento *</label>
                  <input type="date" id="sFechaNac" required class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all text-zinc-500">
                </div>
              </div>
            </div>
          </div>

          <!-- Ubicación Info -->
          <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div class="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h3 class="font-bold text-zinc-900">Ubicación del Servicio</h3>
            </div>
            <div class="p-6 space-y-4">
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Estado *</label>
                  <div class="relative w-full custom-dropdown-container">
                    <select id="sEstado" required class="hidden-real-select loc-estado">
                      <option value="" disabled selected>Seleccionar...</option>
                      ${window.getGeoStatesOptionsHTML ? window.getGeoStatesOptionsHTML() : ''}
                    </select>
                    <button type="button" class="custom-dd-btn flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                      <span class="custom-dd-text text-zinc-500 truncate">Seleccionar...</span>
                      <svg class="h-4 w-4 text-zinc-400 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div class="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden max-h-[250px] overflow-y-auto custom-dd-options overflow-hidden"></div>
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Municipio *</label>
                  <div class="relative w-full custom-dropdown-container">
                    <select id="sMunicipio" required disabled class="hidden-real-select loc-municipio">
                      <option value="" disabled selected>Seleccionar...</option>
                    </select>
                    <button type="button" class="custom-dd-btn flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                      <span class="custom-dd-text text-zinc-500 truncate">Seleccionar...</span>
                      <svg class="h-4 w-4 text-zinc-400 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div class="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden max-h-[250px] overflow-y-auto custom-dd-options overflow-hidden"></div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Parroquia *</label>
                  <div class="relative w-full custom-dropdown-container">
                    <select id="sParroquia" required disabled class="hidden-real-select loc-parroquia">
                      <option value="" disabled selected>Seleccionar...</option>
                    </select>
                    <button type="button" class="custom-dd-btn flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                      <span class="custom-dd-text text-zinc-500 truncate">Seleccionar...</span>
                      <svg class="h-4 w-4 text-zinc-400 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div class="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden max-h-[250px] overflow-y-auto custom-dd-options overflow-hidden"></div>
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Sector *</label>
                  <div class="relative w-full custom-dropdown-container">
                    <select id="sSector" required disabled class="hidden-real-select loc-sector">
                      <option value="" disabled selected>Seleccionar...</option>
                    </select>
                    <button type="button" class="custom-dd-btn flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                      <span class="custom-dd-text text-zinc-500 truncate">Seleccionar...</span>
                      <svg class="h-4 w-4 text-zinc-400 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div class="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden max-h-[250px] overflow-y-auto custom-dd-options overflow-hidden"></div>
                  </div>
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-zinc-700">Dirección Exacta *</label>
                <textarea id="sDireccion" rows="2" required class="flex w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all resize-none" placeholder="Avenida, Calle, Casa/Apto, Punto de referencia..."></textarea>
              </div>
            </div>
          </div>

          <!-- Servicio y Contacto -->
          <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div class="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h3 class="font-bold text-zinc-900">Servicio y Contacto</h3>
            </div>
            <div class="p-6 space-y-4">
              
              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Tipo de Servicio *</label>
                  <div class="relative w-full custom-dropdown-container">
                    <select id="sTipoServicio" required class="hidden-real-select">
                      <option value="Domiciliario" selected>Domiciliario</option>
                      <option value="Corporativo">Corporativo</option>
                      <option value="Dedicado">Dedicado</option>
                    </select>
                    <button type="button" class="custom-dd-btn flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                      <span class="custom-dd-text text-zinc-900 truncate">Domiciliario</span>
                      <svg class="h-4 w-4 text-zinc-400 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div class="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden max-h-[250px] overflow-y-auto custom-dd-options overflow-hidden"></div>
                  </div>
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Plan a Contratar *</label>
                  <div class="relative w-full custom-dropdown-container">
                    <select id="sPlan" required class="hidden-real-select">
                      <option value="" disabled selected>Seleccionar...</option>
                    </select>
                    <button type="button" class="custom-dd-btn flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                      <span class="custom-dd-text text-zinc-500 truncate">Seleccionar...</span>
                      <svg class="h-4 w-4 text-zinc-400 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                    </button>
                    <div class="absolute z-50 w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden max-h-[250px] overflow-y-auto custom-dd-options overflow-hidden"></div>
                  </div>
                </div>
              </div>

              <div class="flex items-center justify-between py-2 border-b border-zinc-100 mb-2">
                <div class="flex flex-col">
                  <span class="text-sm font-medium text-zinc-700">Incluir Televisión (PowerGO)</span>
                  <span class="text-xs text-zinc-500">¿El cliente desea TV digital?</span>
                </div>
                <div class="relative shrink-0 w-11 h-6">
                  <input type="checkbox" id="sIncluyeTv" class="peer sr-only">
                  <div class="block w-full h-full bg-zinc-200 peer-checked:bg-blue-600 rounded-full transition-colors duration-300"></div>
                  <div class="absolute left-1 top-1 bg-white w-4 h-4 rounded-full shadow-sm transition-transform duration-300 peer-checked:translate-x-5"></div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Teléfono Principal *</label>
                  <input type="tel" id="sTelefonoP" required class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" placeholder="04141234567">
                </div>
                <div class="space-y-2">
                  <label class="text-sm font-medium text-zinc-700">Teléfono Secundario</label>
                  <input type="tel" id="sTelefonoS" class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" placeholder="Opcional">
                </div>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium text-zinc-700">Correo Electrónico *</label>
                <input type="email" id="sCorreo" required class="flex h-10 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all" placeholder="ejemplo@correo.com">
              </div>
            </div>
          </div>

          <!-- Fuente y Vinculación -->
          <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-8">
            <div class="border-b border-zinc-100 bg-zinc-50/50 px-6 py-4">
              <h3 class="font-bold text-zinc-900">Cierre de Venta</h3>
            </div>
            <div class="p-6 space-y-4">
              
              <div class="space-y-2">
                <label class="text-sm font-medium text-zinc-700">Fuente de la Venta *</label>
                <div class="relative w-full custom-dropdown-container">
                  <select id="sFuente" required class="hidden-real-select">
                    <option value="" disabled selected>Seleccionar...</option>
                    <option value="Actividad">Actividad del Día</option>
                    <option value="Llamada">Llamada Telefónica</option>
                    <option value="WhatsApp">Mensajería (WhatsApp)</option>
                    <option value="Instagram">Instagram / Redes</option>
                    <option value="Referido">Referido / Recomendación</option>
                    <option value="Volante">Volante</option>
                    <option value="Stand">Stand Publicitario</option>
                    <option value="Otro">Otro</option>
                  </select>
                  <button type="button" class="custom-dd-btn flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <span class="custom-dd-text text-zinc-500 truncate">Seleccionar...</span>
                    <svg class="h-4 w-4 text-zinc-400 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div class="absolute z-[60] w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden max-h-[250px] overflow-y-auto custom-dd-options overflow-hidden"></div>
                </div>
              </div>
              
              <div class="space-y-2 pb-2">
                <label class="text-sm font-medium text-zinc-700 flex items-center justify-between">
                  <span>Vincular a Actividad</span>
                  <span class="text-xs text-zinc-400 font-normal">Opcional</span>
                </label>
                <div class="relative w-full custom-dropdown-container">
                  <select id="sActividadUid" class="hidden-real-select">
                    <option value="" selected>Sin vincular...</option>
                    ${appState.activities.map(act => `<option value="${act.uid}">${act.activityType} (${act.time})</option>`).join('')}
                  </select>
                  <button type="button" class="custom-dd-btn flex h-10 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm">
                    <span class="custom-dd-text text-zinc-500 truncate">Sin vincular...</span>
                    <svg class="h-4 w-4 text-zinc-400 custom-dd-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  <div class="absolute z-[70] w-full mt-1 bg-white border border-zinc-200 rounded-lg shadow-lg opacity-0 invisible scale-95 origin-top transition-all duration-200 hidden max-h-[250px] overflow-y-auto custom-dd-options overflow-hidden"></div>
                </div>
                <p class="text-[11px] text-zinc-500 mt-1">Si la venta provino de una actividad registrada hoy, selecciónala aquí para conectarlas en el reporte.</p>
              </div>
              
            </div>
          </div>

          <div class="pt-2">
            <button type="submit" class="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-base font-semibold text-white transition-all shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Guardar y Enviar a WhatsApp
            </button>
          </div>
        </form>
      </div>
    </div>
  `;
}

function renderSolicitudHistoryList() {
  if (appState.solicitudesLoading) {
    return `
      <div class="flex items-center justify-center py-20">
        <div class="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#007AFF]"></div>
      </div>
    `;
  }

  if (appState.solicitudesHistory.length === 0) {
    return `
      <div class="bg-zinc-50/50 rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center mt-6 mx-4">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 mx-auto text-zinc-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 class="text-zinc-900 font-medium mb-1">No hay solicitudes</h3>
        <p class="text-sm text-zinc-500">Crea una nueva solicitud para empezar.</p>
      </div>
    `;
  }

  return `
    <div class="px-4 py-4 space-y-3 animate-in fade-in duration-500 max-w-3xl mx-auto">
      <p class="text-sm text-zinc-500 px-1">${appState.solicitudesHistory.length} solicitudes encontradas</p>
      ${appState.solicitudesHistory.map((s, idx) => `
        <div class="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden mb-4 relative">
          
          <div class="p-5">
            <div class="flex justify-between items-start mb-2">
              <div>
                <h4 class="font-bold text-zinc-900 text-lg">
                  ${s.nombres} ${s.apellidos}
                </h4>
                <p class="text-sm text-zinc-500">
                  ${s.cedula} · ${s.telefono_principal}
                </p>
              </div>
              <span class="inline-flex items-center rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-800 shrink-0">
                ${new Date(s.fecha_solicitud || s.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <div class="flex flex-wrap items-center gap-2 mt-3">
              <span class="inline-flex items-center rounded-md border border-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">
                ${s.plan}
              </span>
              <span class="inline-flex items-center rounded-md border border-zinc-200 px-2.5 py-0.5 text-xs font-semibold text-zinc-800">
                ${s.tipo_servicio}
              </span>
              ${s.power_go ? `
                <span class="inline-flex items-center rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 border-0">
                  TV
                </span>
              ` : ''}
              <span class="text-xs text-zinc-400 flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                ${s.parroquia}${s.sector ? `, ${s.sector}` : ""}
              </span>
              ${s.actividad_id ? `
                <span class="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                  Vinculada
                </span>
              ` : ''}
            </div>
          </div>

          <!-- Acciones -->
          <div class="px-5 py-3 bg-zinc-50 border-t border-zinc-100 flex gap-2">
            <button class="btn-open-copy-history flex-1 flex items-center justify-center gap-2 py-2 bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-900 rounded-xl text-sm font-semibold transition-all shadow-sm" 
                    data-id="${s.id}" data-index="${idx}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              Copiar
            </button>
            <button class="btn-send-wa-history flex-1 flex items-center justify-center gap-2 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl text-sm font-semibold transition-all shadow-sm" 
                    data-id="${s.id}" data-index="${idx}">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderCopyDrawer(data) {
  const items = [
    { label: 'Nombres', value: data.nombres },
    { label: 'Apellidos', value: data.apellidos },
    { label: 'Cédula', value: data.cedula },
    { label: 'Teléfono Principal', value: data.telefono_principal },
    { label: 'Teléfono Secundario', value: data.telefono_secundario || 'N/A' },
    { label: 'Correo Electrónico', value: data.correo || 'N/A' }
  ];

  return `
    <div id="copyDrawerOverlay" class="fixed inset-0 z-[150] bg-black/40 backdrop-blur-sm opacity-0 transition-opacity duration-300">
      <div id="copyDrawer" class="fixed bottom-0 left-0 right-0 bg-[#F2F2F7] rounded-t-[32px] shadow-2xl z-[160] max-w-md mx-auto translate-y-full flex flex-col max-h-[90vh]">
        <div class="w-12 h-1.5 bg-[#C6C6C8] rounded-full mx-auto mt-3 mb-2"></div>
        
        <div class="px-6 py-4 flex justify-between items-center border-b border-[#E5E5EA]">
          <h3 class="text-xl font-bold text-black">Copiado Rápido</h3>
          <button id="btnCloseCopyDrawer" class="w-8 h-8 flex items-center justify-center bg-[#E5E5EA] rounded-full text-[#8E8E93]">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <div class="p-6 space-y-3 overflow-y-auto custom-scrollbar pb-10">
          <p class="text-sm text-[#8E8E93] mb-2 leading-snug">Los datos aparecerán en el historial de tu teclado móvil (Gboard / iOS).</p>
          
          ${items.map(item => `
            <div class="bg-white p-4 rounded-2xl flex items-center justify-between border border-[#E5E5EA]">
              <div class="min-w-0 flex-1 pr-4">
                <p class="text-[10px] uppercase font-black text-[#8E8E93] tracking-wider mb-0.5">${item.label}</p>
                <p class="text-[16px] font-bold text-black truncate">${item.value}</p>
              </div>
              <button class="btn-copy-item shrink-0 px-4 py-2.5 bg-black text-white rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center gap-2" data-value="${item.value}">
                <span>Copiar</span>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;
}


function initCustomFormDropdowns(parentContainerId) {
  const container = parentContainerId ? document.getElementById(parentContainerId) : document;
  if (!container) return;

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
        return `
          <button type="button" data-value="${opt.value}" class="custom-dd-option w-full text-left px-5 py-3.5 text-[14px] hover:bg-[#F2F2F7] transition-all flex justify-between items-center group">
            <span class="${isSelected ? 'font-black text-[#007AFF]' : 'text-[#3A3A3C] font-medium group-hover:text-black hover:translate-x-1 transition-transform'}">${opt.text}</span>
            ${isSelected ? '<svg class="h-4 w-4 text-[#007AFF]" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>' : ''}
          </button>`;
      }).join('');
      optionsContainer.innerHTML = `<div class="py-1.5">${optionsHTML}</div>`;
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
      if (!selectedOpt || selectedOpt.disabled || !realSelect.value) {
        textSpan.textContent = realSelect.options[0]?.text || "Elegir...";
        textSpan.classList.add('text-[#8E8E93]');
        textSpan.classList.remove('font-bold', 'text-black');
      } else {
        textSpan.textContent = selectedOpt.text;
        textSpan.classList.remove('text-[#8E8E93]');
        textSpan.classList.add('font-bold', 'text-black');
      }
      
      if (realSelect.disabled) {
        btn.classList.add('opacity-40', 'pointer-events-none');
        btn.classList.remove('bg-white', 'hover:bg-gray-50');
      } else {
        btn.classList.remove('opacity-40', 'pointer-events-none');
        btn.classList.add('bg-transparent', 'hover:bg-gray-50/50');
      }
    }

    function toggleDd() {
      if (realSelect.disabled) return;
      isOpen = !isOpen;
      if (isOpen) {
        // Close others
        document.querySelectorAll('.custom-dd-options:not(.hidden)').forEach(el => {
          if (el !== optionsContainer) {
            el.classList.add('hidden', 'opacity-0', 'invisible', 'scale-95');
            el.classList.remove('opacity-100', 'visible', 'scale-100');
          }
        });
        renderOpt();
        optionsContainer.classList.remove('hidden');
        void optionsContainer.offsetWidth;
        optionsContainer.classList.remove('opacity-0', 'invisible', 'scale-95');
        optionsContainer.classList.add('opacity-100', 'visible', 'scale-100');
        icon?.classList.add('rotate-180');
        btn.classList.add('bg-gray-100/50');
      } else {
        optionsContainer.classList.remove('opacity-100', 'visible', 'scale-100');
        optionsContainer.classList.add('opacity-0', 'invisible', 'scale-95');
        icon?.classList.remove('rotate-180');
        btn.classList.remove('bg-gray-100/50');
        setTimeout(() => optionsContainer.classList.add('hidden'), 300);
      }
    }

    btn.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); toggleDd(); });
    realSelect.addEventListener('refreshCustomUI', () => updateVis());
    document.addEventListener('click', (ev) => { if (isOpen && !dd.contains(ev.target)) toggleDd(); });
    updateVis();
  });
}

function attachSolicitudEvents() {
  document.getElementById('btnCancelSolicitud')?.addEventListener('click', () => {
    appState.currentView = 'home';
    render();
  });

  const tipoSrv = document.getElementById('sTipoServicio');
  const planSelect = document.getElementById('sPlan');

  function updatePlanes() {
    const selectedValue = tipoSrv.value;
    const dbTipo = selectedValue === 'Corporativo' ? 'Pyme' : selectedValue;
    const availablePlanes = appState.planes.filter(p => p.activo !== false);
    const filtered = availablePlanes.filter(p => p.tipo === dbTipo);

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
      const fallbackPlanes = dbTipo === 'Domiciliario' ? 
        ['400MB', '600MB', '1GB', '400MB + TV', '600MB + TV', '1GB + TV'] : 
        ['50MB', '100MB', '200MB', 'Plan Dedicado'];
      fallbackPlanes.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p;
        opt.textContent = p;
        planSelect.appendChild(opt);
      });
    }

    planSelect.dispatchEvent(new Event('refreshCustomUI'));
  }

  // --- SUB-NAVIGATION TABS ---
  document.getElementById('toggleSolForm')?.addEventListener('click', () => {
    if (appState.solicitudSubView === 'form') return;
    appState.solicitudSubView = 'form';
    render();
  });
  document.getElementById('toggleSolHistory')?.addEventListener('click', () => {
    if (appState.solicitudSubView === 'history') return;
    appState.solicitudSubView = 'history';
    loadSolicitudesHistory(); // This calls render internally
  });

  const btnDomic = document.getElementById('btnDomic');
  const btnEmp = document.getElementById('btnEmp');

  function setTs(val) {
    if(!tipoSrv) return;
    tipoSrv.value = val;
    if (val === 'Domiciliario') {
      btnDomic?.classList.replace('text-[#8E8E93]', 'text-black');
      btnEmp?.classList.replace('text-black', 'text-[#8E8E93]');
    } else {
      btnEmp?.classList.replace('text-[#8E8E93]', 'text-black');
      btnDomic?.classList.replace('text-black', 'text-[#8E8E93]');
    }
    updatePlanes();
  }

  // Trigger initial Plannes update
  if(tipoSrv) setTs(tipoSrv.value);
  else updatePlanes();

  // Handle Tipo de Servicio real-select change
  tipoSrv?.addEventListener('change', (e) => {
    updatePlanes();
  });

  const geoBlock = document.getElementById('solicitudForm');
  if(geoBlock && window.setupGeoCascading) {
    window.setupGeoCascading(geoBlock, appState.geoHierarchy);
  }

  if (appState.solicitudSubView === 'history') {
    // Delegated listener for Copy from History
    document.querySelectorAll('.btn-open-copy-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.index;
        const s = appState.solicitudesHistory[idx];
        if (!s) return;

        const data = {
          nombres: s.nombres || 'No definido',
          apellidos: s.apellidos || 'No definido',
          cedula: s.cedula || 'No definido',
          telefono_principal: s.telefono_principal || 'No definido',
          telefono_secundario: s.telefono_secundario || '',
          correo: s.correo || ''
        };

        document.body.insertAdjacentHTML('beforeend', renderCopyDrawer(data));
        initCopyDrawerLogic();
      });
    });

    document.querySelectorAll('.btn-send-wa-history').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = btn.dataset.index;
        const s = appState.solicitudesHistory[idx];
        if (!s) return;
        
        const waMsg = generateSolicitudWAMsg(s);
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;
        window.open(waUrl, '_blank');
      });
    });

    return; // Skip form-only events
  }

  
  setTimeout(() => {
    initCustomFormDropdowns('solicitudForm');
    updatePlanes();
  }, 10);

  // --- External App Copy Logic (Helpers) ---
  function initCopyDrawerLogic() {
    const overlay = document.getElementById('copyDrawerOverlay');
    const drawer = document.getElementById('copyDrawer');
    
    setTimeout(() => {
      overlay.classList.replace('opacity-0', 'opacity-100');
      drawer.classList.add('animate-slide-up');
    }, 10);

    const closeDrawer = () => {
      drawer.classList.replace('animate-slide-up', 'animate-slide-down');
      overlay.classList.replace('opacity-100', 'opacity-0');
      setTimeout(() => overlay.remove(), 300);
    };

    document.getElementById('btnCloseCopyDrawer')?.addEventListener('click', closeDrawer);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) closeDrawer(); });

    document.querySelectorAll('.btn-copy-item').forEach(btn => {
      btn.addEventListener('click', async () => {
        const value = btn.dataset.value;
        if (!value || value === 'No definido') return;
        try {
          await navigator.clipboard.writeText(value);
          const ogHtml = btn.innerHTML;
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg><span>Copiado!</span>`;
          btn.classList.replace('bg-black', 'bg-[#34C759]');
          setTimeout(() => {
            btn.innerHTML = ogHtml;
            btn.classList.replace('bg-[#34C759]', 'bg-black');
          }, 2000);
        } catch (err) {
          console.error("Failed to copy:", err);
          showToast("Error al acceder al portapapeles", "error");
        }
      });
    });
  }

  // (Original logic for Open Copy Drawer removed from here as it now lives in History cards)

  const formEl = document.getElementById('solicitudForm');
  formEl?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = formEl.querySelector('button[type="submit"]');
    const ogText = btnSubmit.innerHTML;
    btnSubmit.innerHTML = `<div class="h-6 w-6 border-3 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>`;
    btnSubmit.disabled = true;

    try {
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
        fecha_nacimiento: document.getElementById('sFechaNac').value || null,
        fuente: document.getElementById('sFuente').value,
        actividad_uid: document.getElementById('sActividadUid') ? document.getElementById('sActividadUid').value : null
      };

      let actividadName = '';
      if (formData.actividad_uid) {
         const linkedAct = appState.activities.find(a => a.uid === formData.actividad_uid);
         if (linkedAct) {
            actividadName = linkedAct.activityType;
            formData.actividad_name = actividadName;
         }
      }

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
        fecha_nacimiento: formData.fecha_nacimiento,
        fuente: formData.fuente,
        actividad_uid: formData.actividad_uid
      }]);

      if (error) throw error;

      // Auto-increment the linked activity locally
      if (formData.actividad_uid) {
         const linkedAct = appState.activities.find(a => a.uid === formData.actividad_uid);
         if (linkedAct) {
            linkedAct.solicitudes = (parseInt(linkedAct.solicitudes) || 0) + 1;
            saveActivities();
         }
      }

      const waMsg = generateSolicitudWAMsg(formData);
      const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waMsg)}`;
      window.open(waUrl, '_blank');

      showToast('Solicitud guardada y vinculada correctamente', 'success');
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
  msg += `*REPORTE DIARIO*\n`;
  msg += `Fecha: ${date}\n`;
  msg += `Asesor: ${asesor}\n\n`;

  msg += `*RESUMEN*\n`;
  msg += `Solicitudes confirmadas: ${totalSoli}\n`;
  msg += `Clientes captados: ${totalCap}\n`;
  if (totalVol > 0)
    msg += `Volantes entregados: ${totalVol}\n`;
  if (totalInfo > 0 || totalAgenda > 0) {
    msg += `Llamadas (info): ${totalInfo}\n`;
    msg += `Llamadas (agenda): ${totalAgenda}\n`;
  }

  msg += `\nACTIVIDADES (${activities.length})\n`;

  activities.forEach((act, i) => {
    const type = act.activityType || 'Actividad';
    msg += `\n${i + 1}. ${type} (${act.time})\n`;

    // Location
    if (act.ubicaciones && (act.ubicaciones.parroquia || act.ubicaciones.sector)) {
      const locStr = [act.ubicaciones.estado, act.ubicaciones.municipio, act.ubicaciones.parroquia, act.ubicaciones.sector].filter(v => v && v !== 'N/A').join(', ');
      msg += `${TAB}Ubicación: ${locStr}\n`;
    }

    // Type-specific: Condominio
    if (type === 'Visita a Condominio' && act.condominio) {
      msg += `${TAB}Condominio: ${act.condominio}\n`;
    }

    // Metrics
    msg += `${TAB}Clientes captados: ${act.clientesCaptados || 0}\n`;
    msg += `${TAB}Solicitudes enviadas: ${act.solicitudes || 0}\n`;
    msg += `${TAB}Volantes entregados: ${act.volantes || 0}\n`;

    // Calls
    if (act.receivedCalls) {
      msg += `${TAB}Llamadas recibidas:\n`;
      msg += `${TAB}· Info: ${act.llamadasInfo || 0}\n`;
      msg += `${TAB}· Agenda: ${act.llamadasAgenda || 0}\n`;
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

