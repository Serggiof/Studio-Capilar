// ============================================================
// MODULOS/PACIENTES.JS
// ============================================================

const Pacientes = {
  ordenActual: localStorage.getItem('pacientes_orden') || 'apellido',
  filtroActual: "todos",

  render: (el) => {
    Pacientes.filtroActual = "todos";

    el.innerHTML = `
      <div class="modulo-header">
        <h1>Pacientes (Total: ${DB.pacientes().length})</h1>
        <div style="display: flex; gap: 10px; align-items:center;">
          <select id="orden-pacientes" onchange="Pacientes.cambiarOrden(this.value)" style="padding:6px; border-radius:4px; border:1px solid var(--border); font-family:inherit; cursor:pointer;">
            <option value="apellido" ${Pacientes.ordenActual === "apellido" ? "selected" : ""}>Ordenar por Apellido</option>
            <option value="nombre" ${Pacientes.ordenActual === "nombre" ? "selected" : ""}>Ordenar por Nombre</option>
          </select>
          <button class="btn-primary" onclick="Pacientes.abrirNuevo()">+ Nuevo paciente</button>
        </div>
      </div>
      
      <!-- Solapas de Inactividad por Año - ¡Siempre Visibles e Intuitivas! -->
      <div class="tabs-header" style="margin-top: 15px; margin-bottom: 15px; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">
        <button class="tab-btn active" style="font-size:0.9rem; padding: 6px 12px;" onclick="Pacientes.seleccionarTabFiltro('todos', this)">👤 Todos los pacientes</button>
        <button class="tab-btn" style="font-size:0.9rem; padding: 6px 12px;" onclick="Pacientes.seleccionarTabFiltro('2026', this)">⚠️ Inactivos 2026 (+30 días)</button>
        <button class="tab-btn" style="font-size:0.9rem; padding: 6px 12px;" onclick="Pacientes.seleccionarTabFiltro('2025', this)">⚠️ Inactivos 2025</button>
        <button class="tab-btn" style="font-size:0.9rem; padding: 6px 12px;" onclick="Pacientes.seleccionarTabFiltro('2024', this)">⚠️ Inactivos 2024</button>
      </div>

      <div class="search-bar">
        <input type="text" placeholder="Buscar por nombre..."
               oninput="Pacientes.filtrar(this.value)" id="buscar-paciente">
      </div>

      <div class="pacientes-grid" id="pacientes-grid">
        ${Pacientes._lista(DB.pacientes())}
      </div>
    `;
  },

  _lista: (lista) => {
    if (lista.length === 0) return '<p class="empty-state" style="grid-column: 1 / -1;">No se encontraron pacientes.</p>';
    
    const obtenerApellido = (nombre) => {
      const partes = nombre.trim().split(" ");
      return partes.length > 1 ? partes[partes.length - 1] : partes[0];
    };
    
    const pacientesOrdenados = [...lista].sort((a, b) => {
      if (Pacientes.ordenActual === "nombre") {
        return a.nombre.trim().localeCompare(b.nombre.trim(), 'es', { sensitivity: 'base' });
      } else {
        return obtenerApellido(a.nombre).localeCompare(obtenerApellido(b.nombre), 'es', { sensitivity: 'base' });
      }
    });

    let html = "";
    let letraActual = "";

    pacientesOrdenados.forEach(p => {
      const claveOrden = Pacientes.ordenActual === "nombre" ? p.nombre.trim() : obtenerApellido(p.nombre);
      const primeraLetra = Utils.normalizarTexto(claveOrden.charAt(0)).toUpperCase() || "#";
      
      if (primeraLetra !== letraActual) {
        letraActual = primeraLetra;
        html += `<div style="grid-column: 1 / -1; display: flex; align-items: center; margin: 20px 0 10px 0;">
                   <span style="font-weight: bold; font-size: 1.4rem; margin-right: 15px; color: var(--primary); font-family: var(--font-display);">${letraActual}</span>
                   <hr style="flex-grow: 1; border: none; border-top: 1px solid var(--border);">
                 </div>`;
      }
      
      html += `
      <div class="paciente-card" onclick="Pacientes.verDetalle('${p.id}')">
        <div class="paciente-avatar">${p.nombre.charAt(0).toUpperCase()}</div>
        <div class="paciente-info">
          <strong>${p.nombre}</strong>
          <span>${p.condicion}</span>
          <small>📞 ${p.telefono}</small>
        </div>
      </div>`;
    });
    
    return html;
  },

  filtr: (query) => {
    Pacientes.aplicarFiltros();
  },

  filtrar: (query) => {
    Pacientes.aplicarFiltros();
  },

  seleccionarTabFiltro: (filtro, btn) => {
    if (btn) {
      btn.parentElement.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
    }
    Pacientes.filtroActual = filtro;
    Pacientes.aplicarFiltros();
  },

  aplicarFiltros: () => {
    const query = document.getElementById("buscar-paciente")?.value || "";
    const q = Utils.normalizarTexto(query);
    
    let list = DB.pacientes();
    
    // 1. Filtrar por búsqueda de texto
    if (q) {
      list = list.filter(p =>
        Utils.normalizarTexto(p.nombre).includes(q) || 
        Utils.normalizarTexto(p.condicion || "").includes(q)
      );
    }
    
    // 2. Filtrar por solapa seleccionada (Inactividad / Años)
    if (Pacientes.filtroActual !== "todos") {
      const hoy = new Date();
      const anioFiltro = Pacientes.filtroActual;
      
      list = list.filter(p => {
        const dates = [];
        
        // Buscar actividad real
        DB.turnos().filter(t => t.pacienteId === p.id).forEach(t => dates.push(new Date(t.fecha + "T12:00:00")));
        DB.ventas().filter(v => v.pacienteId === p.id).forEach(v => dates.push(new Date(v.fecha + "T12:00:00")));
        if (p.historial) {
          p.historial.forEach(h => dates.push(new Date(h.fecha + "T12:00:00")));
        }
        
        // Si no tiene ninguna actividad real, caemos al creadoEn
        if (dates.length === 0) {
          dates.push(p.creadoEn ? new Date(p.creadoEn + "T12:00:00") : new Date("2020-01-01T12:00:00"));
        }
        
        const lastDate = new Date(Math.max(...dates));
        const diffDays = (hoy - lastDate) / (1000 * 60 * 60 * 24);
        
        // Si el filtro es 2026, pedir al menos 30 días de inactividad
        if (anioFiltro === "2026") {
          if (diffDays <= 30) return false;
        }
        
        // Comprobar año del último registro
        const anioUltimo = lastDate.getFullYear().toString();
        return anioUltimo === anioFiltro;
      });
      
      const countHeader = document.querySelector(".modulo-header h1");
      if (countHeader) {
        let label = anioFiltro === "2026" ? "Inactivos 2026 (>30 días)" : `Inactivos ${anioFiltro}`;
        countHeader.innerHTML = `${label} (${list.length})`;
      }
    } else {
      const countHeader = document.querySelector(".modulo-header h1");
      if (countHeader) countHeader.innerHTML = `Pacientes (Total: ${list.length})`;
    }
    
    document.getElementById("pacientes-grid").innerHTML = Pacientes._lista(list);
  },

  irAVender: (id) => {
    Modal.cerrar();
    Router.ir('ventas');
    setTimeout(() => Ventas.abrirNuevaVenta(id), 100);
  },

  verDetalle: (id) => {
    const p = DB.getPaciente(id);
    if (!p) return;
    const turnos = DB.turnos().filter(t => t.pacienteId === id);
    const ventas = DB.ventas().filter(v => v.pacienteId === id);
    const historial = p.historial || [];

    // Calcular progreso de sesiones
    const plasma = DB.sesionesPlasma().find(s => s.pacienteId === id);
    const meso = DB.sesionesMeso().find(s => s.pacienteId === id);
    
    let htmlProgreso = "";
    if (plasma) {
      const realizadas = plasma.sesiones.length;
      const total = plasma.totalPlanificadas;
      let dots = "";
      for (let i=0; i<total; i++) dots += `<div class="dot ${i < realizadas ? 'filled' : ''}"></div>`;
      htmlProgreso += `<div class="progreso-sesiones"><span class="progreso-titulo">Plasma Capilar:</span> <div class="progreso-dots">${dots}</div> <span style="font-size:0.85rem; color:var(--text-muted)">${realizadas}/${total}</span></div>`;
    }
    if (meso) {
      const realizadas = meso.sesiones.length;
      const total = meso.totalPlanificadas;
      let dots = "";
      for (let i=0; i<total; i++) dots += `<div class="dot ${i < realizadas ? 'filled' : ''}"></div>`;
      htmlProgreso += `<div class="progreso-sesiones"><span class="progreso-titulo">Mesoterapia:</span> <div class="progreso-dots">${dots}</div> <span style="font-size:0.85rem; color:var(--text-muted)">${realizadas}/${total}</span></div>`;
    }

    // Historial HTML
    let htmlHistorial = historial.map((h, index) => `
      <div class="timeline-item">
        <div class="timeline-date">${Utils.formatFecha(h.fecha)}</div>
        <div class="timeline-tratamiento">${h.tratamiento}</div>
        <div class="timeline-obs">${h.observaciones || "Sin observaciones"}</div>
        ${h.foto ? `<div class="timeline-img-container"><img src="file://${h.foto}" class="timeline-img" alt="Foto clínica" onclick="window.open('file://${h.foto.replace(/\\/g, '\\\\')}')" title="Clic para abrir tamaño original"></div>` : ""}
        <button class="btn-primary" style="margin-top: 10px; background: var(--alerta); padding: 4px 8px; font-size: 0.8rem" onclick="Pacientes.eliminarHistorial('${id}', ${index})">🗑 Eliminar</button>
      </div>
    `).join("");

    if (!htmlHistorial) htmlHistorial = '<p class="empty-state" style="margin-top:20px;">No hay registros médicos.</p>';

    Modal.abrir(Modal.wrap(`
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="display: flex; align-items: center; gap: 15px;">
          <div class="modal-avatar">${p.nombre.charAt(0)}</div>
          <div>
            <h2 style="margin:0">${p.nombre}</h2>
            <p class="modal-condicion" style="margin:0">${p.condicion || "Sin condición registrada"}</p>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-export-word" class="btn-export" onclick="Pacientes.exportarHistorialWord('${id}')">📄 Exportar Word</button>
          <button class="btn-primary" style="padding: 8px 12px; font-size: 0.85rem;" onclick="Pacientes.irAVender('${id}')">🛒 Vender</button>
        </div>
      </div>

      <div class="tabs-header" style="margin-top: 25px;">
        <button class="tab-btn active" onclick="Pacientes.switchTab('info', this)">Información General</button>
        <button class="tab-btn" onclick="Pacientes.switchTab('historial', this)">Historial Médico</button>
        <button class="tab-btn" onclick="Pacientes.switchTab('fotos', this)">Evolución / Fotos</button>
        <button class="tab-btn" onclick="Pacientes.switchTab('editar', this)">Editar Datos</button>
        <button class="tab-btn" onclick="Pacientes.switchTab('compras', this)">Compras (${ventas.length})</button>
      </div>

      <!-- TAB INFO -->
      <div id="tab-info" class="tab-content active">
        ${htmlProgreso}
        <div class="modal-grid" style="margin-top: 15px">
          <div><label>Teléfono</label><span>${p.telefono || '-'}</span></div>
          <div><label>Email</label><span>${p.email || '-'}</span></div>
          <div><label>Nacimiento</label><span>${p.fechaNacimiento ? Utils.formatFecha(p.fechaNacimiento) : '-'}</span></div>
          <div><label>Paciente desde</label><span>${Utils.formatFecha(p.creadoEn)}</span></div>
          ${p.origen ? `<div><label>Origen</label><span>${p.origen}</span></div>` : ""}
        </div>
        ${p.notas ? `<div class="modal-notas"><label>Notas</label><p>${p.notas}</p></div>` : ""}
        
        <div class="modal-section" style="margin-top: 25px">
          <h3>Turnos Recientes</h3>
          ${turnos.slice(0, 5).map(t => `
            <div class="modal-row">
              <span>${Utils.formatFecha(t.fecha)} ${t.hora}</span>
              <span>${t.tipo}</span>
              <span class="turno-badge ${t.estado}">${t.estado}</span>
            </div>`).join("") || '<p class="empty-state">Sin turnos registrados.</p>'}
        </div>
      </div>

      <!-- TAB HISTORIAL -->
      <div id="tab-historial" class="tab-content">
        <div style="background: var(--bg); padding: 15px; border-radius: var(--radius); margin-bottom: 25px; border: 1px solid var(--border);">
          <h4 style="margin-top:0; margin-bottom: 15px; color: var(--primary);">+ Añadir Registro</h4>
          <div style="display:grid; grid-template-columns: 1fr 2fr; gap:15px; margin-bottom: 12px;">
             <div><label style="font-size:0.8rem; font-weight:bold;">Fecha</label><input type="date" id="hm-fecha" value="${Utils.hoy()}" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:4px;"></div>
             <div><label style="font-size:0.8rem; font-weight:bold;">Tratamiento</label><input type="text" id="hm-tratamiento" placeholder="Ej. Mesoterapia Sesión 2" style="width:100%; padding:8px; border:1px solid var(--border); border-radius:4px;"></div>
          </div>
          <label style="font-size:0.8rem; font-weight:bold;">Observaciones</label>
          <div class="textarea-wrapper">
            <div id="hm-ghost" class="textarea-ghost"></div>
            <textarea id="hm-obs" rows="2" style="width:100%; padding:8px; border: 1px solid var(--border); border-radius: 4px; resize:vertical; font-family:inherit;" oninput="Pacientes.onInputObs(this)" onkeydown="Pacientes.onKeyDownObs(event, this)" onscroll="Pacientes.onScrollObs(this)"></textarea>
          </div>
          <label style="font-size:0.8rem; font-weight:bold;">Foto Local (Opcional)</label>
          <input type="file" id="hm-foto" accept="image/*" style="display:block; margin-bottom: 15px; font-size:0.85rem;">
          <button class="btn-primary" onclick="Pacientes.guardarHistorial('${id}')">Guardar en Historial</button>
        </div>
        
        <h3 style="margin-bottom: 15px">Línea de Tiempo</h3>
        <div class="timeline">
          ${htmlHistorial}
        </div>
      </div>

      <!-- TAB EVOLUCION / FOTOS -->
      <div id="tab-fotos" class="tab-content">
        <!-- Google Fotos Sync Card -->
        <div class="card" style="margin-bottom: 25px; border: 1px dashed var(--accent); background: rgba(201, 169, 110, 0.05); padding: 18px; border-radius: var(--radius);">
          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span style="font-size: 1.4rem;">📸</span>
            <strong style="font-family: var(--font-display); color: var(--primary); font-size: 0.98rem; letter-spacing: 0.01em;">Sincronizar con Google Fotos (Celular)</strong>
          </div>
          ${p.googleFotosUrl 
            ? `
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">Este paciente está conectado a su álbum de Google Fotos. Las fotos de tu celular se reflejan aquí abajo al instante.</p>
              
              <!-- Formulario en línea para editar enlace -->
              <div id="gf-editar-form-${p.id}" style="display:none; margin-bottom: 14px;">
                <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px;"><a href="#" onclick="window.open('https://photos.google.com/albums')" style="color:var(--accent); font-weight:600; text-decoration:underline;">Abrir Google Fotos</a> para buscar un nuevo enlace de álbum.</p>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="gf-edit-url-input-${p.id}" value="${p.googleFotosUrl}" placeholder="Pegá el enlace https://photos.app.goo.gl/..." style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem; outline: none; background: #fff; font-family: inherit;">
                  <button class="btn-primary" onclick="Pacientes.vincularGoogleFotosEnlinea('${p.id}', true)" style="padding: 8px 14px; font-size: 0.85rem; border-radius: 6px; font-weight: bold;">Guardar</button>
                  <button class="btn-sm" onclick="document.getElementById('gf-editar-form-${p.id}').style.display='none'; document.getElementById('gf-info-buttons-${p.id}').style.display='flex';" style="padding: 8px 14px; border-radius: 6px; border-color: var(--border); background: var(--bg); color: var(--text);">Cancelar</button>
                </div>
              </div>
              
              <div id="gf-info-buttons-${p.id}" style="display: flex; gap: 8px;">
                <button class="btn-primary" onclick="window.open('${p.googleFotosUrl}')" style="background: var(--accent); flex: 1; font-size: 0.85rem; padding: 10px 14px; font-weight: bold; border-radius: 6px;">
                  🌐 Abrir en el navegador
                </button>
                <button class="btn-sm" onclick="document.getElementById('gf-editar-form-${p.id}').style.display='block'; document.getElementById('gf-info-buttons-${p.id}').style.display='none'; setTimeout(() => document.getElementById('gf-edit-url-input-${p.id}').select(), 50);" style="padding: 10px 14px; border-radius: 6px;" title="Editar enlace">
                  ✏️ Cambiar Enlace
                </button>
              </div>
            `
            : `
              <p style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">¿Sacás las fotos con tu celular? Creá un álbum compartido en la app Google Fotos de tu celu, pegá el enlace aquí y míralas directamente desde la PC sin cables ni transferencias.</p>
              
              <!-- Formulario en línea para vincular enlace -->
              <div id="gf-vincular-form-${p.id}" style="display:none; margin-bottom: 14px;">
                <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px;">1. <a href="#" onclick="window.open('https://photos.google.com/albums')" style="color:var(--accent); font-weight:600; text-decoration:underline;">Hacé clic acá para abrir Google Fotos</a>, buscá o creá el álbum del paciente, copiá su enlace de compartir.</p>
                <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px;">2. Pegá el enlace abajo y guardalo:</p>
                <div style="display: flex; gap: 8px;">
                  <input type="text" id="gf-url-input-${p.id}" placeholder="Pegá el enlace https://photos.app.goo.gl/..." style="flex: 1; padding: 8px 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem; outline: none; background: #fff; font-family: inherit;">
                  <button class="btn-primary" onclick="Pacientes.vincularGoogleFotosEnlinea('${p.id}', false)" style="padding: 8px 14px; font-size: 0.85rem; border-radius: 6px; font-weight: bold;">Guardar</button>
                  <button class="btn-sm" onclick="document.getElementById('gf-vincular-form-${p.id}').style.display='none'; document.getElementById('gf-vincular-btn-${p.id}').style.display='block';" style="padding: 8px 14px; border-radius: 6px; border-color: var(--border); background: var(--bg); color: var(--text);">Cancelar</button>
                </div>
              </div>
              
              <button id="gf-vincular-btn-${p.id}" class="btn-primary" onclick="document.getElementById('gf-vincular-form-${p.id}').style.display='block'; this.style.display='none'; setTimeout(() => document.getElementById('gf-url-input-${p.id}').focus(), 50);" style="background: transparent; color: var(--accent); border: 1px solid var(--accent); width: 100%; font-size: 0.85rem; padding: 10px 14px; font-weight: bold; border-radius: 6px;">
                🔗 Vincular Álbum de Google Fotos
              </button>
            `
          }
        </div>
        
        ${p.googleFotosUrl 
          ? `
            <h3 style="margin-bottom: 12px; font-family: var(--font-display); color: var(--primary); font-size: 1.05rem;">Progreso en Google Fotos (En Vivo)</h3>
            <div style="width: 100%; height: 600px; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); background: #fff; margin-bottom: 25px;">
              <webview src="${p.googleFotosUrl}" style="width: 100%; height: 100%; border: none;"></webview>
            </div>
          `
          : ""
        }
        
        <h3 style="margin-bottom: 15px; font-family: var(--font-display); color: var(--primary); font-size: 1.05rem;">Galería de Fotos Locales</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 14px;">
          ${historial.filter(h => h.foto).map(h => `
            <div style="background: var(--card-bg); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; box-shadow: var(--shadow); display: flex; flex-direction: column;">
              <div style="aspect-ratio: 1; overflow: hidden; cursor: pointer;" onclick="window.open('file://${h.foto.replace(/\\/g, '\\\\')}')" title="Ver en tamaño completo">
                <img src="file://${h.foto}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.06)';" onmouseout="this.style.transform='none';">
              </div>
              <div style="padding: 8px; font-size: 0.72rem; text-align: center; background: var(--bg); border-top: 1px solid var(--border);">
                <strong style="display: block; color: var(--primary);">${Utils.formatFecha(h.fecha)}</strong>
                <span style="color: var(--text-muted); display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-top: 2px;">${h.tratamiento}</span>
              </div>
            </div>
          `).join("") || '<p class="empty-state" style="grid-column: 1 / -1; padding: 30px 0;">No hay fotos locales registradas en el historial.</p>'}
        </div>
      </div>

      <!-- TAB EDITAR -->
      <div id="tab-editar" class="tab-content">
        <h3 style="margin-bottom: 15px; font-family: var(--font-display); color: var(--primary); font-size: 1.05rem;">Editar Datos del Paciente</h3>
        <div class="form-group">
          <label>Nombre completo *</label>
          <input type="text" id="edit-p-nombre" value="${p.nombre}">
        </div>
        <div class="form-group">
          <label>Teléfono</label>
          <input type="text" id="edit-p-tel" value="${p.telefono !== "—" ? (p.telefono || "") : ""}">
        </div>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="edit-p-email" value="${p.email || ""}">
        </div>
        <div class="form-group">
          <label>Condición capilar</label>
          <input type="text" id="edit-p-condicion" value="${p.condicion || ""}">
        </div>
        <div class="form-group">
          <label>Fecha de nacimiento</label>
          <input type="date" id="edit-p-nacimiento" value="${p.fechaNacimiento || ""}">
        </div>
        <div class="form-group">
          <label>Enlace Álbum Google Fotos</label>
          <input type="text" id="edit-p-fotos-url" value="${p.googleFotosUrl || ""}" placeholder="https://photos.app.goo.gl/...">
        </div>
        <div class="form-group">
          <label>Notas</label>
          <textarea id="edit-p-notas" rows="12" placeholder="Observaciones clínicas, antecedentes..." style="min-height: 250px; line-height: 1.5; font-size: 0.92rem; font-family: inherit;">${p.notas || ""}</textarea>
        </div>
        <button class="btn-primary" onclick="Pacientes.guardarEdicion('${p.id}')" style="width: 100%; font-weight: bold; margin-top: 10px;">Guardar Cambios</button>
      </div>

      <!-- TAB COMPRAS -->
      <div id="tab-compras" class="tab-content">
        ${ventas.map(v => {
          const prod = DB.getProducto(v.productoId);
          return `<div class="modal-row" style="padding:15px 0">
            <span>${Utils.formatFecha(v.fecha)}</span>
            <span style="font-weight:600">${prod?.nombre || 'Producto eliminado'}</span>
            <span style="color:var(--primary); font-weight:bold;">$${v.precioTotal.toLocaleString("es-AR")}</span>
          </div>`;
        }).join("") || '<p class="empty-state">Sin compras registradas.</p>'}
      </div>
    `, { bloquearFondo: true, grande: true }));
  },

  switchTab: (tabId, btn) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const btnExport = document.getElementById('btn-export-word');
    if (btnExport) {
      btnExport.style.display = tabId === 'info' ? 'flex' : 'none';
    }
  },

  onInputObs: (el) => {
    const diccionario = {
      'alo': 'pecia', 'seb': 'orrea', 'dermat': 'itis', 'tto': 'ratamiento', 
      'minox': 'idil', 'finas': 'teride', 'pac': 'iente', 'dx': 'iagnóstico', 
      'sx': 'íntomas', 'plas': 'ma', 'meso': 'terapia'
    };
    const ghost = document.getElementById('hm-ghost');
    if (!ghost) return;
    const txt = el.value;
    
    // Sincronizar texto normal primero
    ghost.innerHTML = txt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    el.dataset.suggestion = "";
    
    if (txt.length === 0 || txt.endsWith(' ')) return;
    
    const words = txt.split(/[\s,.;\n]+/);
    const lastWord = words[words.length - 1].toLowerCase();
    
    if (diccionario[lastWord]) {
      const completion = diccionario[lastWord];
      const textToHighlight = txt.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
      ghost.innerHTML = textToHighlight + "<span>" + completion + "</span>";
      el.dataset.suggestion = completion;
    }
  },

  onKeyDownObs: (e, el) => {
    if ((e.key === ' ' || e.key === 'Tab') && el.dataset.suggestion) {
      e.preventDefault();
      const cursor = el.selectionStart;
      const textBefore = el.value.substring(0, cursor);
      const textAfter = el.value.substring(cursor);
      
      el.value = textBefore + el.dataset.suggestion + ' ' + textAfter;
      el.selectionStart = el.selectionEnd = cursor + el.dataset.suggestion.length + 1;
      el.dataset.suggestion = "";
      
      const ghost = document.getElementById('hm-ghost');
      if (ghost) ghost.innerHTML = el.value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
    } else {
      setTimeout(() => Pacientes.onScrollObs(el), 0);
    }
  },
  
  onScrollObs: (el) => {
    const ghost = document.getElementById('hm-ghost');
    if (ghost) ghost.scrollTop = el.scrollTop;
  },

  guardarHistorial: (pacienteId) => {
    const fecha = document.getElementById("hm-fecha").value;
    const tratamiento = document.getElementById("hm-tratamiento").value.trim();
    const obs = document.getElementById("hm-obs").value.trim();
    const fotoInput = document.getElementById("hm-foto");
    
    if (!fecha || !tratamiento) return Utils.mostrarToast("Fecha y Tratamiento son obligatorios.");

    let fotoPath = null;
    if (fotoInput.files && fotoInput.files.length > 0) {
      fotoPath = fotoInput.files[0].path; // Funciona en Electron
    }

    const p = DB.getPaciente(pacienteId);
    if (!p.historial) p.historial = [];
    
    p.historial.unshift({ fecha, tratamiento, observaciones: obs, foto: fotoPath });
    
    DB.actualizar("pacientes", pacienteId, { historial: p.historial });
    Pacientes.verDetalle(pacienteId);
    setTimeout(() => {
      const btn = document.querySelectorAll('.tab-btn')[1];
      if(btn) Pacientes.switchTab('historial', btn);
    }, 10);
  },

  eliminarHistorial: (pacienteId, index) => {
    if (!confirm("¿Eliminar este registro médico del historial?")) return;
    const p = DB.getPaciente(pacienteId);
    p.historial.splice(index, 1);
    DB.actualizar("pacientes", pacienteId, { historial: p.historial });
    Pacientes.verDetalle(pacienteId);
    setTimeout(() => {
      const btn = document.querySelectorAll('.tab-btn')[1];
      if(btn) Pacientes.switchTab('historial', btn);
    }, 10);
  },

  exportarHistorialWord: async (pacienteId) => {
    const p = DB.getPaciente(pacienteId);
    if (!p) return;
    
    if (typeof docx === "undefined") {
      return Utils.mostrarToast("La librería para exportar Word no está cargada o no hay conexión a internet para descargarla.");
    }
    
    try {
      const doc = new docx.Document({
        sections: [{
          properties: {},
          children: [
            new docx.Paragraph({
              text: "Historial Clínico - Studio Capilar",
              heading: docx.HeadingLevel.HEADING_1,
              alignment: docx.AlignmentType.CENTER,
            }),
            new docx.Paragraph({ text: "" }),
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: "Paciente: ", bold: true }),
                new docx.TextRun(p.nombre),
              ],
            }),
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: "Condición: ", bold: true }),
                new docx.TextRun(p.condicion || "N/A"),
              ],
            }),
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: "Teléfono: ", bold: true }),
                new docx.TextRun(p.telefono || "N/A"),
              ],
            }),
            new docx.Paragraph({
              children: [
                new docx.TextRun({ text: "Email: ", bold: true }),
                new docx.TextRun(p.email || "N/A"),
              ],
            }),
            new docx.Paragraph({ text: "" }),
            new docx.Paragraph({
              text: "Registro de Tratamientos:",
              heading: docx.HeadingLevel.HEADING_2,
            }),
            ...(p.historial || []).map(h => {
              return [
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({ text: `Fecha: ${Utils.formatFecha(h.fecha)}`, bold: true }),
                  ],
                  spacing: { before: 200 }
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({ text: "Tratamiento: ", bold: true }),
                    new docx.TextRun(h.tratamiento),
                  ]
                }),
                new docx.Paragraph({
                  children: [
                    new docx.TextRun({ text: "Observaciones: ", bold: true }),
                    new docx.TextRun(h.observaciones || "Ninguna"),
                  ]
                }),
                new docx.Paragraph({ text: "----------------------------------------" })
              ];
            }).flat(),
          ],
        }],
      });

      const blob = await docx.Packer.toBlob(doc);
      saveAs(blob, `Historial_${p.nombre.replace(/\s+/g, '_')}.docx`);
      Utils.mostrarToast("Paciente exportado correctamente");
    } catch (err) {
      console.error(err);
      Utils.mostrarToast("Hubo un error al generar el archivo Word.");
    }
  },

  vincularGoogleFotosEnlinea: (pacienteId, esEdicion = false) => {
    const inputId = esEdicion ? `gf-edit-url-input-${pacienteId}` : `gf-url-input-${pacienteId}`;
    const input = document.getElementById(inputId);
    if (!input) return;
    const url = input.value.trim();
    
    if (url && !url.startsWith("http://") && !url.startsWith("https://")) {
      return Utils.mostrarToast("Por favor, ingresá una URL válida (ej. https://photos.app.goo.gl/...)");
    }
    
    DB.actualizar("pacientes", pacienteId, { googleFotosUrl: url });
    Utils.mostrarToast(url ? "Álbum de Google Fotos vinculado" : "Álbum desvinculado");
    Pacientes.verDetalle(pacienteId);
    
    // Volver a abrir la pestaña de fotos tras recargar el modal
    setTimeout(() => {
      const btn = document.querySelectorAll('.tab-btn')[2];
      if (btn) Pacientes.switchTab('fotos', btn);
    }, 10);
  },

  abrirNuevo: () => {
    Modal.abrir(Modal.wrap(`
      <h2>Nuevo paciente</h2>
      <div class="form-group"><label>Nombre completo *</label>
        <input type="text" id="np-nombre" placeholder="Ej: María González"></div>
      <div class="form-group"><label>Teléfono</label>
        <input type="text" id="np-tel" placeholder="341-555-0000"></div>
      <div class="form-group"><label>Email</label>
        <input type="email" id="np-email" placeholder="mail@ejemplo.com"></div>
      <div class="form-group"><label>Condición capilar</label>
        <input type="text" id="np-condicion" placeholder="Ej: Alopecia, seborrea..."></div>
      <div class="form-group"><label>Fecha de nacimiento</label>
        <input type="date" id="np-nacimiento"></div>
      <div class="form-group"><label>¿Cómo nos conoció?</label>
        <select id="np-origen" onchange="document.getElementById('np-origen-detalle').style.display = this.value === 'Paciente' ? 'block' : 'none'">
          <option value="">Seleccionar...</option>
          <option value="Instagram (IG)">Instagram (IG)</option>
          <option value="Paciente">Por otro paciente</option>
          <option value="Otro">Otro</option>
        </select>
        <input type="text" id="np-origen-detalle" placeholder="Nombre del paciente..." style="display:none; margin-top:8px;">
      </div>
      <div class="form-group"><label>Enlace Álbum Google Fotos (Opcional)</label>
        <input type="text" id="np-fotos-url" placeholder="https://photos.app.goo.gl/..."></div>
      <div class="form-group"><label>Notas</label>
        <textarea id="np-notas" placeholder="Alergias, observaciones..."></textarea></div>
      <button class="btn-primary" onclick="Pacientes.guardar()">Guardar paciente</button>
    `, { bloquearFondo: true }));
  },

  guardar: () => {
    const nombre = document.getElementById("np-nombre").value.trim();
    if (!nombre) return Utils.mostrarToast("El nombre es obligatorio.");

    const origenVal = document.getElementById("np-origen").value;
    const origenDetalle = document.getElementById("np-origen-detalle").value.trim();
    const origen = origenVal === 'Paciente' ? (origenDetalle ? `Paciente: ${origenDetalle}` : 'Paciente') : origenVal;

    const nuevo = {
      id: Utils.id("p"),
      nombre,
      telefono: document.getElementById("np-tel").value,
      email:    document.getElementById("np-email").value,
      condicion: document.getElementById("np-condicion").value,
      fechaNacimiento: document.getElementById("np-nacimiento").value,
      origen:   origen,
      googleFotosUrl: document.getElementById("np-fotos-url").value.trim(),
      notas:    document.getElementById("np-notas").value,
      creadoEn: Utils.hoy()
    };

    const lista = DB.pacientes();
    lista.push(nuevo);
    DB.set("pacientes", lista);
    Modal.cerrar();
    Router.recargar();
  },

  cambiarOrden: (valor) => {
    Pacientes.ordenActual = valor;
    localStorage.setItem('pacientes_orden', valor);
    Pacientes.aplicarFiltros();
  },

  guardarEdicion: (pacienteId) => {
    const nombre = document.getElementById("edit-p-nombre").value.trim();
    if (!nombre) return Utils.mostrarToast("El nombre es obligatorio.");
    
    const cambios = {
      nombre,
      telefono: document.getElementById("edit-p-tel").value.trim() || "—",
      email: document.getElementById("edit-p-email").value.trim(),
      condicion: document.getElementById("edit-p-condicion").value.trim(),
      fechaNacimiento: document.getElementById("edit-p-nacimiento").value,
      googleFotosUrl: document.getElementById("edit-p-fotos-url").value.trim(),
      notas: document.getElementById("edit-p-notas").value.trim()
    };
    
    DB.actualizar("pacientes", pacienteId, cambios);
    Utils.mostrarToast("Datos del paciente actualizados");
    
    // Re-abrir modal
    Pacientes.verDetalle(pacienteId);
    
    // Mantener pestaña activa
    setTimeout(() => {
      const btn = document.querySelectorAll('.tab-btn')[3];
      if (btn) Pacientes.switchTab('editar', btn);
    }, 15);
    
    Router.recargar();
  }
};
