# 💰 Mundo Finanzas - Dashboard Inteligente

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

Una aplicación web moderna para la gestión de finanzas personales. Permite rastrear ingresos, gastos, inversiones y deudas en cuotas, todo potenciado con análisis de Inteligencia Artificial (Gemini) para recibir consejos financieros personalizados.

## ✨ Características Principales

* **📊 Dashboard Interactivo:** Visualización clara de balance, ingresos y gastos.
* **💳 Control de Cuotas:** Gestión inteligente de compras a plazos (calcula deuda restante y pagos mensuales). Convierte cualquier gasto en cuotas o elimina movimientos con un clic.
* **💰 Integración Mercado Pago:** Sincronización automática de pagos y transferencias con webhook en tiempo real. Recibe notificaciones de tus movimientos directamente en la app.
* **🎙️ Reproductor de Audio:** Control de música integrado en la esquina inferior derecha con control de volumen y pausa/play. Disfruta de "Mundo Radio" mientras gestiona tus finanzas.
* **🚀 Portfolio de Inversiones:** Seguimiento del valor actual de tus activos vs. lo invertido.
* **🤖 Asesoría IA:** Integración con Google Gemini para analizar tus patrones de gasto y darte consejos (UI dedicada para ingresar tu API Key).
* **🔐 Autenticación Segura:** Login social con Google mediante Firebase Auth.
* **🎨 Diseño Moderno:** Interfaz responsiva construida con Tailwind CSS y gráficos con Chart.js.

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

* **Node.js** (v18 o superior recomendado)
* **Angular CLI** (`npm install -g @angular/cli`)
* Una cuenta de **Google Firebase** activa.

---

## 🚀 Configuración e Instalación

Sigue estos pasos para levantar el proyecto en tu máquina local:

### 1. Clonar el Repositorio

