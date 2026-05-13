// ============================================================
// MODULOS/VENTAS.JS
// ============================================================

const Ventas = {
  filtroActual: 'mes', // 'dia', 'semana', 'mes'

  _formatMes: (isoMes) => {
    const [y, m] = isoMes.split("-");
    const nombres = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    return `${nombres[parseInt(m)]} ${y}`;
  },

  _esFechaEnFiltro: (fechaIso) => {
    if (!fechaIso) return false;
    const hoy = new Date();
    const target = new Date(fechaIso + "T12:00:00");
    
    if (Ventas.filtroActual === 'dia') {
      return target.toISOString().split("T")[0] === hoy.toISOString().split("T")[0];
    } else if (Ventas.filtroActual === 'semana') {
      // Semana actual (lunes a domingo)
      const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1; // 0 Lunes, 6 Domingo
      const inicioSemana = new Date(hoy);
      inicioSemana.setDate(hoy.getDate() - diaSemana);
      inicioSemana.setHours(0,0,0,0);
      const finSemana = new Date(inicioSemana);
      finSemana.setDate(inicioSemana.getDate() + 6);
      finSemana.setHours(23,59,59,999);
      return target >= inicioSemana && target <= finSemana;
    } else {
      // Mes
      return target.getFullYear() === hoy.getFullYear() && target.getMonth() === hoy.getMonth();
    }
  },

  render: (el) => {
    const productos = DB.productos();
    const ventas = DB.ventas().filter(v => Ventas._esFechaEnFiltro(v.fecha));
    const todosVentas = DB.ventas();

    const ventasConInfo = todosVentas.map(v => ({
      ...v,
      paciente:    DB.getPaciente(v.pacienteId),
      producto:    DB.getProducto(v.productoId),
      diasRecompra: Utils.diasHasta(v.proximaRecompra)
    })).sort((a, b) => a.diasRecompra - b.diasRecompra);

    el.innerHTML = `
      <div class="modulo-header">
        <h1>🛒 Ventas</h1>
        <div class="header-btns">
          <button class="btn-primary" onclick="Ventas.abrirNuevaVenta()">+ Nueva venta</button>
        </div>
      </div>

      <div class="tabs" style="margin-bottom: 20px;">
        <button class="tab-btn ${Ventas.filtroActual === 'dia' ? 'active' : ''}" onclick="Ventas.cambiarFiltro('dia')">Hoy</button>
        <button class="tab-btn ${Ventas.filtroActual === 'semana' ? 'active' : ''}" onclick="Ventas.cambiarFiltro('semana')">Esta Semana</button>
        <button class="tab-btn ${Ventas.filtroActual === 'mes' ? 'active' : ''}" onclick="Ventas.cambiarFiltro('mes')">Este Mes</button>
      </div>

      <!-- HISTORIAL -->
      <section class="card" style="margin-bottom: 1.5rem">
        <h2>Historial de ventas</h2>

        <!-- Buscador y filtros -->
        <div class="historial-filtros">
          <input
            type="text"
            id="buscar-venta"
            class="historial-buscar"
            placeholder="Buscar paciente o producto..."
            oninput="Ventas.filtrarHistorial()"
          >
        </div>

        <div class="historial-scroll">
          <table class="tabla-ventas" id="tabla-historial">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Paciente</th>
                <th>Producto</th>
                <th>Cant.</th>
                <th>Venta</th>
                <th>Costo</th>
                <th>Ganancia</th>
                <th>Recompra</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="historial-body">
              ${Ventas._renderFilasHistorial(ventas)}
            </tbody>
          </table>
        </div>

        <div class="historial-footer">
          <span id="historial-count">${ventas.length} venta${ventas.length !== 1 ? "s" : ""}</span>
          <div class="historial-chips">
            <span class="chip" id="chip-facturado">
              Facturado: $${ventas.reduce((s,v)=>s+v.precioTotal,0).toLocaleString("es-AR")}
            </span>
          </div>
        </div>
      </section>


      <!-- RECOMPRAS -->
      <section class="card">
        <h2>Recordatorios de recompra</h2>
        <div class="recompra-lista">
          ${ventasConInfo.length === 0
            ? '<p class="empty-state">Sin ventas registradas.</p>'
            : ventasConInfo.map(v => {
                const prefijo = DB.getConfig().prefijoWa || '';
                let tel = v.paciente?.telefono ? v.paciente.telefono.replace(/\D/g, '') : '';
                if (tel && prefijo && !tel.startsWith(prefijo)) tel = prefijo + tel;
                const msj = encodeURIComponent('Hola ' + (v.paciente?.nombre || '') + ', ¿cómo viene ese progreso? ¿Te está quedando poco producto?');
                const waBtn = tel
                  ? '<a href="https://wa.me/' + tel + '?text=' + msj + '" target="_blank" title="Enviar WhatsApp" '
                    + 'style="text-decoration:none; display:flex; align-items:center; filter:grayscale(100%); transition:filter 0.2s;" '
                    + 'onmouseover="this.style.filter=\'grayscale(0%)\'" onmouseout="this.style.filter=\'grayscale(100%)\'">'
                    + '<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" width="28" height="28">'
                    + '</a>'
                  : '';
                const estado = v.diasRecompra <= 0 ? 'recompra-vencida' : v.diasRecompra <= 7 ? 'recompra-proxima' : '';
                const diasClass = v.diasRecompra <= 0 ? 'dias-vencida' : v.diasRecompra <= 7 ? 'dias-proxima' : '';
                const diasText = v.diasRecompra <= 0 ? 'Venció' : 'En ' + v.diasRecompra + ' días';
                return '<div class="recompra-item ' + estado + '">'
                  + '<div class="recompra-main">'
                  + '<div style="display:flex; align-items:center; gap:8px;">'
                  + '<strong>' + (v.paciente?.nombre || '—') + '</strong>'
                  + waBtn
                  + '</div>'
                  + '<span>' + (v.producto?.nombre || '—') + '</span>'
                  + '</div>'
                  + '<div class="recompra-meta">'
                  + '<span class="recompra-fecha">' + Utils.formatFecha(v.proximaRecompra) + '</span>'
                  + '<span class="recompra-dias ' + diasClass + '">' + diasText + '</span>'
                  + '</div>'
                  + '<button class="btn-sm" onclick="Ventas.eliminar(\'' + v.id + '\')">✕</button>'
                  + '</div>';
              }).join('')}
        </div>
      </section>
    `;
  },

  cambiarFiltro: (nuevoFiltro) => {
    Ventas.filtroActual = nuevoFiltro;
    Router.recargar();
  },

  _renderFilasHistorial: (ventas) => {
    if (!ventas.length) return '<tr><td colspan="9" class="empty-state">Sin ventas.</td></tr>';
    return ventas.map(v => {
      const p    = DB.getPaciente(v.pacienteId);
      const prod = DB.getProducto(v.productoId);
      const dias = Utils.diasHasta(v.proximaRecompra);
      const costo    = (prod?.costo || 0) * v.cantidad;
      const ganancia = v.precioTotal - costo;
      const estado   = dias <= 0 ? "vencida" : dias <= 7 ? "proxima" : "ok";
      return `<tr class="row-${estado}" data-paciente="${p?.nombre||""}" data-producto="${prod?.nombre||""}" data-estado="${estado}">
        <td>${Utils.formatFecha(v.fecha)}</td>
        <td>${p?.nombre || "—"}</td>
        <td>${prod?.nombre || "—"}</td>
        <td>${v.cantidad}</td>
        <td>$${v.precioTotal.toLocaleString("es-AR")}</td>
        <td class="text-muted">$${costo.toLocaleString("es-AR")}</td>
        <td class="${ganancia >= 0 ? "text-ganancia" : "text-alerta"}">$${ganancia.toLocaleString("es-AR")}</td>
        <td class="${dias <= 0 ? "text-alerta" : dias <= 7 ? "text-warning" : ""}">
          ${Ventas._badgeRecompra(dias)}
        </td>
        <td><button class="btn-sm" onclick="Ventas.eliminar('${v.id}')">✕</button></td>
      </tr>`;
    }).join("");
  },

  _badgeRecompra: (dias) => {
    if (dias <= 0) return `<span class="badge badge-vencida">Vencida</span>`;
    if (dias <= 7) return `<span class="badge badge-proxima">En ${dias}d</span>`;
    return `<span class="badge badge-ok">En ${dias}d</span>`;
  },

  filtrarHistorial: () => {
    const txt    = document.getElementById("buscar-venta")?.value.toLowerCase() || "";
    const filas  = document.querySelectorAll("#historial-body tr[data-paciente]");

    let visibles = 0;
    let totalFac = 0, totalGan = 0;

    filas.forEach(tr => {
      const pac  = tr.dataset.paciente.toLowerCase();
      const prod = tr.dataset.producto.toLowerCase();
      
      const visible  = !txt || pac.includes(txt) || prod.includes(txt);

      tr.style.display = visible ? "" : "none";

      if (visible) {
        visibles++;
        const celdas = tr.querySelectorAll("td");
        totalFac += parseFloat(celdas[4]?.textContent.replace(/[^0-9]/g,"")) || 0;
      }
    });

    const countEl = document.getElementById("historial-count");
    const facEl   = document.getElementById("chip-facturado");

    if (countEl) countEl.textContent = `${visibles} venta${visibles !== 1 ? "s" : ""}`;
    if (facEl)   facEl.textContent   = `Facturado: $${totalFac.toLocaleString("es-AR")}`;
  },

  abrirNuevaVenta: () => {
    const pacientes = DB.pacientes();
    const productos = DB.productos();

    Modal.abrir(Modal.wrap(`
      <h2>Registrar venta</h2>
      <div class="form-group">
        <label>Paciente *</label>
        <select id="nv-paciente">
          <option value="">Seleccionar...</option>
          ${pacientes.map(p => `<option value="${p.id}">${p.nombre}</option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Producto *</label>
        <select id="nv-producto" onchange="Ventas.calcularTotal()">
          <option value="">Seleccionar...</option>
          ${productos.map(p => `<option value="${p.id}" data-precio="${p.precio}" data-costo="${p.costo||0}">
            ${p.nombre} — $${p.precio.toLocaleString("es-AR")} (stock: ${p.stock})
          </option>`).join("")}
        </select>
      </div>
      <div class="form-group">
        <label>Cantidad</label>
        <input type="number" id="nv-cantidad" value="1" min="1" onchange="Ventas.calcularTotal()">
      </div>
      <div class="form-group">
        <label>Total venta</label>
        <div class="precio-display" id="nv-total">$0</div>
      </div>
      <div class="form-group">
        <label>Ganancia estimada</label>
        <div class="precio-display text-ganancia" id="nv-ganancia">$0</div>
      </div>
      <div class="form-group">
        <label>Próxima recompra (días desde hoy)</label>
        <input type="number" id="nv-recompra" value="30" min="1">
      </div>
      <button class="btn-primary" onclick="Ventas.guardar()">Registrar venta</button>
    `, { bloquearFondo: true }));
  },

  calcularTotal: () => {
    const sel    = document.getElementById("nv-producto");
    const opt    = sel.options[sel.selectedIndex];
    const precio = parseFloat(opt?.dataset.precio || 0);
    const costo  = parseFloat(opt?.dataset.costo  || 0);
    const cant   = parseInt(document.getElementById("nv-cantidad").value) || 1;

    const elTotal   = document.getElementById("nv-total");
    const elGanancia = document.getElementById("nv-ganancia");

    if (elTotal)    elTotal.textContent    = `$${(precio * cant).toLocaleString("es-AR")}`;
    if (elGanancia) elGanancia.textContent = `$${((precio - costo) * cant).toLocaleString("es-AR")}`;
  },

  guardar: () => {
    const pacienteId = document.getElementById("nv-paciente").value;
    const productoId = document.getElementById("nv-producto").value;
    const cantidad   = parseInt(document.getElementById("nv-cantidad").value);
    const dias       = parseInt(document.getElementById("nv-recompra").value);

    if (!pacienteId || !productoId) return Utils.mostrarToast("Completá paciente y producto.");

    const producto = DB.getProducto(productoId);
    const recompra = new Date();
    recompra.setDate(recompra.getDate() + dias);

    const nueva = {
      id: Utils.id("v"),
      pacienteId,
      productoId,
      cantidad,
      fecha: Utils.hoy(),
      precioTotal: producto.precio * cantidad,
      proximaRecompra: recompra.toISOString().split("T")[0]
    };

    DB.set("ventas", [...DB.ventas(), nueva]);

    const prods = DB.productos().map(p =>
      p.id === productoId ? { ...p, stock: Math.max(0, p.stock - cantidad) } : p
    );
    DB.set("productos", prods);

    Modal.cerrar();
    Router.recargar();
    Router.actualizarBadge();
  },

  eliminar: (id) => {
    if (!confirm("¿Eliminar esta venta?")) return;
    DB.eliminar("ventas", id);
    Router.recargar();
    Router.actualizarBadge();
  },


};
