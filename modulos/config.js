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

          <div class="config-field">
            <label>Prefijo país WhatsApp (Ej: 549 para Arg)</label>
            <input type="text" id="cfg-prefijo-wa"
                   value="${cfg.prefijoWa || ""}"
                   placeholder="Ej: 549">
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
            <label>Días del consultorio especial</label>
            <div id="cfg-dias-alt" style="display:flex; gap:10px; flex-wrap:wrap; margin-top:8px;">
              ${[1,2,3,4,5,6].map(d => {
                const checked = (cfg.diasAlternativos || [parseInt(cfg.diaAlternativo) || 3]).includes(d) ? "checked" : "";
                const nombre = ["","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"][d];
                return `<label style="display:flex; align-items:center; gap:4px; text-transform:none; font-weight:normal; letter-spacing:normal;"><input type="checkbox" value="${d}" ${checked}> ${nombre}</label>`;
              }).join("")}
            </div>
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
              ? `<p style="color: #2e7d32; font-weight: 500; margin-bottom: 12px;">✅ Conectado a Google Calendar</p>
                 <p style="font-size: 0.88rem; margin-top: -6px; margin-bottom: 16px; color: var(--text-muted);">
                   <strong>Cuenta:</strong> ${localStorage.getItem('gcal_email') || 'Obteniendo correo...'}
                 </p>
                 <button class="btn-outline" onclick="GoogleCalendar.desconectar()">Desconectar</button>`
              : '<p style="color: var(--text-muted); margin-bottom: 12px;">No estás conectado.</p><button class="btn-primary" onclick="GoogleCalendar.conectar()">Conectar con Google</button>'
            }
          </div>
        </section>

        <!-- Copias de Seguridad (Backup) -->
        <section class="card">
          <h2>💾 Copias de seguridad (Backup)</h2>
          <p class="config-desc">Exportá todos los pacientes, turnos e historias clínicas a un archivo, o importalos desde una copia de seguridad.</p>
          
          <div style="margin-top: 15px; display: flex; flex-direction: column; gap: 14px;">
            <div>
              <button class="btn-primary" onclick="Configuracion.exportarBackup()" style="width: 100%;">
                📥 Exportar Copia de Seguridad (.json)
              </button>
            </div>
            
            <div style="border-top: 1px solid var(--border); padding-top: 14px;">
              <label style="display: block; font-size: 0.78rem; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.04em;">
                Importar desde archivo JSON
              </label>
              <div style="display: flex; gap: 8px; align-items: center;">
                <input type="file" id="cfg-backup-file" accept=".json" style="font-size: 0.82rem; flex: 1;">
                <button class="btn-primary" onclick="Configuracion.importarBackup()" style="padding: 10px 14px; font-size: 0.85rem; font-weight: bold; border-radius: 6px;">
                  📤 Importar
                </button>
              </div>
              <p class="config-nota" id="cfg-backup-ok" style="display:none; margin-top: 8px;">
                ✅ Datos importados correctamente. Cargando...
              </p>
              <p class="config-nota" id="cfg-backup-err" style="display:none; margin-top: 8px; color: var(--alerta);">
                ❌ Error al importar: Archivo inválido.
              </p>
            </div>
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
    const diasAlternativos = Array.from(document.querySelectorAll('#cfg-dias-alt input:checked')).map(el => parseInt(el.value));

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

    DB.updateConfig({ duracionTurno, diasAlternativos, horariosPorDia });
    Configuracion._mostrarOk("cfg-horarios-ok");
    // No recargamos el módulo para que el usuario siga viendo la confirmación
  },

  guardarInfo: () => {
    const nombreConsultorio = document.getElementById("cfg-nombre").value.trim();
    const moneda = document.getElementById("cfg-moneda").value;
    const prefijoWa = document.getElementById("cfg-prefijo-wa").value.trim();
    DB.updateConfig({ nombreConsultorio, moneda, prefijoWa });
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

  exportarBackup: () => {
    const data = {
      pacientes:      DB.get("pacientes"),
      turnos:         DB.get("turnos"),
      productos:      DB.get("productos"),
      ventas:         DB.get("ventas"),
      sesionesPlasma: DB.get("sesionesPlasma"),
      sesionesMeso:   DB.get("sesionesMeso"),
      appConfig:      JSON.parse(localStorage.getItem("appConfig")) || {}
    };
    
    const jsonStr = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8" });
    const fechaStr = new Date().toISOString().split('T')[0];
    saveAs(blob, `backup_capilar_${fechaStr}.json`);
    Utils.mostrarToast("Copia de seguridad exportada correctamente");
  },

  importarBackup: () => {
    const fileInput = document.getElementById("cfg-backup-file");
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
      return Utils.mostrarToast("Por favor, seleccioná un archivo JSON primero.");
    }
    
    const file = fileInput.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // Validación de estructura para evitar romper la app
        if (!data.pacientes || !Array.isArray(data.pacientes)) {
          throw new Error("El archivo no contiene un formato de backup de pacientes válido.");
        }
        
        // Cargar colecciones de datos si vienen en el JSON
        if (data.pacientes)      DB.set("pacientes", data.pacientes);
        if (data.turnos)         DB.set("turnos", data.turnos);
        if (data.productos)      DB.set("productos", data.productos);
        if (data.ventas)         DB.set("ventas", data.ventas);
        if (data.sesionesPlasma) DB.set("sesionesPlasma", data.sesionesPlasma);
        if (data.sesionesMeso)   DB.set("sesionesMeso", data.sesionesMeso);
        
        if (data.appConfig && Object.keys(data.appConfig).length > 0) {
          localStorage.setItem("appConfig", JSON.stringify(data.appConfig));
        }
        
        const okMsg = document.getElementById("cfg-backup-ok");
        if (okMsg) okMsg.style.display = "block";
        Utils.mostrarToast("¡Copia de seguridad restaurada!");
        
        // Recargar la aplicación tras una breve demora
        setTimeout(() => {
          Router.ir("dashboard");
          window.location.reload();
        }, 1500);
        
      } catch (err) {
        console.error(err);
        const errMsg = document.getElementById("cfg-backup-err");
        if (errMsg) {
          errMsg.textContent = `❌ Error al importar: ${err.message || 'Archivo inválido.'}`;
          errMsg.style.display = "block";
          setTimeout(() => errMsg.style.display = "none", 5000);
        }
        Utils.mostrarToast("Error al importar el archivo de respaldo.");
      }
    };
    reader.readAsText(file);
  },

  resetearDatos: () => {
    if (!confirm("¿Seguro? Se van a borrar TODOS los datos y se va a cargar el mock de prueba.")) return;
    localStorage.clear();
    cargarMockSiEsNecesario();
    Router.ir("dashboard");
  }
};
