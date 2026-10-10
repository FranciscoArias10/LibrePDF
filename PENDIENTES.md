# 📋 LibrePDF - Roadmap y Funcionalidades Pendientes

Este documento contiene el listado oficial de tareas, requisitos de tienda y funcionalidades planificadas para las siguientes versiones de **LibrePDF**.

---

## 🏬 1. Requisitos para Publicar en Google Play Store (Lanzamiento)

| Estado | Tarea | Descripción |
| :---: | :--- | :--- |
| ⏳ | **Identificador de Paquete Final** | Configurar en `app.json` el identificador final (ej. `com.franciscoarias.librepdf`), `versionCode: 1` y `versionName: "1.0.0"`. |
| ⏳ | **Íconos y Splash en Alta Resolución** | Reemplazar los íconos genéricos de Expo por el logo oficial de LibrePDF en 512x512 px (Play Store) y 1024x500 px (Feature Graphic). |
| ✅ | **Página de Política de Privacidad** | Creada en `/docs` lista para GitHub Pages (`https://franciscoarias10.github.io/LibrePDF/`), bilingüe (ES/EN), diseño premium dark mode y 100% compatible con Google Play. |
| ⏳ | **Compilación de Producción (`.aab`)** | Ejecutar `npx eas build -p android --profile production` para generar el Android App Bundle listo para subir a Google Play Console. |

---

## 🚀 2. Funcionalidades en Desarrollo / Próximas Versiones

### 📸 Modo Escaneo Continuo (Cámara en Ráfaga)
- **Estado:** ✅ *Implementado*
- **Descripción:** Capturar múltiples páginas seguidas (foto 1, foto 2, foto 3...) con visor a pantalla completa, contador de páginas capturadas y pase directo al editor sin salir de la cámara.

---

### ✍️ Firma Digital en Documentos
- **Estado:** ✅ *Implementado*
- **Descripción:** 
  - Panel interactivo para dibujar firmas a mano alzada con el dedo (tinta negra, azul, azul marino y grosor regulable).
  - Opción de importar una imagen de firma existente desde la galería con eliminación de fondo (`mix-blend-mode: multiply`).
  - Guardado de firma predeterminada en el dispositivo para reutilizarla con 1 toque.
  - Posicionar, escalar y estampar la firma en cualquier página del PDF con precisión milimétrica y calidad vectorial.

---

### 📖 Visor Interno de PDF (PDF Reader Embebido)
- **Estado:** ✅ *Implementado*
- **Descripción:** 
  - Visualizar el archivo PDF generado directamente dentro de LibrePDF sin depender de visores externos del sistema.
  - Renderizado de alta resolución con Mozilla PDF.js sobre HTML5 Canvas dentro de WebView nativo compatible con Expo Go.
  - Navegación táctil continua y controles para saltar entre páginas (anterior/siguiente).
  - Zoom interactivo multi-táctil (pinch-to-zoom hasta 5x) y barra flotante con botones (+, -, ajustar al ancho).
  - Información detallada del documento (peso, páginas, fecha) y acceso rápido a compartir o abrir externamente.

---

### 📐 Detección Automática de Bordes (Auto-crop Inteligente y Perspectiva)
- **Estado:** ✅ *Implementado*
- **Descripción:** 
  - Detección automática en milisegundos de las 4 esquinas de la hoja de papel sobre cualquier superficie mediante gradientes Sobel y análisis de contorno.
  - Corrección de perspectiva (homografía proyectiva completa 3x3) acelerada por GPU con WebGL y renderizado HTML5 Canvas offline.
  - Interfaz táctil con 4 esquinas independientes y 4 manijas de borde para mover lados completos paralelamente.
  - Lupa de precisión dinámica (zoom 2.5x con retícula) que flota sobre el dedo para alinear las esquinas con precisión milimétrica.
  - Modos duales: "Perspectiva (4 Esquinas)" y "Rectangular Tradicional", con botón de giro 90° y pantalla completa.
  - Accesible directamente al tocar la miniatura en la cámara tras la captura y en cada tarjeta del editor de páginas.

---

### 🔀 Reordenamiento de Páginas por Arrastre (Drag & Drop)
- **Prioridad:** Media
- **Descripción:** 
  - Permitir mantener presionada una miniatura de página y arrastrarla para cambiar su posición en el PDF de manera táctil y rápida.

---

### 📝 Edición de PDFs Existentes
- **Estado:** ✅ *Implementado*
- **Descripción:** 
  - Abrir cualquier documento PDF guardado en el historial o importado desde la tarjeta del documento o el visor interno.
  - Eliminar hojas individuales de forma interactiva con confirmación y prevención de documento vacío.
  - Agregar nuevas páginas utilizando la cámara en ráfaga (escaneo continuo) o seleccionando fotos múltiples de la galería.
  - Reordenar libremente la posición de las páginas (subir/bajar) y rotar páginas individuales 90° en sentido horario.
  - Previsualización táctil ampliada de cada página antes de aplicar cambios.
  - Guardado con opción de sobrescribir el archivo original directamente en el historial o exportarlo como un nuevo PDF independiente.
  - Procesamiento 100% nativo y offline con `pdf-lib` conservando la calidad vectorial y texto del documento original.

---

### 🔒 Protección con Contraseña y Cifrado
- **Estado:** ✅ *Implementado*
- **Descripción:** 
  - Opcionalmente añadir una clave de apertura al PDF generado para proteger documentos confidenciales.
  - Cifrado estándar RC4 de 128 bits compatible con todos los lectores de PDF (Adobe Acrobat, Chrome, Apple Books, Drive, etc.).
  - Desbloqueo interactivo en el Visor Interno embebido con modal de ingreso de contraseña y validación en tiempo real.
  - Distintivo visual de archivo protegido con candado en el historial de documentos.

---

### 📑 Combinar y Unir PDFs (Merge PDF)
- **Estado:** ✅ *Implementado*
- **Descripción:** 
  - Seleccionar dos o más documentos PDF guardados en el historial de LibrePDF o desde el almacenamiento del dispositivo (descargas, WhatsApp, Drive, etc.).
  - Reordenar de forma táctil los documentos antes de la fusión (subir/bajar posición con flechas ▲/▼).
  - Previsualizar conteo de páginas y tamaño individual y acumulado.
  - Personalización del nombre de salida del archivo consolidado.
  - Fusión de alta fidelidad 100% offline y en JavaScript puro (`pdf-lib`) compatible con Expo Go.
  - Guardado directo en el historial permanente y apertura en el Visor Interno.

---

### 🔍 Extracción de Texto (OCR)
- **Prioridad:** Futuro
- **Descripción:** 
  - Reconocimiento óptico de caracteres para extraer el texto de las imágenes escaneadas y poder copiarlo o exportarlo como `.txt`.
