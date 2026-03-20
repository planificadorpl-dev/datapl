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
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
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
      <div class="grid grid-cols-1 gap-4">
        
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
        syncActivity(activity, 'DELETE');
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
