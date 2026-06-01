// ============================================================
// MODULOS/ALERTAS.JS
// ============================================================

const Alertas = {
  diasFiltro: 7,
  anioFiltro: "2026", // Por defecto muestra 2026 (año de hoy en contexto)

  cambiarFiltro: (dias) => {
    Alertas.diasFiltro = dias;
    Router.recargar();
  },

  cambiarAnio: (anio) => {
    Alertas.anioFiltro = anio;
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

  _waLink: (paciente, tipo, detalle) => {
    if (!paciente?.telefono) return '';
    const prefijo = DB.getConfig().prefijoWa || '';
    let tel = paciente.telefono.replace(/\D/g, '');
    if (tel && prefijo && !tel.startsWith(prefijo)) tel = prefijo + tel;
    
    let texto = 'Hola ' + paciente.nombre + ', \u00bfc\u00f3mo viene ese progreso? \u00bfTe est\u00e1 quedando poco producto?';
    if (tipo === 'plasma') {
      texto = 'Hola ' + paciente.nombre + ', \u00bfc\u00f3mo est\u00e1s? Te escribo de Capilar Studio para coordinar tu pr\u00f3xima sesi\u00f3n de Plasma Capilar. \u00a1Saludos!';
    } else if (tipo === 'meso') {
      texto = 'Hola ' + paciente.nombre + ', \u00bfc\u00f3mo est\u00e1s? Te escribo de Capilar Studio para coordinar tu pr\u00f3xima sesi\u00f3n de Mesoterapia. \u00a1Saludos!';
    }
    
    const msj = encodeURIComponent(texto);
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

    let todas = [...alertasRecompra, ...alertasPlasma, ...alertasMeso];

    // Filtrar por año si no es "todos"
    if (Alertas.anioFiltro !== "todos") {
      todas = todas.filter(a => {
        const dateStr = a.tipo === 'recompra' ? a.proximaRecompra : a.proximaAlerta;
        if (!dateStr) return false;
        const anio = new Date(dateStr + "T12:00:00").getFullYear().toString();
        return anio === Alertas.anioFiltro;
      });
    }

    todas.sort((a, b) => a.dias - b.dias);

    const filas = todas.length === 0
      ? '<p class="empty-state">No hay alertas pendientes para este año \u2705</p>'
      : todas.map(a => {
          const esRecompra = a.tipo === 'recompra';
          const estado = a.dias <= 0 ? 'recompra-vencida' : 'recompra-proxima';
          const diasText = a.dias <= 0 ? 'Venci\u00f3' : 'En ' + a.dias + ' d\u00edas';
          const diasClass = a.dias <= 0 ? 'dias-vencida' : 'dias-proxima';
          const fecha = Utils.formatFecha(esRecompra ? a.proximaRecompra : a.proximaAlerta);
          const detalle = esRecompra ? ('Recompra: ' + (a.producto?.nombre || '\u2014')) : (a.tipo === 'plasma' ? 'Pr\u00f3xima sesi\u00f3n de plasma' : 'Pr\u00f3xima sesi\u00f3n de mesoterapia');
          const waBtn = Alertas._waLink(a.paciente, a.tipo, detalle);
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

    const labelAnio = Alertas.anioFiltro === 'todos' ? 'todas las alertas' : 'año ' + Alertas.anioFiltro;

    el.innerHTML = '<div class="modulo-header"><h1>\ud83d\udd14 Alertas y Vencimientos</h1></div>'
      + '<div class="tabs" style="margin-bottom: 12px; gap: 8px; border-bottom: 1px solid var(--border); padding-bottom: 8px;">'
      + '  <button class="tab-btn ' + (Alertas.anioFiltro === '2026' ? 'active' : '') + '" style="font-size:0.9rem; padding: 6px 12px;" onclick="Alertas.cambiarAnio(\'2026\')">Alertas 2026</button>'
      + '  <button class="tab-btn ' + (Alertas.anioFiltro === '2025' ? 'active' : '') + '" style="font-size:0.9rem; padding: 6px 12px;" onclick="Alertas.cambiarAnio(\'2025\')">Alertas 2025</button>'
      + '  <button class="tab-btn ' + (Alertas.anioFiltro === '2024' ? 'active' : '') + '" style="font-size:0.9rem; padding: 6px 12px;" onclick="Alertas.cambiarAnio(\'2024\')">Alertas 2024</button>'
      + '  <button class="tab-btn ' + (Alertas.anioFiltro === 'todos' ? 'active' : '') + '" style="font-size:0.9rem; padding: 6px 12px;" onclick="Alertas.cambiarAnio(\'todos\')">Ver todas</button>'
      + '</div>'
      + '<div class="tabs" style="margin-bottom: 20px; font-size: 0.82rem; border-bottom: none; gap: 8px; align-items: center;">'
      + '  <span style="color: var(--text-muted); font-weight: bold; margin-right: 5px;">Rango de previsión:</span>'
      + '  <button class="tab-btn ' + (Alertas.diasFiltro === 7 ? 'active' : '') + '" style="padding: 4px 8px; font-size: 0.8rem;" onclick="Alertas.cambiarFiltro(7)">Próximos 7 días</button>'
      + '  <button class="tab-btn ' + (Alertas.diasFiltro === 15 ? 'active' : '') + '" style="padding: 4px 8px; font-size: 0.8rem;" onclick="Alertas.cambiarFiltro(15)">Próximos 15 días</button>'
      + '  <button class="tab-btn ' + (Alertas.diasFiltro === 21 ? 'active' : '') + '" style="padding: 4px 8px; font-size: 0.8rem;" onclick="Alertas.cambiarFiltro(21)">Próximos 21 días</button>'
      + '</div>'
      + '<section class="card">'
      + '<h2>Vencimientos filtrados (' + labelAnio + ' · ' + todas.length + ')</h2>'
      + '<div class="recompra-lista">' + filas + '</div>'
      + '</section>';
  }
};
