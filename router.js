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
    DB.ventas().forEach(v => { if (Utils.esAlerta(v.proximaRecompra, 7)) count++; });
    DB.sesionesPlasma().forEach(s => { if (Utils.esAlerta(s.proximaAlerta, 5)) count++; });
    DB.sesionesMeso().forEach(s => { if (Utils.esAlerta(s.proximaAlerta, 5)) count++; });
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
      <div class="modal">
        <button class="modal-close" onclick="Modal.cerrar()">✕</button>
        ${contenido}
      </div>
    </div>
  `
};
