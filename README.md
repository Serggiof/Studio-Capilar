# 💇‍♀️ Studio Capilar - Sistema de Gestión

¡Bienvenido al repositorio de **Studio Capilar**! 

Este es un sistema de gestión diseñado específicamente para consultorios de tricología, dermatología y mesoterapia capilar. Construido con tecnologías web ligeras y empaquetado como aplicación de escritorio, permite una gestión completa y local de pacientes, turnos e inventario.

## 🚀 Características Principales

- **🧑‍⚕️ Historial Clínico Interactivo**: Fichas de pacientes detalladas con línea de tiempo de evolución, observaciones con autocompletado inteligente, e imágenes clínicas.
- **📄 Exportación Offline a Word**: Generación de informes en formato `.docx` de manera completamente local.
- **📅 Gestión de Turnos Inteligente**: Sistema de calendario (estilo Google Calendar) adaptativo a múltiples consultorios, con asignación y seguimiento de franjas horarias libres y ocupadas.
- **📦 Control de Inventario y Ventas**: Tabla dinámica tipo Excel para la actualización de stock en tiempo real y alertas de bajo stock, junto con registro de compras por cliente.
- **📈 Dashboard Financiero y Balance**: Visualización clara del margen de ganancias, con tarjetas de resumen adaptables a pantallas pequeñas (notebooks).
- **🔋 Funciona 100% Offline**: Los datos se almacenan de manera local y segura mediante el sistema de almacenamiento interno de la aplicación.

## 🛠️ Tecnologías

- **Interfaz**: HTML5, CSS3 (Variables, Grid, Flexbox), Vanilla JavaScript.
- **Base de datos**: LocalStorage (adaptable a Firebase/Supabase en el futuro).
- **Librerías externas**: 
  - [docx.js](https://docx.js.org/) (Para exportación Word local)
  - [FileSaver.js](https://github.com/eligrey/FileSaver.js)

## 📦 Uso y Desarrollo

1. Abre el directorio principal.
2. Asegúrate de tener **Node.js** y **npm** instalados.
3. Instala las dependencias (si aplica):
   ```bash
   npm install
   ```
4. Inicia la aplicación (si usas Electron):
   ```bash
   npm start
   ```

## 🎨 Paleta de Diseño
La interfaz de usuario utiliza una paleta moderna y profesional centrada en tonos de bienestar y salud (Verde Salvia, Crema y toques Rosa-Dorado) acompañada por tipografías elegantes (*Playfair Display* y *DM Sans*).

---
*Desarrollado para la administración eficiente y profesional de clínicas de recuperación y estética capilar.*
