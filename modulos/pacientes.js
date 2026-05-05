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

    Modal.abrir(Modal.wrap(`
      <div class="modal-avatar">${p.nombre.charAt(0)}</div>
      <h2>${p.nombre}</h2>
      <p class="modal-condicion">${p.condicion}</p>
      <div class="modal-grid">
        <div><label>Teléfono</label><span>${p.telefono}</span></div>
        <div><label>Email</label><span>${p.email}</span></div>
        <div><label>Nacimiento</label><span>${Utils.formatFecha(p.fechaNacimiento)}</span></div>
        <div><label>Paciente desde</label><span>${Utils.formatFecha(p.creadoEn)}</span></div>
      </div>
      ${p.notas ? `<div class="modal-notas"><label>Notas</label><p>${p.notas}</p></div>` : ""}
      <div class="modal-section">
        <h3>Turnos (${turnos.length})</h3>
        ${turnos.map(t => `
          <div class="modal-row">
            <span>${Utils.formatFecha(t.fecha)} ${t.hora}</span>
            <span>${t.tipo}</span>
            <span class="turno-badge ${t.estado}">${t.estado}</span>
          </div>`).join("") || '<p class="empty-state">Sin turnos.</p>'}
      </div>
      <div class="modal-section">
        <h3>Compras (${ventas.length})</h3>
        ${ventas.map(v => {
          const prod = DB.getProducto(v.productoId);
          return `<div class="modal-row">
            <span>${Utils.formatFecha(v.fecha)}</span>
            <span>${prod?.nombre}</span>
            <span>$${v.precioTotal.toLocaleString("es-AR")}</span>
          </div>`;
        }).join("") || '<p class="empty-state">Sin compras.</p>'}
      </div>
    `));
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
    `));
  },

  guardar: () => {
    const nombre = document.getElementById("np-nombre").value.trim();
    if (!nombre) return alert("El nombre es obligatorio.");

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
