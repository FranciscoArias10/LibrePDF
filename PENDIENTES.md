# 📋 LibrePDF - Roadmap y Funcionalidades Pendientes

Este documento contiene el listado oficial de tareas, requisitos de tienda y funcionalidades planificadas para las siguientes versiones de **LibrePDF**.

---

## 🏬 1. Requisitos para Publicar en Google Play Store (Lanzamiento)

| Estado | Tarea | Descripción |
| :---: | :--- | :--- |
| ⏳ | **Identificador de Paquete Final** | Configurar en `app.json` el identificador final (ej. `com.franciscoarias.librepdf`), `versionCode: 1` y `versionName: "1.0.0"`. |
| ⏳ | **Íconos y Splash en Alta Resolución** | Reemplazar los íconos genéricos de Expo por el logo oficial de LibrePDF en 512x512 px (Play Store) y 1024x500 px (Feature Graphic). |
| ⏳ | **Página de Política de Privacidad** | Crear una página web pública (ej. GitHub Pages) detallando que la app no almacena ni comparte datos de usuarios y que la cámara/galería solo se usa localmente. |
| ⏳ | **Compilación de Producción (`.aab`)** | Ejecutar `npx eas build -p android --profile production` para generar el Android App Bundle listo para subir a Google Play Console. |

---

## 🚀 2. Funcionalidades en Desarrollo / Próximas Versiones

### 📸 Modo Escaneo Continuo (Cámara en Ráfaga)
- **Estado:** 🟡 *En desarrollo*
- **Descripción:** Capturar múltiples páginas seguidas (foto 1, foto 2, foto 3...) con visor a pantalla completa, contador de páginas capturadas y pase directo al editor sin salir de la cámara.

---

### ✍️ Firma Digital en Documentos
- **Prioridad:** Alta
- **Descripción:** 
  - Panel interactivo para dibujar firmas a mano alzada con el dedo.
  - Opción de importar una imagen de firma existente (con fondo transparente o eliminación de fondo).
  - Posicionar, escalar y estampar la firma en cualquier página del PDF antes de exportarlo.

---

### 📖 Visor Interno de PDF (PDF Reader Embebido)
- **Prioridad:** Alta
- **Descripción:** 
  - Visualizar el archivo PDF generado directamente dentro de LibrePDF sin depender de visores externos del sistema.
  - Navegación entre páginas, zoom y búsqueda rápida.

---

### 📐 Detección Automática de Bordes (Auto-crop Inteligente)
- **Prioridad:** Media
- **Descripción:** 
  - Detección automática de los 4 vértices del papel/documento sobre una mesa o fondo contrastado al tomar la foto.
  - Corrección de perspectiva para enderezar documentos tomados en ángulo.

---

### 🔀 Reordenamiento de Páginas por Arrastre (Drag & Drop)
- **Prioridad:** Media
- **Descripción:** 
  - Permitir mantener presionada una miniatura de página y arrastrarla para cambiar su posición en el PDF de manera táctil y rápida.

---

### 📝 Edición de PDFs Existentes
- **Prioridad:** Media
- **Descripción:** 
  - Abrir un PDF ya guardado en el historial para agregar nuevas páginas tomadas con la cámara o galería, o eliminar páginas existentes.

---

### 🔒 Protección con Contraseña y Cifrado
- **Prioridad:** Baja
- **Descripción:** 
  - Opcionalmente añadir una clave de apertura al PDF generado para proteger documentos confidenciales.

---

### 📑 Combinar y Unir PDFs (Merge PDF)
- **Prioridad:** Baja
- **Descripción:** 
  - Seleccionar dos o más documentos PDF guardados en el historial para fusionarlos en un único archivo PDF.

---

### 🔍 Extracción de Texto (OCR)
- **Prioridad:** Futuro
- **Descripción:** 
  - Reconocimiento óptico de caracteres para extraer el texto de las imágenes escaneadas y poder copiarlo o exportarlo como `.txt`.
