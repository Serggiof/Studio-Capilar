// ============================================================
// DB.JS — Helpers de localStorage
// ============================================================

const DB = {
  get: (key) => JSON.parse(localStorage.getItem(key)) || [],
  set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),

  pacientes:    () => DB.get("pacientes"),
  turnos:       () => DB.get("turnos"),
  productos:    () => DB.get("productos"),
  ventas:       () => DB.get("ventas"),
  sesionesPlasma: () => DB.get("sesionesPlasma"),
  sesionesMeso:   () => DB.get("sesionesMeso"),

  getPaciente: (id) => DB.pacientes().find(p => p.id === id),
  getProducto: (id) => DB.productos().find(p => p.id === id),

  // Guardar un item actualizado dentro de una colección
  actualizar: (key, id, cambios) => {
    const lista = DB.get(key).map(item => item.id === id ? { ...item, ...cambios } : item);
    DB.set(key, lista);
  },

  eliminar: (key, id) => {
    DB.set(key, DB.get(key).filter(item => item.id !== id));
  },

  // Config — objeto único, no array
  getConfig: () => {
    const defaultCfg = {
      duracionTurno: 60,
      diaAlternativo: 3,
      horariosPorDia: {
        1: { activo: true,  desde: "10:00", hasta: "20:00" }, // Lunes
        2: { activo: true,  desde: "10:00", hasta: "20:00" }, // Martes
        3: { activo: true,  desde: "10:00", hasta: "14:00" }, // Miércoles
        4: { activo: true,  desde: "10:00", hasta: "20:00" }, // Jueves
        5: { activo: true,  desde: "10:00", hasta: "20:00" }, // Viernes
        6: { activo: false, desde: "09:00", hasta: "13:00" }, // Sábado
        0: { activo: false, desde: "09:00", hasta: "13:00" }, // Domingo
      },
      precioTurno: 0,
      precioPlasma: 0,
      precioMeso: 0,
      nombreConsultorio: "Capilar Studio",
      moneda: "ARS"
    };
    const saved = JSON.parse(localStorage.getItem("appConfig")) || {};
    return { ...defaultCfg, ...saved };
  },
  setConfig: (data) => localStorage.setItem("appConfig", JSON.stringify(data)),
  updateConfig: (cambios) => DB.setConfig({ ...DB.getConfig(), ...cambios }),

  // Migración: agrega campo "costo" a productos que no lo tienen
  migrarCostos: () => {
    const productos = DB.productos();
    const necesita  = productos.some(p => p.costo === undefined);
    if (!necesita) return;
    DB.set("productos", productos.map(p => p.costo === undefined ? { ...p, costo: 0 } : p));
    console.log("DB: campo 'costo' migrado en productos existentes.");
  },

  // Genera planes y próximas alertas automáticas de Plasma/Meso a partir del historial clínico importado
  inicializarPlanesDesdeHistorial: () => {
    const pacientes = DB.pacientes();
    if (pacientes.length === 0) return;

    let plasmaList = DB.sesionesPlasma();
    let mesoList = DB.sesionesMeso();

    // Solo correr si ambos están vacíos para no pisar planes activos creados manualmente
    if (plasmaList.length > 0 || mesoList.length > 0) return;

    const nuevosPlasma = [];
    const nuevosMeso = [];

    pacientes.forEach(p => {
      if (!p.historial || p.historial.length === 0) return;

      const histPlasma = [];
      const histMeso = [];

      p.historial.forEach(h => {
        if (!h.tratamiento && !h.observaciones) return;
        const textoTrat = h.tratamiento || "";
        const textoObs = h.observaciones || "";
        const text = Utils.normalizarTexto(textoTrat + " " + textoObs);
        const esPlasma = text.includes("prp") || text.includes("plasma");
        const esMeso = text.includes("meso") || text.includes("mesoterapia");

        if (esPlasma) {
          histPlasma.push({ fecha: h.fecha, notas: h.observaciones || "", tratamiento: h.tratamiento });
        } else if (esMeso) {
          histMeso.push({ fecha: h.fecha, notas: h.observaciones || "", tratamiento: h.tratamiento });
        }
      });

      // Crear plan de Plasma
      if (histPlasma.length > 0) {
        histPlasma.sort((a, b) => a.fecha.localeCompare(b.fecha));
        const sesiones = histPlasma.map((hp, idx) => ({
          numero: idx + 1,
          fecha: hp.fecha,
          notas: hp.notas || hp.tratamiento || "",
          precio: 0
        }));

        const ultimaFecha = sesiones[sesiones.length - 1].fecha;
        const alerta = new Date(ultimaFecha + "T12:00:00");
        alerta.setDate(alerta.getDate() + 21);

        nuevosPlasma.push({
          id: `trm-sp-${p.id}`,
          pacienteId: p.id,
          sesiones: sesiones,
          totalPlanificadas: Math.max(6, sesiones.length),
          diasIntervalo: 21,
          proximaAlerta: alerta.toISOString().split("T")[0],
          contactado: false
        });
      }

      // Crear plan de Meso
      if (histMeso.length > 0) {
        histMeso.sort((a, b) => a.fecha.localeCompare(b.fecha));
        const sesiones = histMeso.map((hm, idx) => ({
          numero: idx + 1,
          fecha: hm.fecha,
          notas: hm.notas || hm.tratamiento || "",
          precio: 0
        }));

        const ultimaFecha = sesiones[sesiones.length - 1].fecha;
        const alerta = new Date(ultimaFecha + "T12:00:00");
        alerta.setDate(alerta.getDate() + 21);

        nuevosMeso.push({
          id: `trm-sm-${p.id}`,
          pacienteId: p.id,
          sesiones: sesiones,
          totalPlanificadas: Math.max(6, sesiones.length),
          diasIntervalo: 21,
          proximaAlerta: alerta.toISOString().split("T")[0],
          contactado: false
        });
      }
    });

    if (nuevosPlasma.length > 0) {
      DB.set("sesionesPlasma", nuevosPlasma);
    }
    if (nuevosMeso.length > 0) {
      DB.set("sesionesMeso", nuevosMeso);
    }
    console.log(`DB: Se auto-generaron ${nuevosPlasma.length} planes de Plasma y ${nuevosMeso.length} de Mesoterapia desde historiales.`);
  }
};
