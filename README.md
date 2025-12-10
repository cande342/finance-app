# 💰 Mundo Finanzas - Dashboard Inteligente

![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Google%20Gemini-8E75B2?style=for-the-badge&logo=googlebard&logoColor=white)

Una aplicación web moderna para la gestión de finanzas personales. Permite rastrear ingresos, gastos, inversiones y deudas en cuotas, todo potenciado con análisis de Inteligencia Artificial (Gemini) para recibir consejos financieros personalizados.

## ✨ Características Principales

* **📊 Dashboard Interactivo:** Visualización clara de balance, ingresos y gastos.
* **💳 Control de Cuotas:** Gestión inteligente de compras a plazos (calcula deuda restante y pagos mensuales).
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

git clone [https://github.com/cande342/finance-app.git](https://github.com/cande342/finance-app.git)
cd finance-app
npm install


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


Ideas y sugerencias son recibidas, igual que mejoras añadidas mediante forks!

