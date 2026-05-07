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

  _calcHistoricoMensual: () => {
    const mapa = {};
    const nombresMeses = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    
    const procesar = (fechaISO, facturado, costo, ganancia) => {
      if (!fechaISO) return;
      const mes = fechaISO.substring(0, 7);
      if (!mapa[mes]) {
        const dateParts = mes.split('-');
        const nombreMes = `${nombresMeses[parseInt(dateParts[1])-1]} ${dateParts[0]}`;
        mapa[mes] = { mes, nombreMes, facturado: 0, costo: 0, ganancia: 0, cantProductos: 0, cantPlasma: 0, cantMeso: 0, cantTurnos: 0 };
      }
      mapa[mes].facturado += facturado;
      mapa[mes].costo += costo;
      mapa[mes].ganancia += ganancia;
      return mapa[mes];
    };

    DB.ventas().forEach(v => {
       const prod = DB.getProducto(v.productoId);
       const costo = (prod?.costo || 0) * v.cantidad;
       const m = procesar(v.fecha, v.precioTotal, costo, v.precioTotal - costo);
       if (m) m.cantProductos += v.cantidad;
    });

    DB.turnos().forEach(t => {
       if (t.estado === "confirmado" && t.precio) {
         const m = procesar(t.fecha, t.precio, 0, t.precio);
         if (m) m.cantTurnos++;
       }
    });

    DB.sesionesPlasma().forEach(plan => {
      plan.sesiones.forEach(s => {
        if (s.fecha && s.precio) {
           const m = procesar(s.fecha, s.precio, 0, s.precio);
           if (m) m.cantPlasma++;
        }
      });
    });
    DB.sesionesMeso().forEach(plan => {
      plan.sesiones.forEach(s => {
        if (s.fecha && s.precio) {
           const m = procesar(s.fecha, s.precio, 0, s.precio);
           if (m) m.cantMeso++;
        }
      });
    });

    return Object.values(mapa).sort((a,b) => b.mes.localeCompare(a.mes));
  },

  exportarExcelMes: async (mesYYYYMM) => {
    if (typeof ExcelJS === 'undefined') return Utils.mostrarToast("Error: Librería ExcelJS no cargada");
    
    const detalleVentas = DB.ventas().filter(v => v.fecha.startsWith(mesYYYYMM)).map(v => {
      const prod = DB.getProducto(v.productoId);
      const paciente = DB.getPaciente(v.pacienteId);
      const costo = (prod?.costo || 0) * v.cantidad;
      return {
        "Tipo": "Venta de Producto",
        "Fecha": Utils.formatFecha(v.fecha),
        "Paciente": paciente?.nombre || "N/A",
        "Concepto": prod?.nombre || "Producto",
        "Cantidad": v.cantidad,
        "Ingreso": v.precioTotal,
        "Costo": costo,
        "Ganancia": v.precioTotal - costo
      };
    });

    const detalleTurnos = DB.turnos().filter(t => t.fecha.startsWith(mesYYYYMM) && t.estado === "confirmado" && t.precio).map(t => {
      const paciente = DB.getPaciente(t.pacienteId);
      return {
        "Tipo": "Turno Confirmado",
        "Fecha": Utils.formatFecha(t.fecha),
        "Paciente": paciente?.nombre || "N/A",
        "Concepto": t.tipo || "Turno",
        "Cantidad": 1,
        "Ingreso": t.precio,
        "Costo": 0,
        "Ganancia": t.precio
      };
    });

    const detallePlasma = [];
    DB.sesionesPlasma().forEach(plan => {
      plan.sesiones.forEach(s => {
        if (s.fecha && s.fecha.startsWith(mesYYYYMM) && s.precio) {
          const paciente = DB.getPaciente(plan.pacienteId);
          detallePlasma.push({
            "Tipo": "Sesión Plasma",
            "Fecha": Utils.formatFecha(s.fecha),
            "Paciente": paciente?.nombre || "N/A",
            "Concepto": "Plasma Capilar",
            "Cantidad": 1,
            "Ingreso": s.precio,
            "Costo": 0,
            "Ganancia": s.precio
          });
        }
      });
    });

    const detalleMeso = [];
    DB.sesionesMeso().forEach(plan => {
      plan.sesiones.forEach(s => {
        if (s.fecha && s.fecha.startsWith(mesYYYYMM) && s.precio) {
          const paciente = DB.getPaciente(plan.pacienteId);
          detalleMeso.push({
            "Tipo": "Sesión Mesoterapia",
            "Fecha": Utils.formatFecha(s.fecha),
            "Paciente": paciente?.nombre || "N/A",
            "Concepto": "Mesoterapia",
            "Cantidad": 1,
            "Ingreso": s.precio,
            "Costo": 0,
            "Ganancia": s.precio
          });
        }
      });
    });

    const todos = [...detalleVentas, ...detalleTurnos, ...detallePlasma, ...detalleMeso];
    todos.sort((a,b) => {
      const d1 = a.Fecha.split('/').reverse().join('');
      const d2 = b.Fecha.split('/').reverse().join('');
      return d1.localeCompare(d2);
    });

    const totalIngreso = todos.reduce((a,b) => a + b.Ingreso, 0);
    const totalCosto = todos.reduce((a,b) => a + b.Costo, 0);
    const totalGanancia = todos.reduce((a,b) => a + b.Ganancia, 0);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Studio Capilar';
    wb.created = new Date();

    // --- HOJA 1: RESUMEN GENERAL ---
    const wsResumen = wb.addWorksheet('Resumen General');
    wsResumen.columns = [
      { header: 'CONCEPTO', key: 'concepto', width: 30 },
      { header: 'VALOR ($)', key: 'valor', width: 25 }
    ];
    
    // Estilos de cabecera
    wsResumen.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
    wsResumen.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2E7D32' } };
    wsResumen.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    wsResumen.addRow({ concepto: "Total Facturado", valor: totalIngreso });
    wsResumen.addRow({ concepto: "Costos de Productos", valor: totalCosto });
    
    const rowGanancia = wsResumen.addRow({ concepto: "GANANCIA NETA", valor: totalGanancia });
    rowGanancia.font = { bold: true, color: { argb: 'FF1B5E20' }, size: 14 };
    rowGanancia.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } };

    // Bordes resumen
    wsResumen.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = { top: {style:'thin'}, left: {style:'thin'}, bottom: {style:'thin'}, right: {style:'thin'} };
      });
    });

    // --- HOJA 2: DETALLE ---
    const wsDetalle = wb.addWorksheet('Detalle Movimientos');
    wsDetalle.columns = [
      { header: 'TIPO', key: 'tipo', width: 22 },
      { header: 'FECHA', key: 'fecha', width: 14 },
      { header: 'PACIENTE', key: 'paciente', width: 25 },
      { header: 'CONCEPTO', key: 'concepto', width: 35 },
      { header: 'CANT.', key: 'cantidad', width: 10 },
      { header: 'INGRESO', key: 'ingreso', width: 15 },
      { header: 'COSTO', key: 'costo', width: 15 },
      { header: 'GANANCIA', key: 'ganancia', width: 15 }
    ];

    // Estilos de cabecera detalle
    wsDetalle.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    wsDetalle.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1565C0' } };
    wsDetalle.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    todos.forEach(t => {
      wsDetalle.addRow({
        tipo: t.Tipo, fecha: t.Fecha, paciente: t.Paciente,
        concepto: t.Concepto, cantidad: t.Cantidad,
        ingreso: t.Ingreso, costo: t.Costo, ganancia: t.Ganancia
      });
    });

    // Bordes detalle
    wsDetalle.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = { top: {style:'thin', color: {argb:'FFDDDDDD'}}, left: {style:'thin', color: {argb:'FFDDDDDD'}}, bottom: {style:'thin', color: {argb:'FFDDDDDD'}}, right: {style:'thin', color: {argb:'FFDDDDDD'}} };
      });
    });

    // Formato de moneda para columnas de dinero
    wsDetalle.getColumn('ingreso').numFmt = '"$"#,##0.00';
    wsDetalle.getColumn('costo').numFmt = '"$"#,##0.00';
    wsDetalle.getColumn('ganancia').numFmt = '"$"#,##0.00';
    wsResumen.getColumn('valor').numFmt = '"$"#,##0.00';

    const buffer = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Balance_StudioCapilar_${mesYYYYMM}.xlsx`);
    Utils.mostrarToast("Excel generado y descargado correctamente");
  },

  cambiarFiltro: (filtro) => {
    Balance.filtroTemporal = filtro;
    Router.recargar();
  },

  render: (el) => {
    if (Balance.filtroTemporal === 'historico') {
      const historico = Balance._calcHistoricoMensual();
      el.innerHTML = `
        <div class="modulo-header">
          <h1>📊 Balance</h1>
        </div>
        <div class="tabs" style="margin-bottom: 20px;">
          <button class="tab-btn" onclick="Balance.cambiarFiltro('mes')">Mes actual</button>
          <button class="tab-btn" onclick="Balance.cambiarFiltro('semestre')">Semestre en curso</button>
          <button class="tab-btn active" onclick="Balance.cambiarFiltro('historico')">Histórico Mensual</button>
        </div>
        
        <section class="card" style="background: transparent; box-shadow: none; border: none; padding: 0;">
          ${historico.length === 0 ? '<p class="empty-state">No hay registros históricos.</p>' : historico.map(h => `
            <div class="historico-card">
              <div class="historico-info">
                <span class="historico-mes">${h.nombreMes}</span>
                <div class="historico-stats">
                  <span>📦 ${h.cantProductos} productos</span>
                  <span>📅 ${h.cantTurnos} turnos</span>
                  <span>💉 ${h.cantPlasma} plasma / ${h.cantMeso} meso</span>
                </div>
              </div>
              <div class="historico-totales">
                <div><label>Facturado</label><strong>$${h.facturado.toLocaleString("es-AR")}</strong></div>
                <div><label>Gastos</label><strong>$${h.costo.toLocaleString("es-AR")}</strong></div>
                <div><label>Ganancia Neta</label><strong class="ganancia-neta">$${h.ganancia.toLocaleString("es-AR")}</strong></div>
              </div>
              <button class="btn-primary" onclick="Balance.exportarExcelMes('${h.mes}')">📥 Excel</button>
            </div>
          `).join("")}
        </section>
      `;
      return;
    }

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
        <button class="tab-btn" onclick="Balance.cambiarFiltro('historico')">Histórico Mensual</button>
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
