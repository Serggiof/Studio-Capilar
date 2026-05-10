// ============================================================
// MODULOS/TURNOS.JS
// ============================================================

const Turnos = {
  _state: {
    year: new Date().getFullYear(),
    month: new Date().getMonth(),
    fechaSel: null
  },

  render: (el) => {
    const { year, month, fechaSel } = Turnos._state;
    const nombresMes = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                        "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    // Días con turnos este mes
    const diasConTurnos = {};
    DB.turnos().forEach(t => {
      if (t.estado !== "cancelado") {
        diasConTurnos[t.fecha] = (diasConTurnos[t.fecha] || 0) + 1;
      }
    });

    el.innerHTML = `
      <div class="modulo-header">
        <h1>Turnos</h1>
        ${fechaSel ? `<button class="btn-primary" onclick="Turnos.abrirNuevoTurno('${fechaSel}')">+ Nuevo turno</button>` : ""}
      </div>

      <div class="turnos-layout">

        <!-- CALENDARIO -->
        <div class="cal-panel">
          <div class="cal-nav">
            <button class="btn-cal" onclick="Turnos.cambiarMes(-1)">‹</button>
            <span>${nombresMes[month]} ${year}</span>
            <button class="btn-cal" onclick="Turnos.cambiarMes(1)">›</button>
          </div>

          <div class="cal-grid-header">
            ${["Lun","Mar","Mié","Jue","Vie","Sáb","Dom"].map(d => `<div class="cal-dow">${d}</div>`).join("")}
          </div>

          <div class="cal-grid">
            ${Turnos._renderCeldas(year, month, diasConTurnos, fechaSel)}
          </div>

          <div class="cal-leyenda">
            <span class="ley-item"><span class="ley-dot hoy"></span>Hoy</span>
            <span class="ley-item"><span class="ley-dot alt"></span>Cons. Alt.</span>
            <span class="ley-item"><span class="ley-dot turno"></span>Con turnos</span>
          </div>
        </div>

        <!-- PANEL SLOTS + TURNOS -->
        <div class="turnos-panel">
          ${fechaSel ? Turnos._renderPanel(fechaSel) : Turnos._renderHint()}
        </div>

      </div>
    `;
  },

  _renderCeldas: (year, month, diasConTurnos, fechaSel) => {
    const hoy = Utils.hoy();
    return Calendario.diasDelMes(year, month).map(d => {
      if (d === null) return `<div class="cal-cell cal-empty"></div>`;

      const fecha = `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const dia   = Utils.diaSemana(fecha);
      const esLaboral = !!CONFIG.horarios[dia];
      const esAlt     = Calendario.esConsultorioAlt(fecha);
      const esHoy     = fecha === hoy;
      const esSel     = fecha === fechaSel;
      const cantidad  = diasConTurnos[fecha] || 0;

      return `<div class="cal-cell
          ${esLaboral ? "cal-laboral cal-clickable" : "cal-finde"}
          ${esHoy  ? "cal-hoy"  : ""}
          ${esSel  ? "cal-sel"  : ""}"
          ${esLaboral ? `onclick="Turnos.selFecha('${fecha}')"` : ""}>
        <span>${d}</span>
        <div class="cal-badges">
          ${esAlt     ? `<span class="cal-alt-dot" title="Cons. alternativo">★</span>` : ""}
          ${cantidad > 0 ? `<span class="cal-dot">${cantidad}</span>` : ""}
        </div>
      </div>`;
    }).join("");
  },

  _renderHint: () => `
    <div class="cal-hint">
      <p>👆 Seleccioná una fecha para ver los horarios disponibles</p>
    </div>`,

  _renderPanel: (fechaSel) => {
    const slots       = Calendario.slotsDisponibles(fechaSel);
    const turnosDia   = DB.turnos()
      .filter(t => t.fecha === fechaSel)
      .sort((a,b) => a.hora.localeCompare(b.hora));
    const esAlt = Calendario.esConsultorioAlt(fechaSel);

    return `
      <div class="dia-header">
        <div>
          <h2>${Utils.nombreDia(fechaSel)} ${Utils.formatFecha(fechaSel)}</h2>
          <span class="alt-badge ${esAlt ? "" : "normal"}">
            ${esAlt ? "★ " + CONFIG.localidades.alternativo : "📍 " + CONFIG.localidades.principal}
          </span>
        </div>
      </div>

      <section class="card" style="margin-bottom:16px">
        <h2>Horarios disponibles</h2>
        ${slots.length === 0
          ? '<p class="empty-state">Sin horarios laborales para este día.</p>'
          : `<div class="slots-grid">
              ${slots.map(s => `
                <div class="slot ${s.disponible ? "slot-libre" : "slot-ocupado"}"
                     ${s.disponible ? `onclick="Turnos.abrirNuevoTurno('${fechaSel}', '${s.hora}')"` : ""}>
                  <span class="slot-hora">${s.hora}</span>
                  <span class="slot-estado">
                    ${s.disponible ? "Libre" : (DB.getPaciente(s.turno?.pacienteId)?.nombre || "Ocupado")}
                  </span>
                </div>`).join("")}
            </div>`
        }
      </section>

      <section class="card">
        <h2>Turnos del día (${turnosDia.length})</h2>
        ${turnosDia.length === 0
          ? '<p class="empty-state">Sin turnos agendados.</p>'
          : turnosDia.map(t => {
              const p = DB.getPaciente(t.pacienteId);
              return `<div class="turno-item">
                <div class="turno-hora">${t.hora}</div>
                <div class="turno-info">
                  <strong>${p?.nombre || "—"}</strong>
                  <span>${t.tipo} · ${t.duracion} min</span>
                  ${t.notas ? `<em>${t.notas}</em>` : ""}
                </div>
                <div class="turno-acciones">
                  <span class="turno-badge ${t.estado}">${t.estado}</span>
                  ${t.estado !== "cancelado"
                    ? `<button class="btn-sm" onclick="Turnos.cancelar('${t.id}')">✕</button>`
                    : ""}
                </div>
              </div>`;
            }).join("")
        }
      </section>
    `;
  },

  // ─── Acciones ────────────────────────────────────────────

  cambiarMes: (dir) => {
    let { year, month } = Turnos._state;
    month += dir;
    if (month > 11) { month = 0; year++; }
    if (month < 0)  { month = 11; year--; }
    Turnos._state = { year, month, fechaSel: null };
    Router.recargar();
  },

  selFecha: (fecha) => {
    Turnos._state.fechaSel = fecha;
    Router.recargar();
  },

  abrirNuevoTurno: (fecha, horaPresel = "") => {
    const pacientes = DB.pacientes();
    const tipos     = ["Diagnóstico","Control","Plasma capilar","Mesoterapia","Tratamiento","Consulta"];
    const slots     = Calendario.slotsDisponibles(fecha).filter(s => s.disponible);

    Modal.abrir(Modal.wrap(`
      <h2>Nuevo turno</h2>
      <p style="text-align:center;color:var(--text-muted);font-size:0.85rem;margin-bottom:20px">
        ${Utils.nombreDia(fecha)} ${Utils.formatFecha(fecha)}
      </p>
      <div class="form-group">
        <label>Paciente *</label>
        <select id="nt-paciente">
          <option value="">Seleccionar...</option>
          ${pacientes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Horario *</label>
        <select id="nt-hora">
          <option value="">Seleccionar...</option>
          ${slots.map(s => `<option value="${s.hora}" ${s.hora === horaPresel ? "selected" : ""}>${s.hora}</option>`).join("")}
          ${slots.length === 0 ? '<option disabled>Sin horarios disponibles</option>' : ""}
        </select>
      </div>
      <div class="form-group">
        <label>Tipo de consulta</label>
        <select id="nt-tipo">${tipos.map(t => `<option>${t}</option>`).join("")}</select>
      </div>
      <div class="form-group">
        <label>Duración (min)</label>
        <input type="number" id="nt-duracion" value="60" min="30" step="30">
      </div>
      <div class="form-group">
        <label>Precio</label>
        <div class="input-precio-wrap">
          <span class="moneda-prefix">$</span>
          <input type="number" id="nt-precio"
                 value="${DB.getConfig().precioTurno || 0}" min="0" step="100">
        </div>
      </div>
      <div class="form-group">
        <label>Notas</label>
        <textarea id="nt-notas" placeholder="Motivo, indicaciones..."></textarea>
      </div>
      <button class="btn-primary" onclick="Turnos.guardar('${fecha}')">Agendar turno</button>
    `));
  },

  guardar: (fecha) => {
    const pacienteId = document.getElementById("nt-paciente").value;
    const hora       = document.getElementById("nt-hora").value;
    if (!pacienteId) return alert("Seleccioná un paciente.");
    if (!hora)       return alert("Seleccioná un horario.");

    const nuevo = {
      id: Utils.id("t"),
      pacienteId,
      fecha,
      hora,
      tipo:    document.getElementById("nt-tipo").value,
      duracion: parseInt(document.getElementById("nt-duracion").value),
      precio:  parseFloat(document.getElementById("nt-precio").value) || 0,
      notas:   document.getElementById("nt-notas").value,
      estado:  "confirmado"
    };

    const lista = DB.turnos();
    lista.push(nuevo);
    DB.set("turnos", lista);
    
    // Sincronizar con Google Calendar
    if (typeof GoogleCalendar !== 'undefined' && GoogleCalendar.estaConectado()) {
      GoogleCalendar.crearEvento(nuevo);
    }

    Turnos._state.fechaSel = fecha;
    Router.recargar();
    // Mostrar modal de tarjeta para enviar por WhatsApp
    setTimeout(() => TurnoCard.mostrarModal(nuevo), 120);
  },

  cancelar: (id) => {
    if (!confirm("¿Cancelar este turno?")) return;
    
    const turno = DB.turnos().find(t => t.id === id);
    if (turno && turno.gcal_id && typeof GoogleCalendar !== 'undefined') {
      GoogleCalendar.eliminarEvento(turno.gcal_id);
    }

    DB.actualizar("turnos", id, { estado: "cancelado" });
    Router.recargar();
  }
};
