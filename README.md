# EcoSalud - Frontend

Este es el frontend de la aplicación **EcoSalud**, desarrollado con **React** y **Vite**.

## Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- [Node.js](https://nodejs.org/) (versión 18 o superior recomendada)
- Un gestor de paquetes como **npm** (viene instalado por defecto con Node.js) o **yarn**.

---

## Instrucciones para Ejecutar el Proyecto

Sigue estos pasos para configurar y ejecutar la aplicación en tu entorno local:

### 1. Clonar o acceder a la carpeta del proyecto
Asegúrate de estar posicionado en el directorio del frontend:
```bash
cd frontend-ecosalud
```

### 2. Instalar las dependencias
Descarga e instala todas las librerías necesarias ejecutando:
```bash
npm install
```

### 3. Iniciar el servidor de desarrollo
Para iniciar la aplicación en modo desarrollo, ejecuta:
```bash
npm run dev
```
Una vez iniciado, abre tu navegador y ve a la dirección que te muestre la consola (usualmente [http://localhost:5173](http://localhost:5173)).

---

## Otros Comandos Disponibles

En el archivo `package.json` encontrarás otros scripts útiles:

- **Compilar para producción**:
  ```bash
  npm run build
  ```
  Esto creará una carpeta `dist` con los archivos optimizados para producción listos para ser desplegados.

- **Previsualizar la compilación**:
  ```bash
  npm run preview
  ```
  Permite levantar un servidor local para probar la versión de producción que acabas de compilar con `npm run build`.

- **Análisis de código (Linter)**:
  ```bash
  npm run lint
  ```
  Ejecuta ESLint para buscar y corregir posibles problemas o advertencias de estilo en tu código.
