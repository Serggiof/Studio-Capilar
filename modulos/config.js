// ============================================================
// MODULOS/CONFIG.JS — Panel de configuración (Admin)
// ============================================================

const Configuracion = {
  render: (el) => {
    const cfg = DB.getConfig();

    el.innerHTML = `
      <div class="modulo-header">
        <h1>⚙ Configuración</h1>
      </div>

      <div class="config-grid">

        <!-- Precios -->
        <section class="card">
          <h2>💰 Precios del consultorio</h2>
          <p class="config-desc">Estos precios se usan al registrar turnos y sesiones de plasma.</p>

          <div class="config-field">
            <label>Precio por turno</label>
            <div class="input-precio-wrap">
              <span class="moneda-prefix">$</span>
              <input type="number" id="cfg-precio-turno"
                     value="${cfg.precioTurno || 0}" min="0" step="100">
            </div>
          </div>

          <div class="config-field">
            <label>Precio por sesión de plasma</label>
            <div class="input-precio-wrap">
              <span class="moneda-prefix">$</span>
              <input type="number" id="cfg-precio-plasma"
                     value="${cfg.precioPlasma || 0}" min="0" step="100">
            </div>
          </div>

          <div class="config-field">
            <label>Precio por sesión de meso</label>
            <div class="input-precio-wrap">
              <span class="moneda-prefix">$</span>
              <input type="number" id="cfg-precio-meso"
                     value="${cfg.precioMeso || 0}" min="0" step="100">
            </div>
          </div>

          <button class="btn-primary" onclick="Configuracion.guardarPrecios()">
            Guardar precios
          </button>
          <p class="config-nota" id="cfg-precios-ok" style="display:none">
            ✅ Precios actualizados
          </p>
        </section>

        <!-- Info del consultorio -->
        <section class="card">
          <h2>🏥 Datos del consultorio</h2>

          <div class="config-field">
            <label>Nombre del consultorio</label>
            <input type="text" id="cfg-nombre"
                   value="${cfg.nombreConsultorio || ""}"
                   placeholder="Ej: Capilar Studio">
          </div>

          <div class="config-field">
            <label>Moneda</label>
            <select id="cfg-moneda">
              <option value="ARS" ${cfg.moneda === "ARS" ? "selected" : ""}>ARS — Peso argentino</option>
              <option value="USD" ${cfg.moneda === "USD" ? "selected" : ""}>USD — Dólar</option>
            </select>
          </div>

          <button class="btn-primary" onclick="Configuracion.guardarInfo()">
            Guardar datos
          </button>
          <p class="config-nota" id="cfg-info-ok" style="display:none">
            ✅ Datos actualizados
          </p>
        </section>

        <!-- Horarios por día -->
        <section class="card config-horarios">
          <h2>📅 Horarios por día</h2>
          <p class="config-desc">Activá cada día y configurá el horario de inicio y cierre de forma independiente. 📌 Listo para conectar con Google Calendar.</p>

          <div class="horario-dia-grid">
            <div class="horario-dia-header">
              <span>Día</span><span>Activo</span><span>Apertura</span><span>Cierre</span>
            </div>
            ${Configuracion._renderFilasDia(cfg.horariosPorDia)}
          </div>

          <div class="config-field" style="margin-top:16px">
            <label>Duración de cada turno (min)</label>
            <input type="number" id="cfg-duracion" value="${cfg.duracionTurno}" min="10" step="5" style="max-width:120px">
          </div>

          <div class="config-field">
            <label>Día del consultorio especial</label>
            <select id="cfg-dia-alt" style="max-width:200px">
              <option value="1" ${cfg.diaAlternativo == 1 ? "selected" : ""}>Lunes</option>
              <option value="2" ${cfg.diaAlternativo == 2 ? "selected" : ""}>Martes</option>
              <option value="3" ${cfg.diaAlternativo == 3 ? "selected" : ""}>Miércoles</option>
              <option value="4" ${cfg.diaAlternativo == 4 ? "selected" : ""}>Jueves</option>
              <option value="5" ${cfg.diaAlternativo == 5 ? "selected" : ""}>Viernes</option>
              <option value="6" ${cfg.diaAlternativo == 6 ? "selected" : ""}>Sábado</option>
            </select>
          </div>

          <button class="btn-primary" onclick="Configuracion.guardarHorarios()">
            Guardar horarios
          </button>
          <p class="config-nota" id="cfg-horarios-ok" style="display:none">
            ✅ Horarios actualizados
          </p>
        </section>

        <!-- Google Calendar -->
        <section class="card">
          <h2>🗓️ Sincronización con Google Calendar</h2>
          <p class="config-desc">Los turnos que crees o modifiques se reflejarán automáticamente en tu celular.</p>
          <div style="margin-top: 15px;">
            ${GoogleCalendar.estaConectado() 
              ? '<p style="color: var(--success); font-weight: 500; margin-bottom: 12px;">✅ Conectado a Google Calendar</p><button class="btn-outline" onclick="GoogleCalendar.desconectar()">Desconectar</button>'
              : '<p style="color: var(--text-muted); margin-bottom: 12px;">No estás conectado.</p><button class="btn-primary" onclick="GoogleCalendar.conectar()">Conectar con Google</button>'
            }
          </div>
        </section>

        <!-- Peligro -->
        <section class="card config-danger">
          <h2>⚠ Zona de riesgo</h2>
          <p class="config-desc">Estas acciones no se pueden deshacer.</p>
          <button class="btn-danger" onclick="Configuracion.resetearDatos()">
            🗑 Borrar todos los datos y recargar mock
          </button>
        </section>

      </div>
    `;
  },



  guardarPrecios: () => {
    const precioTurno  = parseFloat(document.getElementById("cfg-precio-turno").value) || 0;
    const precioPlasma = parseFloat(document.getElementById("cfg-precio-plasma").value) || 0;
    const precioMeso   = parseFloat(document.getElementById("cfg-precio-meso").value) || 0;
    DB.updateConfig({ precioTurno, precioPlasma, precioMeso });
    Configuracion._mostrarOk("cfg-precios-ok");
  },

  _renderFilasDia: (horariosPorDia) => {
    const dias = [
      { num: 1, nombre: "Lunes" },
      { num: 2, nombre: "Martes" },
      { num: 3, nombre: "Miércoles" },
      { num: 4, nombre: "Jueves" },
      { num: 5, nombre: "Viernes" },
      { num: 6, nombre: "Sábado" },
      { num: 0, nombre: "Domingo" },
    ];
    const h = horariosPorDia || {};
    return dias.map(d => {
      const cfg = h[d.num] || { activo: false, desde: "09:00", hasta: "18:00" };
      return `
        <div class="horario-dia-row" id="row-dia-${d.num}">
          <span class="horario-dia-nombre">${d.nombre}</span>
          <label class="toggle-switch">
            <input type="checkbox" id="dia-activo-${d.num}" ${cfg.activo ? "checked" : ""}
              onchange="Configuracion.toggleDia(${d.num})">
            <span class="toggle-slider"></span>
          </label>
          <input type="time" id="dia-desde-${d.num}" value="${cfg.desde}"
            class="time-input ${!cfg.activo ? 'disabled' : ''}" ${!cfg.activo ? 'disabled' : ''}>
          <input type="time" id="dia-hasta-${d.num}" value="${cfg.hasta}"
            class="time-input ${!cfg.activo ? 'disabled' : ''}" ${!cfg.activo ? 'disabled' : ''}>
        </div>`;
    }).join("");
  },

  toggleDia: (numDia) => {
    const activo = document.getElementById(`dia-activo-${numDia}`).checked;
    const desde  = document.getElementById(`dia-desde-${numDia}`);
    const hasta  = document.getElementById(`dia-hasta-${numDia}`);
    desde.disabled = !activo;
    hasta.disabled = !activo;
    desde.classList.toggle("disabled", !activo);
    hasta.classList.toggle("disabled", !activo);
  },

  guardarHorarios: () => {
    const duracionTurno  = parseInt(document.getElementById("cfg-duracion").value) || 60;
    const diaAlternativo = parseInt(document.getElementById("cfg-dia-alt").value) || 3;

    const horariosPorDia = {};
    [0, 1, 2, 3, 4, 5, 6].forEach(d => {
      const activoEl = document.getElementById(`dia-activo-${d}`);
      const desdeEl  = document.getElementById(`dia-desde-${d}`);
      const hastaEl  = document.getElementById(`dia-hasta-${d}`);
      if (!activoEl) return;
      horariosPorDia[d] = {
        activo: activoEl.checked,
        desde:  desdeEl.value  || "09:00",
        hasta:  hastaEl.value  || "18:00",
      };
    });

    DB.updateConfig({ duracionTurno, diaAlternativo, horariosPorDia });
    Configuracion._mostrarOk("cfg-horarios-ok");
    // No recargamos el módulo para que el usuario siga viendo la confirmación
  },

  guardarInfo: () => {
    const nombreConsultorio = document.getElementById("cfg-nombre").value.trim();
    const moneda = document.getElementById("cfg-moneda").value;
    DB.updateConfig({ nombreConsultorio, moneda });
    // Actualizar el logo del sidebar si cambió el nombre
    const logo = document.querySelector(".sidebar-logo h2");
    if (logo && nombreConsultorio) logo.textContent = nombreConsultorio;
    Configuracion._mostrarOk("cfg-info-ok");
  },

  _mostrarOk: (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.display = "block";
    setTimeout(() => el.style.display = "none", 2500);
  },

  resetearDatos: () => {
    if (!confirm("¿Seguro? Se van a borrar TODOS los datos y se va a cargar el mock de prueba.")) return;
    localStorage.clear();
    cargarMockSiEsNecesario();
    Router.ir("dashboard");
  }
};
