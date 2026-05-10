// ============================================================
// TURNO-CARD.JS — Generador de tarjeta visual de turno
// ============================================================

const TurnoCard = {

  // Genera una imagen PNG de la tarjeta y muestra el modal de compartir
  mostrarModal: (turno) => {
    const paciente = DB.getPaciente(turno.pacienteId);
    const cfg = DB.getConfig();
    const nombreConsultorio = cfg.nombreConsultorio || 'Studio Capilar';
    const prefijo = cfg.prefijoWa || '';

    let tel = paciente?.telefono ? paciente.telefono.replace(/\D/g, '') : '';
    if (tel && prefijo && !tel.startsWith(prefijo)) tel = prefijo + tel;

    const diasSemana = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
    const fechaObj = new Date(turno.fecha + 'T12:00:00');
    const diaNombre = diasSemana[fechaObj.getDay()];
    const [anio, mes, dia] = turno.fecha.split('-');
    const meses = ['','enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const fechaLarga = diaNombre + ' ' + parseInt(dia) + ' de ' + meses[parseInt(mes)] + ' ' + anio;

    const dataUrl = TurnoCard._generarCanvas(turno, paciente, nombreConsultorio, fechaLarga);

    const msj = encodeURIComponent(
      '¡Hola ' + (paciente?.nombre || '') + '! 😊\n'
      + 'Te confirmo tu turno en ' + nombreConsultorio + ':\n\n'
      + '📅 ' + fechaLarga + '\n'
      + '🕐 ' + turno.hora + ' hs\n'
      + '💆 ' + turno.tipo + ' (' + turno.duracion + ' min)\n\n'
      + '¡Te esperamos! Ante cualquier consulta escribinos.'
    );
    const waUrl = tel ? 'https://wa.me/' + tel + '?text=' + msj : '';

    const c = document.getElementById('modal-container');
    if (!c) return;
    c.innerHTML = '<div class="modal-overlay" onclick="Modal.cerrar(event)">'
      + '<div class="modal modal-wide" style="max-width:480px; padding:28px;">'
      + '<button class="modal-close" onclick="Modal.cerrar()">✕</button>'
      + '<h2 style="margin-bottom:4px;">✅ Turno agendado</h2>'
      + '<p style="text-align:center; color:var(--text-muted); font-size:0.85rem; margin-bottom:20px;">Descargá la tarjeta y enviásela al paciente por WhatsApp</p>'
      + '<div style="display:flex; justify-content:center; margin-bottom:20px;">'
      + '<img id="turno-card-img" src="' + dataUrl + '" style="border-radius:16px; box-shadow:0 4px 24px rgba(0,0,0,0.13); max-width:100%; width:420px;" alt="Tarjeta de turno">'
      + '</div>'
      + '<div style="display:flex; gap:10px; flex-wrap:wrap;">'
      + '<a id="btn-descargar-card" download="turno-' + (paciente?.nombre || 'paciente').replace(/\s+/g,'-') + '.png" href="' + dataUrl + '" class="btn-primary" style="flex:1; text-align:center; text-decoration:none; padding:10px 16px;">⬇ Descargar imagen</a>'
      + (waUrl ? '<a href="' + waUrl + '" target="_blank" class="btn-outline" style="flex:1; text-align:center; text-decoration:none; padding:10px 16px; display:flex; align-items:center; justify-content:center; gap:6px;">'
        + '<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" width="20" height="20"> Enviar por WhatsApp</a>'
        : '<p style="color:var(--text-muted); font-size:0.8rem; text-align:center;">Sin teléfono registrado para este paciente</p>')
      + '</div>'
      + '</div>'
      + '</div>';
  },

  _generarCanvas: (turno, paciente, nombreConsultorio, fechaLarga) => {
    const W = 840, H = 480;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Fondo con gradiente
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#2a3528');
    grad.addColorStop(1, '#4a6346');
    ctx.fillStyle = grad;
    ctx.roundRect(0, 0, W, H, 28);
    ctx.fill();

    // Panel blanco derecho
    ctx.fillStyle = '#f5f3ef';
    ctx.roundRect(W * 0.42, 0, W * 0.58, H, [0, 28, 28, 0]);
    ctx.fill();

    // Decoración: círculo grande difuso izquierda
    ctx.beginPath();
    ctx.arc(80, H - 60, 160, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(W * 0.38, 40, 90, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();

    // Nombre del consultorio (izquierda)
    ctx.fillStyle = '#c9a96e';
    ctx.font = 'bold 22px serif';
    ctx.fillText(nombreConsultorio, 44, 64);

    // Línea separadora dorada
    ctx.fillStyle = '#c9a96e';
    ctx.fillRect(44, 78, 120, 3);

    // Emoji de confirmación grande
    ctx.font = '72px serif';
    ctx.fillText('✂️', 50, 200);

    // "Tu turno está confirmado"
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('Tu turno está', 44, 270);
    ctx.fillStyle = '#c9a96e';
    ctx.font = 'bold 32px sans-serif';
    ctx.fillText('confirmado ✓', 44, 310);

    // Panel derecho - contenido
    const px = W * 0.42 + 36;

    // Nombre del paciente
    ctx.fillStyle = '#2a3528';
    ctx.font = 'bold 28px sans-serif';
    const nombre = paciente?.nombre || 'Paciente';
    ctx.fillText('Hola, ' + nombre.split(' ')[0] + '!', px, 72);

    ctx.fillStyle = '#7a7a7a';
    ctx.font = '16px sans-serif';
    ctx.fillText('Te esperamos en ' + nombreConsultorio, px, 98);

    // Separador
    ctx.fillStyle = '#e8e4dc';
    ctx.fillRect(px, 116, W * 0.54, 1.5);

    // Datos del turno
    const datos = [
      { ico: '📅', label: 'Fecha', valor: fechaLarga },
      { ico: '🕐', label: 'Horario', valor: turno.hora + ' hs' },
      { ico: '💆', label: 'Servicio', valor: turno.tipo },
      { ico: '⏱', label: 'Duración', valor: turno.duracion + ' minutos' },
    ];

    datos.forEach((d, i) => {
      const y = 160 + i * 68;

      // Fondo de cada ítem
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f0ede7';
      ctx.roundRect(px - 10, y - 26, W * 0.54 - 20, 54, 10);
      ctx.fill();

      // Icono
      ctx.font = '22px serif';
      ctx.fillText(d.ico, px + 4, y + 8);

      // Label
      ctx.fillStyle = '#7a7a7a';
      ctx.font = '12px sans-serif';
      ctx.fillText(d.label.toUpperCase(), px + 38, y - 4);

      // Valor
      ctx.fillStyle = '#2a3528';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(d.valor, px + 38, y + 14);
    });

    // Footer
    ctx.fillStyle = '#4a6346';
    ctx.font = '13px sans-serif';
    ctx.fillText('Ante cualquier consulta, escribinos 💬', px, H - 28);

    return canvas.toDataURL('image/png');
  }
};
