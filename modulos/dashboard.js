// ============================================================
// MODULOS/DASHBOARD.JS
// ============================================================

const Dashboard = {
  render: (el) => {
    const hoy = Utils.hoy();
    const turnosHoy = DB.turnos()
      .filter(t => t.fecha === hoy)
      .sort((a, b) => a.hora.localeCompare(b.hora));

    const alertasRecompra = DB.ventas().filter(v => Utils.esAlerta(v.proximaRecompra, 7));
    const alertasPlasma   = DB.sesionesPlasma().filter(s => Utils.esAlerta(s.proximaAlerta, 5));

    el.innerHTML = `
      <div class="dash-header">
        <div>
          <h1>Buenos días 👋</h1>
          <p class="dash-fecha">${new Date().toLocaleDateString("es-AR", { weekday:"long", day:"numeric", month:"long" })}</p>
        </div>
        <div class="dash-stats">
          <div class="stat-card">
            <span class="stat-num">${turnosHoy.length}</span>
            <span class="stat-label">Turnos hoy</span>
          </div>
          <div class="stat-card">
            <span class="stat-num">${DB.pacientes().length}</span>
            <span class="stat-label">Pacientes</span>
          </div>
          <div class="stat-card ${alertasRecompra.length + alertasPlasma.length > 0 ? "stat-alerta" : ""}">
            <span class="stat-num">${alertasRecompra.length + alertasPlasma.length}</span>
            <span class="stat-label">Alertas</span>
          </div>
        </div>
      </div>

      <div class="dash-grid">
        <section class="card">
          <h2>Agenda del día</h2>
          ${Dashboard._turnosHoy(turnosHoy)}
        </section>
        <div class="dash-side">
          <section class="card">
            <h2>Alertas activas</h2>
            ${Dashboard._alertas(alertasRecompra, alertasPlasma)}
          </section>
        </div>
      </div>
    `;
  },

  _turnosHoy: (turnos) => {
    if (turnos.length === 0) return '<p class="empty-state">Sin turnos para hoy 🎉</p>';
    return turnos.map(t => {
      const p = DB.getPaciente(t.pacienteId);
      return `
        <div class="turno-item">
          <div class="turno-hora">${t.hora}</div>
          <div class="turno-info">
            <strong>${p?.nombre || "—"}</strong>
            <span>${t.tipo} · ${t.duracion} min</span>
            ${t.notas ? `<em>${t.notas}</em>` : ""}
          </div>
          <span class="turno-badge ${t.estado}">${t.estado}</span>
        </div>`;
    }).join("");
  },

  _alertas: (recompra, plasma) => {
    if (recompra.length === 0 && plasma.length === 0)
      return '<p class="empty-state">Sin alertas pendientes ✅</p>';

    return [
      ...recompra.map(v => {
        const p    = DB.getPaciente(v.pacienteId);
        const prod = DB.getProducto(v.productoId);
        const dias = Utils.diasHasta(v.proximaRecompra);
        return `<div class="alerta-item ${dias <= 0 ? "alerta-vencida" : ""}">
          <span class="alerta-ico">🛒</span>
          <div>
            <strong>${p?.nombre}</strong>
            <span>Recompra: ${prod?.nombre}</span>
            <small>${dias <= 0 ? "Venció" : `En ${dias} días`}</small>
          </div>
        </div>`;
      }),
      ...plasma.map(s => {
        const p   = DB.getPaciente(s.pacienteId);
        const dias = Utils.diasHasta(s.proximaAlerta);
        return `<div class="alerta-item ${dias <= 0 ? "alerta-vencida" : ""}">
          <span class="alerta-ico">💉</span>
          <div>
            <strong>${p?.nombre}</strong>
            <span>Próxima sesión plasma</span>
            <small>${dias <= 0 ? "Venció" : `En ${dias} días`}</small>
          </div>
        </div>`;
      })
    ].join("");
  }
};
