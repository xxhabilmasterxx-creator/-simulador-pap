# Simulador PAP — versión Netlify (con guardado persistente)

Esta carpeta convierte el simulador en un sitio real desplegable en Netlify,
con dos piezas de servidor (Netlify Functions):

- **`netlify/functions/evaluate.js`** — llama a la API de Anthropic con tu
  propia clave (guardada de forma segura en el servidor) para evaluar las
  respuestas abiertas de los estudiantes.
- **`netlify/functions/sessions.js`** — guarda y lista las sesiones del modo
  docente usando **Netlify Blobs**, una base de datos clave-valor incluida
  gratis en cualquier sitio de Netlify (no necesitas crear una base de datos
  aparte).

## Estructura

```
simulador-pap-netlify/
├── index.html                      ← el simulador (front-end)
├── netlify.toml                    ← configuración de Netlify
├── package.json                    ← dependencia @netlify/blobs
└── netlify/
    └── functions/
        ├── evaluate.js             ← evaluación IA (server-side)
        └── sessions.js             ← guardado de sesiones (Netlify Blobs)
```

## Pasos para desplegar

### 1. Sube esta carpeta a un repositorio de GitHub (recomendado)

Netlify puede desplegar directo desde una carpeta arrastrada, pero **las
Functions y Netlify Blobs funcionan mejor conectando un repo de Git**, porque
así Netlify instala las dependencias (`@netlify/blobs`) automáticamente en
cada despliegue.

```bash
cd simulador-pap-netlify
git init
git add .
git commit -m "Simulador PAP con Netlify Functions"
```

Sube ese repo a GitHub y en Netlify: **Add new site → Import an existing
project → conecta el repo**. Netlify detectará `netlify.toml` solo.

### 2. Configura tu clave de API de Anthropic

En el panel de tu sitio en Netlify:

**Site configuration → Environment variables → Add a variable**

- Key: `ANTHROPIC_API_KEY`
- Value: tu clave de API (la obtienes en [console.anthropic.com](https://console.anthropic.com))

Guarda y vuelve a desplegar el sitio (**Deploys → Trigger deploy**) para que
la variable quede disponible en las Functions.

### 3. Netlify Blobs

No requiere configuración adicional: en cuanto el sitio está desplegado en
Netlify, `@netlify/blobs` funciona automáticamente dentro de las Functions.
Los datos quedan asociados a tu sitio y persisten entre despliegues.

### 4. Prueba

- Completa una simulación como estudiante → al terminar, se guarda sola.
- Entra al modo docente (clave por defecto: `pap2026`, la puedes cambiar en
  `index.html`, busca la constante `TEACHER_PASSWORD`) y revisa que la
  sesión aparezca en el listado.

## Notas de seguridad

- La clave de Anthropic **nunca** viaja al navegador del estudiante: solo
  vive en la variable de entorno del servidor y la usa `evaluate.js`.
- La clave del modo docente (`TEACHER_PASSWORD`) es una protección simple de
  cara al estudiante, no seguridad real — cualquiera con acceso al código
  fuente puede verla. Si necesitas control de acceso real, dímelo y lo
  agregamos con Netlify Identity o similar.

## Desarrollo local (opcional)

Si quieres probar todo en tu computador antes de subirlo:

```bash
npm install -g netlify-cli
cd simulador-pap-netlify
npm install
netlify dev
```

Esto levanta el sitio y las Functions juntos en `http://localhost:8888`,
incluyendo un `ANTHROPIC_API_KEY` que puedes definir en un archivo `.env`
local (no lo subas a git).
