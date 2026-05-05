// ============================================================
// MOCK DATA — Consultorio Capilar
// ============================================================

const MOCK = {
  pacientes: [
    {
      id: "p001",
      nombre: "Valentina Sosa",
      telefono: "341-555-0101",
      email: "valen@mail.com",
      fechaNacimiento: "1992-03-14",
      foto: null,
      condicion: "Alopecia androgenética",
      notas: "Sensible a productos con sulfatos.",
      creadoEn: "2024-01-10"
    },
    {
      id: "p002",
      nombre: "Rodrigo Méndez",
      telefono: "341-555-0202",
      email: "rodri@mail.com",
      fechaNacimiento: "1988-07-22",
      foto: null,
      condicion: "Seborrea",
      notas: "Prefiere turnos por la mañana.",
      creadoEn: "2024-02-05"
    },
    {
      id: "p003",
      nombre: "Camila Reyes",
      telefono: "341-555-0303",
      email: "cami@mail.com",
      fechaNacimiento: "1995-11-08",
      foto: null,
      condicion: "Caída difusa por estrés",
      notas: "Alergia al látex.",
      creadoEn: "2024-03-20"
    },
    {
      id: "p004",
      nombre: "Lucas Fernández",
      telefono: "341-555-0404",
      email: "lucas@mail.com",
      fechaNacimiento: "1985-05-30",
      foto: null,
      condicion: "Psoriasis del cuero cabelludo",
      notas: "",
      creadoEn: "2024-04-01"
    },
    {
      id: "p005",
      nombre: "Sofía Ibáñez",
      telefono: "341-555-0505",
      email: "sofi@mail.com",
      fechaNacimiento: "2000-09-15",
      foto: null,
      condicion: "Cabello fino y sin volumen",
      notas: "Tratamiento estético, no médico.",
      creadoEn: "2024-04-15"
    }
  ],

  turnos: [
    {
      id: "t001",
      pacienteId: "p001",
      fecha: new Date().toISOString().split("T")[0], // hoy
      hora: "09:00",
      duracion: 60,
      tipo: "Plasma capilar",
      estado: "confirmado",
      notas: "3ra sesión"
    },
    {
      id: "t002",
      pacienteId: "p002",
      fecha: new Date().toISOString().split("T")[0],
      hora: "10:30",
      duracion: 45,
      tipo: "Diagnóstico",
      estado: "confirmado",
      notas: "Primera visita"
    },
    {
      id: "t003",
      pacienteId: "p003",
      fecha: new Date().toISOString().split("T")[0],
      hora: "12:00",
      duracion: 30,
      tipo: "Control",
      estado: "pendiente",
      notas: ""
    },
    {
      id: "t004",
      pacienteId: "p005",
      fecha: new Date().toISOString().split("T")[0],
      hora: "15:00",
      duracion: 60,
      tipo: "Mesoterapia",
      estado: "confirmado",
      notas: "Trae fotos de evolución"
    },
    {
      id: "t005",
      pacienteId: "p004",
      fecha: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      })(),
      hora: "11:00",
      duracion: 60,
      tipo: "Plasma capilar",
      estado: "confirmado",
      notas: "1ra sesión"
    }
  ],

  productos: [
    {
      id: "prod001",
      nombre: "Shampoo Anticaída Vichy",
      marca: "Vichy",
      precio: 8500,
      stock: 12,
      categoria: "Shampoo"
    },
    {
      id: "prod002",
      nombre: "Ampollas Kerastase Densifique",
      marca: "Kérastase",
      precio: 15000,
      stock: 8,
      categoria: "Tratamiento"
    },
    {
      id: "prod003",
      nombre: "Loción Minoxidil 5%",
      marca: "Genérico",
      precio: 6200,
      stock: 20,
      categoria: "Medicamento"
    },
    {
      id: "prod004",
      nombre: "Suero Capilar Nourishing",
      marca: "Aveda",
      precio: 12000,
      stock: 5,
      categoria: "Tratamiento"
    }
  ],

  ventas: [
    {
      id: "v001",
      pacienteId: "p001",
      productoId: "prod001",
      cantidad: 1,
      fecha: "2024-04-01",
      precioTotal: 8500,
      proximaRecompra: (() => {
        // recompra en 30 días desde hoy - 5 días (para que ya aparezca alerta)
        const d = new Date();
        d.setDate(d.getDate() + 3);
        return d.toISOString().split("T")[0];
      })()
    },
    {
      id: "v002",
      pacienteId: "p002",
      productoId: "prod002",
      cantidad: 2,
      fecha: "2024-04-10",
      precioTotal: 30000,
      proximaRecompra: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 15);
        return d.toISOString().split("T")[0];
      })()
    },
    {
      id: "v003",
      pacienteId: "p003",
      productoId: "prod003",
      cantidad: 1,
      fecha: "2024-04-15",
      precioTotal: 6200,
      proximaRecompra: (() => {
        const d = new Date();
        d.setDate(d.getDate() - 2); // ya venció → alerta activa
        return d.toISOString().split("T")[0];
      })()
    }
  ],

  sesionesPlasma: [
    {
      id: "sp001",
      pacienteId: "p001",
      sesiones: [
        { numero: 1, fecha: "2024-03-01", notas: "Sin reacciones." },
        { numero: 2, fecha: "2024-03-22", notas: "Leve eritema post-sesión." },
        { numero: 3, fecha: new Date().toISOString().split("T")[0], notas: "" }
      ],
      totalPlanificadas: 6,
      proximaAlerta: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 21);
        return d.toISOString().split("T")[0];
      })()
    },
    {
      id: "sp002",
      pacienteId: "p004",
      sesiones: [],
      totalPlanificadas: 4,
      proximaAlerta: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return d.toISOString().split("T")[0];
      })()
    }
  ]
};

// Carga inicial en localStorage si no existe
const MOCK_CONFIG = {
  precioTurno: 15000,
  precioPlasma: 25000,
  nombreConsultorio: "Capilar Studio",
  moneda: "ARS"
};

function cargarMockSiEsNecesario() {
  if (!localStorage.getItem("pacientes")) {
    localStorage.setItem("pacientes", JSON.stringify(MOCK.pacientes));
  }
  if (!localStorage.getItem("turnos")) {
    localStorage.setItem("turnos", JSON.stringify(MOCK.turnos));
  }
  if (!localStorage.getItem("productos")) {
    localStorage.setItem("productos", JSON.stringify(MOCK.productos));
  }
  if (!localStorage.getItem("ventas")) {
    localStorage.setItem("ventas", JSON.stringify(MOCK.ventas));
  }
  if (!localStorage.getItem("sesionesPlasma")) {
    localStorage.setItem("sesionesPlasma", JSON.stringify(MOCK.sesionesPlasma));
  }
  if (!localStorage.getItem("appConfig")) {
    localStorage.setItem("appConfig", JSON.stringify(MOCK_CONFIG));
  }
}
