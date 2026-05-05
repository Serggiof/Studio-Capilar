// ============================================================
// GOOGLE CALENDAR API (Integración)
// ============================================================

const CLIENT_ID = '799899410568-ibk824ktj1r8983gnvp3aklg022s64r1.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

const GoogleCalendar = {
  tokenClient: null,
  accessToken: null,
  gapiInited: false,
  gisInited: false,

  init: () => {
    // Intentar cargar scripts dinámicamente si no están en index
    if (!document.getElementById('gapi-script')) {
      const gapiScript = document.createElement('script');
      gapiScript.id = 'gapi-script';
      gapiScript.src = 'https://apis.google.com/js/api.js';
      gapiScript.onload = () => gapi.load('client', GoogleCalendar.initializeGapiClient);
      document.body.appendChild(gapiScript);

      const gisScript = document.createElement('script');
      gisScript.id = 'gis-script';
      gisScript.src = 'https://accounts.google.com/gsi/client';
      gisScript.onload = GoogleCalendar.initializeGisClient;
      document.body.appendChild(gisScript);
    }
  },

  initializeGapiClient: async () => {
    await gapi.client.init({
      discoveryDocs: [DISCOVERY_DOC],
    });
    GoogleCalendar.gapiInited = true;
    GoogleCalendar.checkSetup();
  },

  initializeGisClient: () => {
    GoogleCalendar.tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (tokenResponse) => {
        if (tokenResponse.error !== undefined) {
          throw (tokenResponse);
        }
        GoogleCalendar.accessToken = tokenResponse.access_token;
        localStorage.setItem('gcal_token', GoogleCalendar.accessToken);
        alert('¡Google Calendar conectado exitosamente!');
        Router.recargar();
      },
    });
    GoogleCalendar.gisInited = true;
    GoogleCalendar.checkSetup();

    // Intentar recuperar token guardado
    const savedToken = localStorage.getItem('gcal_token');
    if (savedToken) {
      GoogleCalendar.accessToken = savedToken;
      // Idealmente habría que validar si expiró, pero lo forzamos al enviar req
    }
  },

  checkSetup: () => {
    if (GoogleCalendar.gapiInited && GoogleCalendar.gisInited) {
      console.log('Google APIs listos');
    }
  },

  estaConectado: () => {
    return !!GoogleCalendar.accessToken;
  },

  conectar: () => {
    if (!GoogleCalendar.gisInited) return alert("Cargando servicios de Google, intentá en unos segundos...");
    
    if (gapi.client.getToken() === null && !GoogleCalendar.accessToken) {
      GoogleCalendar.tokenClient.requestAccessToken({prompt: 'consent'});
    } else {
      GoogleCalendar.tokenClient.requestAccessToken({prompt: ''});
    }
  },

  desconectar: () => {
    if (GoogleCalendar.accessToken) {
      google.accounts.oauth2.revoke(GoogleCalendar.accessToken, () => {
        GoogleCalendar.accessToken = null;
        localStorage.removeItem('gcal_token');
        gapi.client.setToken('');
        alert('Google Calendar desconectado.');
        Router.recargar();
      });
    }
  },

  crearEvento: async (turno) => {
    if (!GoogleCalendar.estaConectado()) return;
    
    // Necesitamos que el token esté en gapi.client
    gapi.client.setToken({access_token: GoogleCalendar.accessToken});

    const paciente = DB.getPaciente(turno.pacienteId);
    const resumen = `Turno: ${paciente ? paciente.nombre : 'Paciente'} - ${turno.tratamiento}`;
    
    // Formato fecha: "YYYY-MM-DD" + "T" + "HH:mm:00"
    const startDateTime = `${turno.fecha}T${turno.hora}:00`;
    
    // Calcular end time (asumimos duracion de 1 hr si no tenemos la info, o usamos CONFIG)
    const duracionMs = (CONFIG.duracionTurno || 60) * 60000;
    const endDate = new Date(new Date(startDateTime).getTime() + duracionMs);
    
    // Formatear endDate localmente evitando problemas de timezone de toISOString
    const endDateTime = endDate.getFullYear() + '-' + 
      String(endDate.getMonth()+1).padStart(2,'0') + '-' + 
      String(endDate.getDate()).padStart(2,'0') + 'T' + 
      String(endDate.getHours()).padStart(2,'0') + ':' + 
      String(endDate.getMinutes()).padStart(2,'0') + ':00';

    const event = {
      'summary': resumen,
      'description': `Turno generado desde Capilar Studio.\nPaciente: ${paciente ? paciente.nombre : '-'}\nMotivo: ${turno.tratamiento}`,
      'start': {
        'dateTime': startDateTime,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      'end': {
        'dateTime': endDateTime,
        'timeZone': Intl.DateTimeFormat().resolvedOptions().timeZone
      },
    };

    try {
      const response = await gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': event,
      });
      // Guardar el gcal_id en el turno para futuras ediciones/borrados
      const lista = DB.turnos().map(t => t.id === turno.id ? { ...t, gcal_id: response.result.id } : t);
      DB.set("turnos", lista);
      console.log('Evento creado:', response.result.htmlLink);
    } catch (err) {
      console.error('Error al crear evento:', err);
      if (err.status === 401) {
        alert("Tu sesión de Google expiró. Por favor, volvé a conectar el calendario en Configuración.");
        GoogleCalendar.desconectar();
      }
    }
  },

  eliminarEvento: async (gcal_id) => {
    if (!GoogleCalendar.estaConectado() || !gcal_id) return;
    
    gapi.client.setToken({access_token: GoogleCalendar.accessToken});
    try {
      await gapi.client.calendar.events.delete({
        'calendarId': 'primary',
        'eventId': gcal_id
      });
      console.log('Evento eliminado:', gcal_id);
    } catch (err) {
      console.error('Error al eliminar evento:', err);
    }
  }
};

// Auto-iniciar al cargar el archivo
GoogleCalendar.init();
