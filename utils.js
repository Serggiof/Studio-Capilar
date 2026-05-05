// ============================================================
// UTILS.JS — Funciones puras / helpers
// ============================================================

const Utils = {
  hoy: () => new Date().toISOString().split("T")[0],

  formatFecha: (iso) => {
    if (!iso) return "—";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  },

  diasHasta: (iso) => {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const target = new Date(iso + "T00:00:00");
    return Math.ceil((target - hoy) / (1000 * 60 * 60 * 24));
  },

  esAlerta: (iso, diasPrevios = 7) => Utils.diasHasta(iso) <= diasPrevios,

  id: (prefix = "x") => `${prefix}${Date.now()}`,

  diaSemana: (iso) => new Date(iso + "T12:00:00").getDay(),

  nombreDia: (iso) => {
    return ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"][Utils.diaSemana(iso)];
  },

  sumarMinutos: (hora, min) => {
    const [h, m] = hora.split(":").map(Number);
    const total = h * 60 + m + min;
    return `${String(Math.floor(total / 60)).padStart(2,"0")}:${String(total % 60).padStart(2,"0")}`;
  },

  horaAntes: (a, b) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    return ah * 60 + am < bh * 60 + bm;
  },

  horaIgualOAntes: (a, b) => {
    const [ah, am] = a.split(":").map(Number);
    const [bh, bm] = b.split(":").map(Number);
    return ah * 60 + am <= bh * 60 + bm;
  },

  normalizarTexto: (str) => {
    if (!str) return "";
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  }
};

// ============================================================
// CONFIG — Horarios y constantes del consultorio
// ============================================================

const CONFIG = {
  get horarios() {
    const cfg = DB.getConfig();
    const porDia = cfg.horariosPorDia || {};
    const result = {};
    // Genera la tabla de horarios por número de día JS (0=Dom, 1=Lun, ...)
    [0, 1, 2, 3, 4, 5, 6].forEach(d => {
      const h = porDia[d];
      if (h && h.activo) {
        result[d] = [{ desde: h.desde, hasta: h.hasta }];
      }
    });
    return result;
  },
  get duracionTurno() { return parseInt(DB.getConfig().duracionTurno) || 60; },
  get localidades() {
    const d = parseInt(DB.getConfig().diaAlternativo) || 3;
    const dias = { 1:"Lunes", 2:"Martes", 3:"Miércoles", 4:"Jueves", 5:"Viernes", 6:"Sábado", 0:"Domingo" };
    return {
      principal: "Consultorio principal",
      alternativo: `Consultorio especial (${dias[d]})`
    };
  }
};

// ============================================================
// CALENDARIO — Lógica de slots y días
// ============================================================

const Calendario = {

  slotsDisponibles: (fechaISO) => {
    const diaSemana = Utils.diaSemana(fechaISO);
    const franjas = CONFIG.horarios[diaSemana];
    if (!franjas) return [];

    const ocupadas = DB.turnos()
      .filter(t => t.fecha === fechaISO && t.estado !== "cancelado")
      .map(t => t.hora);

    const turnos = DB.turnos().filter(t => t.fecha === fechaISO);
    const slots = [];

    franjas.forEach(f => {
      let hora = f.desde;
      while (Utils.horaAntes(hora, f.hasta)) {
        const siguiente = Utils.sumarMinutos(hora, CONFIG.duracionTurno);
        if (Utils.horaAntes(f.hasta, siguiente)) break;
        slots.push({
          hora,
          disponible: !ocupadas.includes(hora),
          turno: turnos.find(t => t.hora === hora) || null
        });
        hora = siguiente;
      }
    });

    return slots;
  },

  esConsultorioAlt: (fechaISO) => Utils.diaSemana(fechaISO) === (parseInt(DB.getConfig().diaAlternativo) || 3),

  diasDelMes: (year, month) => {
    const dias = [];
    const primero = new Date(year, month, 1);
    const ultimo  = new Date(year, month + 1, 0);
    let startDay = primero.getDay() - 1;
    if (startDay < 0) startDay = 6;
    for (let i = 0; i < startDay; i++) dias.push(null);
    for (let d = 1; d <= ultimo.getDate(); d++) dias.push(d);
    return dias;
  }
};
