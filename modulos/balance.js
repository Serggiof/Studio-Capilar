// ============================================================
// MODULOS/BALANCE.JS
// ============================================================

const Balance = {
  filtroTemporal: 'mes', // 'mes' o 'semestre'

  // Helpers de cálculo para el mes actual
  _calcBalanceMes: (fechaBase = new Date()) => {
    const mesBase = `${fechaBase.getFullYear()}-${String(fechaBase.getMonth()+1).padStart(2,"0")}`;

    const ventasMes = DB.ventas().filter(v => v.fecha.startsWith(mesBase));
    const totalProductos = ventasMes.reduce((acc, v) => acc + v.precioTotal, 0);

    const costoMes = ventasMes.reduce((acc, v) => {
      const prod = DB.getProducto(v.productoId);
      return acc + (prod?.costo || 0) * v.cantidad;
    }, 0);
    const gananciaMes = totalProductos - costoMes;

    const turnosMes = DB.turnos().filter(t =>
      t.fecha.startsWith(mesBase) && t.estado === "confirmado" && t.precio
    );
    const totalTurnos = turnosMes.reduce((acc, t) => acc + (t.precio || 0), 0);

    // Plasma
    let totalTratamientos = 0;
    DB.sesionesPlasma().forEach(plan => {
      plan.sesiones.forEach(s => {
        if (s.fecha?.startsWith(mesBase) && s.precio) totalTratamientos += s.precio;
      });
    });
    // Meso
    DB.sesionesMeso().forEach(plan => {
      plan.sesiones.forEach(s => {
        if (s.fecha?.startsWith(mesBase) && s.precio) totalTratamientos += s.precio;
      });
    });

    return {
      totalProductos,
      totalTurnos,
      totalTratamientos,
      costoMes,
      gananciaMes,
      totalMes: totalProductos + totalTurnos + totalTratamientos,
      cantVentas: ventasMes.length,
      cantTurnos: turnosMes.length,
    };
  },

  _calcBalanceSemestre: () => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const esPrimerSemestre = hoy.getMonth() < 6; // 0-5 = Ene-Jun, 6-11 = Jul-Dic

    const mesesSemestre = esPrimerSemestre 
        ? ["01","02","03","04","05","06"].map(m => `${year}-${m}`)
        : ["07","08","09","10","11","12"].map(m => `${year}-${m}`);

    let totalProductos = 0, totalTurnos = 0, totalTratamientos = 0, costoSemestre = 0, cantVentas = 0, cantTurnos = 0;

    mesesSemestre.forEach(mesBase => {
      const ventasMes = DB.ventas().filter(v => v.fecha.startsWith(mesBase));
      totalProductos += ventasMes.reduce((acc, v) => acc + v.precioTotal, 0);
      cantVentas += ventasMes.length;

      costoSemestre += ventasMes.reduce((acc, v) => {
        const prod = DB.getProducto(v.productoId);
        return acc + (prod?.costo || 0) * v.cantidad;
      }, 0);

      const turnosMes = DB.turnos().filter(t => t.fecha.startsWith(mesBase) && t.estado === "confirmado" && t.precio);
      totalTurnos += turnosMes.reduce((acc, t) => acc + (t.precio || 0), 0);
      cantTurnos += turnosMes.length;

      DB.sesionesPlasma().forEach(plan => {
        plan.sesiones.forEach(s => {
          if (s.fecha?.startsWith(mesBase) && s.precio) totalTratamientos += s.precio;
        });
      });
      DB.sesionesMeso().forEach(plan => {
        plan.sesiones.forEach(s => {
          if (s.fecha?.startsWith(mesBase) && s.precio) totalTratamientos += s.precio;
        });
      });
    });

    return {
      totalProductos,
      totalTurnos,
      totalTratamientos,
      costoMes: costoSemestre,
      gananciaMes: totalProductos - costoSemestre,
      totalMes: totalProductos + totalTurnos + totalTratamientos,
      cantVentas,
      cantTurnos,
      titulo: esPrimerSemestre ? `Semestre 1 (Ene-Jun ${year})` : `Semestre 2 (Jul-Dic ${year})`
    };
  },

  _calcTotalesHistoricos: () => {
    const ventas = DB.ventas();
    const totalFacturado = ventas.reduce((acc, v) => acc + v.precioTotal, 0);
    const totalCosto = ventas.reduce((acc, v) => {
      const prod = DB.getProducto(v.productoId);
      return acc + (prod?.costo || 0) * v.cantidad;
    }, 0);
    return {
      totalFacturado,
      totalCosto,
      totalGanancia: totalFacturado - totalCosto,
      margen: totalFacturado > 0 ? ((totalFacturado - totalCosto) / totalFacturado * 100) : 0
    };
  },

  _calcPorProducto: () => {
    const mapa = {};
    DB.ventas().forEach(v => {
      if (!mapa[v.productoId]) {
        const prod = DB.getProducto(v.productoId);
        mapa[v.productoId] = { nombre: prod?.nombre || "—", cantidad: 0, total: 0, costo: 0 };
      }
      const prod = DB.getProducto(v.productoId);
      mapa[v.productoId].cantidad += v.cantidad;
      mapa[v.productoId].total   += v.precioTotal;
      mapa[v.productoId].costo   += (prod?.costo || 0) * v.cantidad;
    });
    return Object.values(mapa)
      .map(p => ({ ...p, ganancia: p.total - p.costo }))
      .sort((a, b) => b.ganancia - a.ganancia);
  },

  cambiarFiltro: (filtro) => {
    Balance.filtroTemporal = filtro;
    Router.recargar();
  },

  render: (el) => {
    const balance = Balance.filtroTemporal === 'mes' ? Balance._calcBalanceMes() : Balance._calcBalanceSemestre();
    const tituloBalance = Balance.filtroTemporal === 'mes' ? "Balance del mes actual" : balance.titulo;
    const historicos = Balance._calcTotalesHistoricos();
    const porProducto  = Balance._calcPorProducto();

    el.innerHTML = `
      <div class="modulo-header">
        <h1>📊 Balance</h1>
      </div>

      <div class="tabs" style="margin-bottom: 20px;">
        <button class="tab-btn ${Balance.filtroTemporal === 'mes' ? 'active' : ''}" onclick="Balance.cambiarFiltro('mes')">Mes actual</button>
        <button class="tab-btn ${Balance.filtroTemporal === 'semestre' ? 'active' : ''}" onclick="Balance.cambiarFiltro('semestre')">Semestre en curso</button>
      </div>

      <!-- KPI CARDS HISTÓRICOS -->
      <div class="kpi-cards">
        <div class="kpi-card">
          <span class="kpi-label">Total facturado</span>
          <span class="kpi-valor">$${historicos.totalFacturado.toLocaleString("es-AR")}</span>
          <span class="kpi-sub">histórico acumulado en productos</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total en costos</span>
          <span class="kpi-valor">$${historicos.totalCosto.toLocaleString("es-AR")}</span>
          <span class="kpi-sub">histórico acumulado en productos</span>
        </div>
        <div class="kpi-card kpi-card--ganancia">
          <span class="kpi-label">Ganancia neta</span>
          <span class="kpi-valor">$${historicos.totalGanancia.toLocaleString("es-AR")}</span>
          <span class="kpi-sub">histórico acumulado</span>
        </div>
        <div class="kpi-card kpi-card--ganancia">
          <span class="kpi-label">Margen promedio</span>
          <span class="kpi-valor">${historicos.margen.toFixed(1)}%</span>
          <span class="kpi-sub">sobre ventas de productos</span>
        </div>
      </div>

      <!-- BALANCE PERIODO -->
      <section class="card balance-card">
        <h2>${tituloBalance}</h2>
        <div class="balance-grid">
          <div class="balance-total">
            <span class="balance-label">Total ingresado</span>
            <span class="balance-monto">$${balance.totalMes.toLocaleString("es-AR")}</span>
            <span class="balance-ganancia">Ganancia productos: $${balance.gananciaMes.toLocaleString("es-AR")}</span>
          </div>
          <div class="balance-desglose">
            <div class="balance-item">
              <span class="balance-ico">📦</span>
              <div>
                <span class="balance-concepto">Productos</span>
                <span class="balance-sub">${balance.cantVentas} ventas · costo $${balance.costoMes.toLocaleString("es-AR")}</span>
              </div>
              <span class="balance-valor">$${balance.totalProductos.toLocaleString("es-AR")}</span>
            </div>
            <div class="balance-item">
              <span class="balance-ico">📅</span>
              <div>
                <span class="balance-concepto">Turnos</span>
                <span class="balance-sub">${balance.cantTurnos} confirmados</span>
              </div>
              <span class="balance-valor">$${balance.totalTurnos.toLocaleString("es-AR")}</span>
            </div>
            <div class="balance-item">
              <span class="balance-ico">💉</span>
              <div>
                <span class="balance-concepto">Tratamientos</span>
                <span class="balance-sub">sesiones de plasma y meso</span>
              </div>
              <span class="balance-valor">$${balance.totalTratamientos.toLocaleString("es-AR")}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- INGRESOS POR PRODUCTO (HISTÓRICO) -->
      <section class="card" style="margin-top: 1.5rem">
        <h2>Ingresos por producto</h2>
        ${porProducto.length === 0
          ? '<p class="empty-state">Sin ventas registradas.</p>'
          : porProducto.map((p, i) => `
            <div class="prod-ranking-item">
              <span class="prod-rank">${i + 1}</span>
              <div class="prod-rank-info">
                <strong>${p.nombre}</strong>
                <span>${p.cantidad} unid. · ganancia $${p.ganancia.toLocaleString("es-AR")}</span>
              </div>
              <span class="prod-rank-total">$${p.total.toLocaleString("es-AR")}</span>
            </div>`).join("")
        }
      </section>
    `;
  }
};
