// ============================================================
// MODULOS/ALERTAS.JS
// ============================================================

const Alertas = {
  diasFiltro: 7,

  cambiarFiltro: (dias) => {
    Alertas.diasFiltro = dias;
    Router.recargar();
  },

  marcarContactado: (tipo, id) => {
    if (tipo === 'recompra') {
      const v = DB.ventas().find(x => x.id === id);
      if (v) { v.contactado = true; DB.actualizar("ventas", id, { contactado: true }); }
    } else if (tipo === 'plasma') {
      const p = DB.sesionesPlasma().find(x => x.id === id);
      if (p) { p.contactado = true; DB.actualizar("sesionesPlasma", id, { contactado: true }); }
    } else if (tipo === 'meso') {
      const m = DB.sesionesMeso().find(x => x.id === id);
      if (m) { m.contactado = true; DB.actualizar("sesionesMeso", id, { contactado: true }); }
    }
    Router.recargar();
    Router.actualizarBadge();
  },

  _waLink: (paciente) => {
    if (!paciente?.telefono) return '';
    const prefijo = DB.getConfig().prefijoWa || '';
    let tel = paciente.telefono.replace(/\D/g, '');
    if (tel && prefijo && !tel.startsWith(prefijo)) tel = prefijo + tel;
    const msj = encodeURIComponent('Hola ' + paciente.nombre + ', \u00bfc\u00f3mo viene ese progreso? \u00bfTe est\u00e1 quedando poco producto?');
    const url = 'https://wa.me/' + tel + '?text=' + msj;
    return '<a href="' + url + '" target="_blank" title="Enviar WhatsApp" '
      + 'style="text-decoration:none; display:flex; align-items:center; filter:grayscale(100%); transition:filter 0.2s;" '
      + 'onmouseover="this.style.filter=\'grayscale(0%)\'" onmouseout="this.style.filter=\'grayscale(100%)\'">'
      + '<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" width="28" height="28">'
      + '</a>';
  },

  render: (el) => {
    const alertasRecompra = DB.ventas().filter(v => Utils.esAlerta(v.proximaRecompra, Alertas.diasFiltro)).map(v => ({
      ...v,
      paciente: DB.getPaciente(v.pacienteId),
      producto: DB.getProducto(v.productoId),
      dias: Utils.diasHasta(v.proximaRecompra),
      tipo: 'recompra'
    }));

    const alertasPlasma = DB.sesionesPlasma().filter(s => Utils.esAlerta(s.proximaAlerta, Alertas.diasFiltro)).map(s => ({
      ...s,
      paciente: DB.getPaciente(s.pacienteId),
      dias: Utils.diasHasta(s.proximaAlerta),
      tipo: 'plasma'
    }));

    const alertasMeso = DB.sesionesMeso().filter(s => Utils.esAlerta(s.proximaAlerta, Alertas.diasFiltro)).map(s => ({
      ...s,
      paciente: DB.getPaciente(s.pacienteId),
      dias: Utils.diasHasta(s.proximaAlerta),
      tipo: 'meso'
    }));

    const todas = [...alertasRecompra, ...alertasPlasma, ...alertasMeso].sort((a, b) => a.dias - b.dias);

    const filas = todas.length === 0
      ? '<p class="empty-state">No hay alertas pendientes \u2705</p>'
      : todas.map(a => {
          const esRecompra = a.tipo === 'recompra';
          const estado = a.dias <= 0 ? 'recompra-vencida' : 'recompra-proxima';
          const diasText = a.dias <= 0 ? 'Venci\u00f3' : 'En ' + a.dias + ' d\u00edas';
          const diasClass = a.dias <= 0 ? 'dias-vencida' : 'dias-proxima';
          const fecha = Utils.formatFecha(esRecompra ? a.proximaRecompra : a.proximaAlerta);
          const detalle = esRecompra ? ('Recompra: ' + (a.producto?.nombre || '\u2014')) : (a.tipo === 'plasma' ? 'Pr\u00f3xima sesi\u00f3n de plasma' : 'Pr\u00f3xima sesi\u00f3n de mesoterapia');
          const waBtn = Alertas._waLink(a.paciente);
          const contactBtn = a.contactado 
            ? '<span style="margin-left: 10px; font-size: 0.85rem; color: var(--primary);">\u2714\ufe0f Le\u00eddo</span>'
            : '<button class="btn-sm" style="margin-left: 10px;" onclick="Alertas.marcarContactado(\'' + a.tipo + '\', \'' + a.id + '\')" title="Marcar como le\u00eddo">\u2714\ufe0f</button>';

          const opacityStyle = a.contactado ? 'opacity: 0.6; filter: grayscale(100%); background-color: var(--bg);' : '';

          return '<div class="recompra-item ' + estado + '" style="' + opacityStyle + '">'
            + '<div class="recompra-main">'
            + '<div style="display:flex; align-items:center; gap:8px;">'
            + '<strong>' + (a.paciente?.nombre || '\u2014') + '</strong>'
            + waBtn
            + contactBtn
            + '</div>'
            + '<span>' + detalle + '</span>'
            + '</div>'
            + '<div class="recompra-meta">'
            + '<span class="recompra-fecha">' + fecha + '</span>'
            + '<span class="recompra-dias ' + diasClass + '">' + diasText + '</span>'
            + '</div>'
            + '</div>';
        }).join('');

    el.innerHTML = '<div class="modulo-header"><h1>\ud83d\udd14 Alertas y Vencimientos</h1></div>'
      + '<div class="tabs" style="margin-bottom: 20px;">'
      + '<button class="tab-btn ' + (Alertas.diasFiltro === 7 ? 'active' : '') + '" onclick="Alertas.cambiarFiltro(7)">Pr\u00f3ximos 7 d\u00edas</button>'
      + '<button class="tab-btn ' + (Alertas.diasFiltro === 15 ? 'active' : '') + '" onclick="Alertas.cambiarFiltro(15)">Pr\u00f3ximos 15 d\u00edas</button>'
      + '<button class="tab-btn ' + (Alertas.diasFiltro === 21 ? 'active' : '') + '" onclick="Alertas.cambiarFiltro(21)">Pr\u00f3ximos 21 d\u00edas</button>'
      + '</div>'
      + '<section class="card">'
      + '<h2>Pr\u00f3ximos vencimientos (' + todas.length + ')</h2>'
      + '<div class="recompra-lista">' + filas + '</div>'
      + '</section>';
  }
};
