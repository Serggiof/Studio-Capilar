// ============================================================
// ROUTER.JS — Navegación entre módulos
// ============================================================

const Router = {
  moduloActual: "dashboard",

  ir: (nombre) => {
    Router.moduloActual = nombre;

    document.querySelectorAll(".nav-item").forEach(el => {
      el.classList.toggle("active", el.dataset.modulo === nombre);
    });

    const main = document.getElementById("main-content");
    main.innerHTML = "";
    main.className = `modulo modulo-${nombre}`;

    const modulos = {
      dashboard: () => Dashboard.render(main),
      turnos:    () => Turnos.render(main),
      pacientes: () => Pacientes.render(main),
      inventario:() => Inventario.render(main),
      ventas:       () => Ventas.render(main),
      alertas:      () => Alertas.render(main),
      balance:      () => Balance.render(main),
      tratamientos: () => Tratamientos.render(main),
      configuracion:() => Configuracion.render(main)
    };

    modulos[nombre]?.();
    Router.actualizarBadge();
  },

  recargar: () => Router.ir(Router.moduloActual),

  actualizarBadge: () => {
    let count = 0;
    const anioActual = "2026";
    DB.ventas().forEach(v => {
      if (!v.contactado && Utils.esAlerta(v.proximaRecompra, 7)) {
        const y = new Date(v.proximaRecompra + "T12:00:00").getFullYear().toString();
        if (y === anioActual) count++;
      }
    });
    DB.sesionesPlasma().forEach(s => {
      if (!s.contactado && Utils.esAlerta(s.proximaAlerta, 5)) {
        const y = new Date(s.proximaAlerta + "T12:00:00").getFullYear().toString();
        if (y === anioActual) count++;
      }
    });
    DB.sesionesMeso().forEach(s => {
      if (!s.contactado && Utils.esAlerta(s.proximaAlerta, 5)) {
        const y = new Date(s.proximaAlerta + "T12:00:00").getFullYear().toString();
        if (y === anioActual) count++;
      }
    });
    const badge = document.getElementById("badge-alertas");
    if (badge) { badge.textContent = count; badge.style.display = count > 0 ? "flex" : "none"; }
  }
};

// ─── Modal global ────────────────────────────────────────────
const Modal = {
  abrir: (html) => {
    let c = document.getElementById("modal-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "modal-container";
      document.body.appendChild(c);
    }
    c.innerHTML = html;
  },

  cerrar: (event) => {
    if (event && !event.target.classList.contains("modal-overlay")) return;
    const c = document.getElementById("modal-container");
    if (c) c.innerHTML = "";
  },

  // Shortcut para armar el wrapper del modal
  wrap: (contenido, opciones = {}) => `
    <div class="modal-overlay" ${opciones.bloquearFondo ? '' : 'onclick="Modal.cerrar(event)"'}>
      <div class="modal ${opciones.grande ? 'modal-lg' : ''}">
        <button class="modal-close" onclick="Modal.cerrar()">✕</button>
        ${contenido}
      </div>
    </div>
  `
};
