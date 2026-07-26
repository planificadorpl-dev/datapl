import { VentasAPI } from './ventasApi.js';

export async function renderNuevaOfertaForm(container, appState, renderApp, ventasState) {
  const opId = ventasState.selectedOperadorId;
  const operadores = await VentasAPI.getOperadores();
  const operador = operadores.find(o => o.id == opId);
  
  if (!operador) {
    alert("Operador no encontrado.");
    ventasState.currentSubView = 'competencia';
    return renderApp();
  }

  // Load Geographic Hierarchy
  const geoHierarchy = appState.geoHierarchy || {};
  let estados = Object.keys(geoHierarchy).sort();
  
  let formState = {
    estado: 'Nacional', // default to Nacional
    municipio: 'Todos',
    parroquia: 'Todas',
    tipoNovedad: 'Actualización General',
    
    // Bloque A: Planes y Promos
    planes: [], // [{velocidad: '', precio: '', tecnologia: 'FTTH'}]
    promos: [],
    
    // Bloque B: Instalación
    costoBaseInstalacion: '',
    modalidad: '',
    notas: ''
  };

  function renderForm() {
    const municipios = formState.estado && formState.estado !== 'Nacional' ? Object.keys(geoHierarchy[formState.estado] || {}).sort() : [];
    const parroquias = formState.estado && formState.municipio && formState.estado !== 'Nacional' ? Object.keys(geoHierarchy[formState.estado]?.[formState.municipio] || {}).sort() : [];

    const planesHtml = formState.planes.map((p, i) => `
      <div class="border border-zinc-200 p-4 rounded-xl mb-3 bg-zinc-50 relative">
        <button type="button" class="btn-remove-plan absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1 rounded" data-index="${i}">X</button>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label class="block text-xs text-zinc-500 mb-1">Velocidad (Mbps)</label>
            <input type="number" class="w-full border-zinc-300 rounded-lg p-2 text-sm plan-vel" data-index="${i}" value="${p.velocidad}">
          </div>
          <div>
            <label class="block text-xs text-zinc-500 mb-1">Precio ($)</label>
            <input type="number" class="w-full border-zinc-300 rounded-lg p-2 text-sm plan-pre" data-index="${i}" value="${p.precio}">
          </div>
        </div>
      </div>
    `).join('');

    container.innerHTML = `
      <div class="min-h-screen bg-zinc-50 pb-20">
        <div class="bg-white border-b border-zinc-200 sticky top-0 z-10">
          <div class="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
            <div class="flex items-center gap-4">
              <button id="btnFormBack" class="text-zinc-600 hover:text-zinc-900 transition-colors bg-zinc-100 hover:bg-zinc-200 p-2 rounded-xl">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div>
                <h1 class="text-xl font-bold tracking-tight text-zinc-900">Registrar Oferta</h1>
                <p class="text-xs text-zinc-500 mt-1">${operador.nombre}</p>
              </div>
            </div>
            <button id="btnSaveForm" class="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-xl transition-colors text-sm">
               Guardar
            </button>
          </div>
        </div>

        <div class="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <!-- Ubicación -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
            <h2 class="font-bold text-zinc-900 mb-4">Ubicación de la Oferta</h2>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1">Estado</label>
                <select id="selEstado" class="w-full border-zinc-300 rounded-lg p-2 bg-white">
                  <option value="Nacional" ${formState.estado === 'Nacional' ? 'selected' : ''}>A Nivel Nacional</option>
                  ${estados.map(e => `<option value="${e}" ${formState.estado === e ? 'selected' : ''}>${e}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1">Municipio</label>
                <select id="selMunicipio" class="w-full border-zinc-300 rounded-lg p-2 bg-white" ${formState.estado === 'Nacional' ? 'disabled' : ''}>
                  <option value="Todos">Todos</option>
                  ${municipios.map(m => `<option value="${m}" ${formState.municipio === m ? 'selected' : ''}>${m}</option>`).join('')}
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-zinc-700 mb-1">Parroquia</label>
                <select id="selParroquia" class="w-full border-zinc-300 rounded-lg p-2 bg-white" ${formState.estado === 'Nacional' ? 'disabled' : ''}>
                  <option value="Todas">Todas</option>
                  ${parroquias.map(p => `<option value="${p}" ${formState.parroquia === p ? 'selected' : ''}>${p}</option>`).join('')}
                </select>
              </div>
            </div>
          </div>

          <!-- Planes Estándar -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
            <div class="flex justify-between items-center mb-4">
              <h2 class="font-bold text-zinc-900">Planes Estándar</h2>
              <button id="btnAddPlan" class="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm font-medium border border-blue-200 transition-colors">+ Añadir Plan</button>
            </div>
            ${planesHtml || '<p class="text-sm text-zinc-500 italic">No hay planes estándar registrados.</p>'}
          </div>

          <!-- Instalación -->
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
             <h2 class="font-bold text-zinc-900 mb-4">Condiciones de Instalación</h2>
             <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1">Costo Base ($)</label>
                  <input type="number" id="inpCostoInst" class="w-full border-zinc-300 rounded-lg p-2" value="${formState.costoBaseInstalacion}">
                </div>
                <div>
                  <label class="block text-sm font-medium text-zinc-700 mb-1">Modalidad</label>
                  <select id="selModalidad" class="w-full border-zinc-300 rounded-lg p-2 bg-white">
                    <option value="">Seleccione...</option>
                    <option value="Venta de Equipo" ${formState.modalidad === 'Venta de Equipo' ? 'selected' : ''}>Venta de Equipo</option>
                    <option value="Comodato" ${formState.modalidad === 'Comodato' ? 'selected' : ''}>Comodato</option>
                    <option value="Gratis" ${formState.modalidad === 'Gratis' ? 'selected' : ''}>Gratis</option>
                  </select>
                </div>
             </div>
          </div>
          
          <div class="bg-white p-6 rounded-2xl shadow-sm border border-zinc-200">
             <h2 class="font-bold text-zinc-900 mb-4">Notas Adicionales</h2>
             <textarea id="inpNotas" class="w-full border-zinc-300 rounded-lg p-2 h-24" placeholder="Alguna observación sobre estos planes...">${formState.notas}</textarea>
          </div>
        </div>
      </div>
    `;

    attachEvents();
  }

  function attachEvents() {
    document.getElementById('btnFormBack').addEventListener('click', () => {
      ventasState.currentSubView = 'operadorDashboard';
      import('./ventasView.js').then(m => m.renderVentasPanel(container, appState, renderApp));
    });

    // Cascading dropdowns
    document.getElementById('selEstado').addEventListener('change', (e) => {
      formState.estado = e.target.value;
      formState.municipio = 'Todos';
      formState.parroquia = 'Todas';
      renderForm();
    });

    document.getElementById('selMunicipio').addEventListener('change', (e) => {
      formState.municipio = e.target.value;
      formState.parroquia = 'Todas';
      renderForm();
    });

    document.getElementById('selParroquia').addEventListener('change', (e) => {
      formState.parroquia = e.target.value;
      renderForm(); // Actually not strict render required if no cascade down
    });

    // Plan Actions
    document.getElementById('btnAddPlan').addEventListener('click', () => {
      formState.planes.push({ velocidad: '', precio: '' });
      renderForm();
    });

    document.querySelectorAll('.btn-remove-plan').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idx = e.target.getAttribute('data-index');
        formState.planes.splice(idx, 1);
        renderForm();
      });
    });

    document.querySelectorAll('.plan-vel').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = e.target.getAttribute('data-index');
        formState.planes[idx].velocidad = e.target.value;
      });
    });

    document.querySelectorAll('.plan-pre').forEach(inp => {
      inp.addEventListener('input', (e) => {
        const idx = e.target.getAttribute('data-index');
        formState.planes[idx].precio = e.target.value;
      });
    });

    // Save
    document.getElementById('btnSaveForm').addEventListener('click', async () => {
      formState.costoBaseInstalacion = document.getElementById('inpCostoInst').value;
      formState.modalidad = document.getElementById('selModalidad').value;
      formState.notas = document.getElementById('inpNotas').value;
      
      const payload = formState.planes.map(p => ({
        operador_id: opId,
        estado: formState.estado,
        municipio: formState.municipio,
        parroquia: formState.parroquia,
        tipo_novedad: 'Actualización General',
        velocidad_mb: p.velocidad ? parseInt(p.velocidad) : null,
        precio_mensual: p.precio ? parseFloat(p.precio) : null,
        costo_instalacion: formState.costoBaseInstalacion ? parseFloat(formState.costoBaseInstalacion) : null,
        modalidad_instalacion: formState.modalidad,
        notas: formState.notas,
        asesor_nombre: appState.currentAsesor || 'Sistema'
      }));

      if (payload.length === 0) {
        return window.showToast('Agrega al menos un plan', 'warning');
      }

      try {
        document.getElementById('btnSaveForm').textContent = "Guardando...";
        await VentasAPI.saveOfertasBatch(payload);
        window.showToast('Ofertas guardadas exitosamente', 'success');
        ventasState.currentSubView = 'competencia'; // return to main
        import('./ventasView.js').then(m => m.renderVentasPanel(container, appState, renderApp));
      } catch (err) {
        window.showToast('Error al guardar: ' + err.message, 'error');
        document.getElementById('btnSaveForm').textContent = "Guardar";
      }
    });
  }

  renderForm();
}
