// ============================================================
// MODULOS/TRATAMIENTOS.JS
// ============================================================

const Tratamientos = {
  tipoActual: 'plasma', // 'plasma' o 'meso'

  render: (el) => {
    const sesiones = Tratamientos.tipoActual === 'plasma' ? DB.sesionesPlasma() : DB.sesionesMeso();

    el.innerHTML = `
      <div class="modulo-header">
        <h1>💉 Tratamientos</h1>
        <button class="btn-primary" onclick="Tratamientos.abrirNuevoPlan()">+ Nuevo plan</button>
      </div>

      <div class="tabs" style="margin-bottom: 20px;">
        <button class="tab-btn ${Tratamientos.tipoActual === 'plasma' ? 'active' : ''}" onclick="Tratamientos.cambiarTipo('plasma')">Plasma</button>
        <button class="tab-btn ${Tratamientos.tipoActual === 'meso' ? 'active' : ''}" onclick="Tratamientos.cambiarTipo('meso')">Mesoterapia</button>
      </div>

      <div class="plasma-grid">
        ${sesiones.length === 0
          ? '<p class="empty-state">Sin planes registrados para este tratamiento.</p>'
          : sesiones.map(s => Tratamientos._card(s)).join("")}
      </div>
    `;
  },

  cambiarTipo: (tipo) => {
    Tratamientos.tipoActual = tipo;
    Router.recargar();
  },

  _card: (s) => {
    const p      = DB.getPaciente(s.pacienteId);
    const hechas = s.sesiones.length;
    const dias   = Utils.diasHasta(s.proximaAlerta);
    const enAlerta = dias <= 5;

    return `
      <div class="plasma-card ${enAlerta ? "plasma-alerta" : ""}">
        <div class="plasma-header-card">
          <div class="plasma-avatar">${p?.nombre.charAt(0) || "?"}</div>
          <div>
            <strong>${p?.nombre || "—"}</strong>
            <span>${hechas}/${s.totalPlanificadas} sesiones</span>
          </div>
          ${enAlerta ? `<span class="alerta-chip">${dias <= 0 ? "Vencida" : `${dias}d`}</span>` : ""}
        </div>

        <div class="plasma-progress">
          <div class="progress-bar" style="width:${Math.min((hechas / s.totalPlanificadas) * 100, 100)}%"></div>
        </div>

        <div class="plasma-sesiones">
          ${s.sesiones.length === 0
            ? '<p class="empty-state" style="font-size:0.8rem">Sin sesiones registradas.</p>'
            : s.sesiones.map(ses => `
                <div class="sesion-row">
                  <span class="sesion-num">#${ses.numero}</span>
                  <span>${Utils.formatFecha(ses.fecha)}</span>
                  <span class="sesion-nota">${ses.precio ? `$${ses.precio.toLocaleString("es-AR")}` : "—"}</span>
                </div>`).join("")}
        </div>

        <div class="plasma-footer">
          <span>Próx. alerta: ${Utils.formatFecha(s.proximaAlerta)}</span>
          <div style="display:flex;gap:6px">
            <button class="btn-sm" onclick="Tratamientos.registrarSesion('${s.id}')">+ Sesión</button>
            <button class="btn-sm" onclick="Tratamientos.eliminarPlan('${s.id}')">✕</button>
          </div>
        </div>
      </div>`;
  },

  abrirNuevoPlan: () => {
    const pacientes = DB.pacientes();
    const titulo = Tratamientos.tipoActual === 'plasma' ? "Plasma" : "Mesoterapia";
    Modal.abrir(Modal.wrap(`
      <h2>Nuevo plan de ${titulo}</h2>
      <div class="form-group">
        <label>Paciente *</label>
        <select id="pp-paciente">
          <option value="">Seleccionar...</option>
          ${pacientes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Total de sesiones planificadas</label>
        <input type="number" id="pp-total" value="6" min="1">
      </div>
      <div class="form-group">
        <label>Días entre alertas</label>
        <input type="number" id="pp-dias" value="21" min="1">
      </div>
      <button class="btn-primary" onclick="Tratamientos.guardarPlan()">Crear plan</button>
    `));
  },

  guardarPlan: () => {
    const pacienteId = document.getElementById("pp-paciente").value;
    const total      = parseInt(document.getElementById("pp-total").value);
    const dias       = parseInt(document.getElementById("pp-dias").value);
    if (!pacienteId) return alert("Seleccioná un paciente.");

    const alerta = new Date();
    alerta.setDate(alerta.getDate() + dias);

    const nuevo = {
      id: Utils.id("trm"),
      pacienteId,
      sesiones: [],
      totalPlanificadas: total,
      diasIntervalo: dias,
      proximaAlerta: alerta.toISOString().split("T")[0]
    };

    if (Tratamientos.tipoActual === 'plasma') {
      DB.set("sesionesPlasma", [...DB.sesionesPlasma(), nuevo]);
    } else {
      DB.set("sesionesMeso", [...DB.sesionesMeso(), nuevo]);
    }

    Modal.cerrar();
    Router.recargar();
    Router.actualizarBadge();
  },

  registrarSesion: (planId) => {
    const esPlasma = Tratamientos.tipoActual === 'plasma';
    const lista = esPlasma ? DB.sesionesPlasma() : DB.sesionesMeso();
    const plan  = lista.find(s => s.id === planId);
    if (!plan) return;
    if (plan.sesiones.length >= plan.totalPlanificadas)
      return alert("Ya se completaron todas las sesiones planificadas.");

    const alerta = new Date();
    const diasIntervalo = plan.diasIntervalo || 21;
    alerta.setDate(alerta.getDate() + diasIntervalo);
    
    // Obtener precio configurado
    const cfg = DB.getConfig();
    const precio = esPlasma ? parseFloat(cfg.precioPlasma) || 0 : parseFloat(cfg.precioMeso) || 0;

    plan.sesiones.push({
      numero: plan.sesiones.length + 1,
      fecha:  Utils.hoy(),
      notas:  "",
      precio: precio
    });
    plan.proximaAlerta = alerta.toISOString().split("T")[0];

    if (esPlasma) {
      DB.set("sesionesPlasma", lista);
    } else {
      DB.set("sesionesMeso", lista);
    }

    Router.recargar();
    Router.actualizarBadge();
  },

  eliminarPlan: (id) => {
    if (!confirm("¿Eliminar este plan?")) return;
    if (Tratamientos.tipoActual === 'plasma') {
      DB.eliminar("sesionesPlasma", id);
    } else {
      DB.eliminar("sesionesMeso", id);
    }
    Router.recargar();
  }
};