- git clone [https://github.com/cande342/finance-app.git](https://github.com/cande342/finance-app.git)
- cd finance-app
- npm install


### 2. ⚠️ Configuración de Firebase (IMPORTANTE)

Este proyecto utiliza Firebase como Backend (Auth y Base de datos). El archivo de entorno (`environment.ts`) que viene en el repositorio es solo un ejemplo o placeholder. Debes conectar tu propia base de datos.

1. Ve a la Consola de Firebase y crea un nuevo proyecto.
2. Registra una App Web para obtener tus credenciales (`apiKey`, etc.).
3. Habilita los siguientes servicios en la consola:
   - **Authentication:** Activa el proveedor de Google.
   - **Firestore Database:** Crea la base de datos (NoSQL). Las colecciones (`users`, `transactions`, etc.) se crearán automáticamente cuando uses la app.
4. Crear el archivo de entorno real:  
   Ve a la carpeta `src/environments/` y edita el archivo `environment.ts` pegando tus credenciales reales.

### 3. Ejecutar el proyecto localmente

```bash
ng serve
```

### 🤖 Configuración de Gemini AI (Inteligencia Artificial)

La clave de la IA no requiere configuración en el código fuente.

1. Inicia sesión en la aplicación.
2. Ve a la sección **Análisis**.
3. Haz clic en el icono de configuración (⚙️).
4. Ingresa tu **Google Gemini API Key**.
5. Si no tienes una, consíguela gratis en [Google AI Studio](https://ai.google.com/studio/).  
   La clave se guardará localmente en tu navegador de forma segura.

---

## 🎙️ Audio (Mundo Radio)

La aplicación incluye un reproductor de audio integrado en la esquina inferior derecha:

* **Control flotante:** Botón de play/pausa que no interfiere con la navegación
* **Control de volumen:** Ajusta el nivel de sonido con el slider desplegable
* **Persistencia:** El estado de reproducción se mantiene mientras navegas
* **Visualización:** Muestra etiqueta "Mundo Radio" cuando está en reproducción

El componente `AudioControlComponent` gestiona toda la funcionalidad mediante el servicio `AudioService`.

---

## 💰 Integración Mercado Pago

### Funcionalidades

La app se sincroniza automáticamente con tu cuenta de Mercado Pago para:
- Registrar gastos automáticamente desde tus pagos
- Capturar transferencias y movimientos
- Filtrar transferencias propias (detecta tu nombre en la descripción)
- Evitar duplicados mediante ID de pago

### Gestión de Transacciones

**Convertir a Cuotas:**
- Selecciona cualquier gasto del dashboard
- Haz clic en el botón "Convertir a Cuotas"
- Ingresa el nombre del artículo, cantidad de cuotas y monto total
- O calcula automáticamente ingresando el valor de la cuota
- Visualiza el progreso de pagos y deuda pendiente

**Eliminar Transacciones:**
- Botón rápido en cada transacción para eliminar movimientos incorrectos
- Ideal para limpiar pagos filtrados erróneamente

---

## 🔧 Arquitectura Técnica - Netlify Functions & Webhook

### mp-webhook.js
**Endpoint:** `/.netlify/functions/mp-webhook`  
**Método:** POST  
**Propósito:** Procesa notificaciones en tiempo real de Mercado Pago

**Flujo:**
1. Mercado Pago envía webhooks para eventos `payment.created` y `payment.updated`
2. La función valida el estado del pago (`approved`)
3. Filtra por tipo de operación: `regular_payment`, `pos_payment`, `transfer`, `p2p_transfer`, `account_money`
4. Detecta y excluye transferencias propias comparando la descripción con `MY_FULL_NAMES`
5. Verifica la fecha del pago (solo después del 01/12/2025)
6. Si cumple todos los criterios, registra el gasto en Firestore bajo `users/{userId}/transactions`
7. Evita duplicados usando el ID único del pago (`mpId`)

**Variables de entorno requeridas:**
```
MP_ACCESS_TOKEN         # Token de acceso de Mercado Pago
FIREBASE_SERVICE_ACCOUNT # JSON con credenciales del servicio de Firebase
MY_FIREBASE_UID         # UID del usuario en Firebase
MY_FULL_NAMES           # Nombres completos (comma-separated) para filtrar transfers propias
```

### mp-sync.js
**Endpoint:** `/.netlify/functions/mp-sync`  
**Método:** GET  
**Propósito:** Sincronización manual de pagos históricos de los últimos 7 días

**Flujo:**
1. Busca movimientos aprobados en los últimos 7 días vía API de Mercado Pago
2. Ordena por fecha de aprobación (descendente)
3. Aplica los mismos filtros que el webhook:
   - Excluye transferencias propias (por nombre)
   - Solo montos positivos (egresos)
4. Verifica duplicados antes de guardar
5. Registra con metadata `"manual-sync"` para diferenciar de webhooks
6. Retorna cantidad de nuevos movimientos sincronizados

**Seguridad:**
- Solo acepta GET desde la app (no POST)
- Verifica la existencia de registros antes de crear
- Maneja errores silenciosamente (status 200) para no exponer información

**Variables de entorno requeridas:**
- Mismas que `mp-webhook.js`

### Configuración Recomendada

1. **Registra tu webhook en Mercado Pago:**
   - Ve a [Configuración de Webhooks](https://www.mercadopago.com/developers/panel)
   - URL: `https://tu-dominio.netlify.app/.netlify/functions/mp-webhook`
   - Eventos: `payment.created` y `payment.updated`

2. **Configurar variables de entorno en Netlify:**
   - Dashboard de Netlify → Site settings → Build & deploy → Environment
   - Agrega las 4 variables mencionadas arriba

3. **Obtener credenciales Mercado Pago:**
   - [Mercado Pago Developers](https://www.mercadopago.com/developers)
   - Copia tu Access Token (Producción)

---

Ideas y sugerencias son recibidas, igual que mejoras añadidas mediante forks!

