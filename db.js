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
  }
};
