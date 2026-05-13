// ============================================================
// MODULOS/INVENTARIO.JS
// ============================================================

const Inventario = {
  render: (el) => {
    const productos = DB.productos();

    el.innerHTML = `
      <div class="modulo-header">
        <h1>📦 Inventario</h1>
        <button class="btn-primary" onclick="Inventario.abrirGestionProductos()">+ Nuevo producto</button>
      </div>

      <section class="card" style="margin-bottom:1.5rem; overflow-x: auto;">
        <h2>Stock disponible</h2>
        ${productos.length === 0
          ? '<p class="empty-state">Sin productos en inventario.</p>'
          : `<table class="tabla-ventas tabla-excel" style="width: 100%;">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Marca / Categoría</th>
                  <th style="text-align: center;">Stock</th>
                  <th style="text-align: right;">Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${productos.map(p => `
                  <tr class="${p.stock <= 3 ? "stock-bajo" : ""}" style="${p.stock <= 3 ? "background-color: var(--alerta-light);" : ""}">
                    <td style="font-weight: 600; color: var(--text);">${p.nombre}</td>
                    <td style="color: var(--text-muted);">${p.marca} · ${p.categoria}</td>
                    <td style="text-align: center; font-family: var(--font-display); font-weight: bold; font-size: 1.2rem; ${p.stock <= 3 ? "color: var(--alerta);" : "color: var(--primary);"}">${p.stock}</td>
                    <td style="text-align: right;">
                      <button class="btn-sm inv-btn-editar" style="width: auto; padding: 6px 12px;" onclick="Inventario.abrirEdicionRapida('${p.id}')">✏️ Editar</button>
                    </td>
                  </tr>
                `).join("")}
              </tbody>
            </table>`
        }
      </section>
    `;
  },

  abrirEdicionRapida: (id) => {
    const p = DB.getProducto(id);
    if (!p) return;
    
    Modal.abrir(Modal.wrap(`
      <h2>Editar Stock: ${p.nombre}</h2>
      <div class="form-group" style="margin-top: 15px;">
        <label>Cantidad en stock actual</label>
        <input type="number" id="edit-stock-rapido" value="${p.stock}" min="0" style="font-size: 1.5rem; text-align: center;">
      </div>
      <button class="btn-primary" style="width: 100%" onclick="Inventario.guardarEdicionRapida('${p.id}')">Guardar</button>
    `, { bloquearFondo: true }));
  },

  guardarEdicionRapida: (id) => {
    const nuevoStock = parseInt(document.getElementById("edit-stock-rapido").value) || 0;
    const lista = DB.productos().map(p =>
      p.id === id ? { ...p, stock: nuevoStock } : p
    );
    DB.set("productos", lista);
    Modal.cerrar();
    Router.recargar();
  },

  abrirGestionProductos: () => {
    Modal.abrir(Modal.wrap(`
      <h2>Agregar nuevo producto</h2>
      <div class="form-group"><label>Nombre *</label>
        <input type="text" id="ap-nombre" placeholder="Nombre del producto"></div>
      <div class="form-grid2">
        <div class="form-group"><label>Marca</label>
          <input type="text" id="ap-marca" placeholder="Marca"></div>
        <div class="form-group"><label>Categoría</label>
          <select id="ap-cat">
            ${["Shampoo","Acondicionador","Tratamiento","Medicamento","Serum","Otro"]
              .map(c => `<option>${c}</option>`).join("")}
          </select>
        </div>
      </div>
      <div class="form-grid2">
        <div class="form-group"><label>Precio venta ($)</label>
          <input type="number" id="ap-precio" placeholder="0" min="0"></div>
        <div class="form-group"><label>Precio costo ($)</label>
          <input type="number" id="ap-costo" placeholder="0" min="0"></div>
      </div>
      <div class="form-group"><label>Stock inicial</label>
        <input type="number" id="ap-stock" value="1" min="0"></div>
      <button class="btn-primary" onclick="Inventario.agregarProducto()">+ Agregar producto</button>
      
      <hr style="margin:20px 0;border-color:var(--border)">
      <h3 style="margin-bottom:14px;font-size:0.95rem">Opciones avanzadas</h3>
      <div id="prod-admin-lista">${Inventario._tablaProductosAvanzada(DB.productos())}</div>
      <button class="btn-primary" style="width: 100%; margin-top: 20px;" onclick="Modal.cerrar()">Guardar cambios</button>
    `, { bloquearFondo: true }));
  },

  _tablaProductosAvanzada: (productos) => {
    if (productos.length === 0) return '<p class="empty-state">Sin productos.</p>';
    return `<table class="tabla-ventas" style="font-size: 0.8rem;">
      <thead><tr><th>Nombre</th><th>Precio</th><th>Costo</th><th></th></tr></thead>
      <tbody>
        ${productos.map(p => `<tr>
          <td>${p.nombre}</td>
          <td><input type="number" class="input-inline" value="${p.precio}" min="0" style="width: 70px"
            onchange="Inventario.editarProducto('${p.id}','precio',this.value)"></td>
          <td><input type="number" class="input-inline" value="${p.costo||0}" min="0" style="width: 70px"
            onchange="Inventario.editarProducto('${p.id}','costo',this.value)"></td>
          <td><button class="btn-sm" onclick="Inventario.eliminarProducto('${p.id}')">✕</button></td>
        </tr>`).join("")}
      </tbody>
    </table>`;
  },

  agregarProducto: () => {
    const nombre = document.getElementById("ap-nombre").value.trim();
    if (!nombre) return Utils.mostrarToast("El nombre es obligatorio.");

    const nuevo = {
      id:        Utils.id("prod"),
      nombre,
      marca:     document.getElementById("ap-marca").value,
      categoria: document.getElementById("ap-cat").value,
      precio:    parseFloat(document.getElementById("ap-precio").value) || 0,
      costo:     parseFloat(document.getElementById("ap-costo").value)  || 0,
      stock:     parseInt(document.getElementById("ap-stock").value)    || 0
    };

    DB.set("productos", [...DB.productos(), nuevo]);
    Modal.cerrar();
    Router.recargar();
  },

  editarProducto: (id, campo, valor) => {
    const lista = DB.productos().map(p =>
      p.id === id ? { ...p, [campo]: parseFloat(valor) } : p
    );
    DB.set("productos", lista);
  },

  eliminarProducto: (id) => {
    if (!confirm("¿Seguro que querés eliminar este producto del sistema?")) return;
    DB.eliminar("productos", id);
    Modal.cerrar();
    Router.recargar();
  }
};
