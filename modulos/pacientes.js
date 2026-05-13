// ============================================================
// MODULOS/PACIENTES.JS
// ============================================================

const Pacientes = {
  render: (el) => {
    el.innerHTML = `
      <div class="modulo-header">
        <h1>Pacientes</h1>
        <button class="btn-primary" onclick="Pacientes.abrirNuevo()">+ Nuevo paciente</button>
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
      return obtenerApellido(a.nombre).localeCompare(obtenerApellido(b.nombre), 'es', { sensitivity: 'base' });
    });

    let html = "";
    let letraActual = "";

    pacientesOrdenados.forEach(p => {
      const apellido = obtenerApellido(p.nombre);
      const primeraLetra = Utils.normalizarTexto(apellido.charAt(0)).toUpperCase() || "#";
      
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

  filtrar: (query) => {
    const q = Utils.normalizarTexto(query);
    const filtrados = DB.pacientes().filter(p =>
      Utils.normalizarTexto(p.nombre).includes(q) || 
      Utils.normalizarTexto(p.condicion || "").includes(q)
    );
    document.getElementById("pacientes-grid").innerHTML = Pacientes._lista(filtrados);
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
        <button id="btn-export-word" class="btn-export" onclick="Pacientes.exportarHistorialWord('${id}')">📄 Exportar Word</button>
      </div>

      <div class="tabs-header" style="margin-top: 25px;">
        <button class="tab-btn active" onclick="Pacientes.switchTab('info', this)">Información General</button>
        <button class="tab-btn" onclick="Pacientes.switchTab('historial', this)">Historial Médico</button>
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
    `, { bloquearFondo: true }));
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
      <div class="form-group"><label>Notas</label>
        <textarea id="np-notas" placeholder="Alergias, observaciones..."></textarea></div>
      <button class="btn-primary" onclick="Pacientes.guardar()">Guardar paciente</button>
    `, { bloquearFondo: true }));
  },

  guardar: () => {
    const nombre = document.getElementById("np-nombre").value.trim();
    if (!nombre) return Utils.mostrarToast("El nombre es obligatorio.");

    const nuevo = {
      id: Utils.id("p"),
      nombre,
      telefono: document.getElementById("np-tel").value,
      email:    document.getElementById("np-email").value,
      condicion: document.getElementById("np-condicion").value,
      fechaNacimiento: document.getElementById("np-nacimiento").value,
      notas:    document.getElementById("np-notas").value,
      creadoEn: Utils.hoy()
    };

    const lista = DB.pacientes();
    lista.push(nuevo);
    DB.set("pacientes", lista);
    Modal.cerrar();
    Router.recargar();
  }
};
