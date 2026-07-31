# Despliegue en Cloudflare Pages

Esta rama prepara Mimic Dice para funcionar como una app web normal en Cloudflare Pages, sin descargar ejecutables.

## Configuracion recomendada

- Project name: `mimicdice`
- Production branch: `feature/cloudflare-pages` para esta primera prueba
- Build command: `npm run build:cloudflare`
- Build output directory: `dist`
- Root directory: dejar vacio
- Node version: `22.16.0`

La URL de produccion actual es:

```text
https://mimic-dice.pages.dev
```

Si ese subdominio no esta disponible, elige otro nombre de proyecto en Cloudflare, por ejemplo:

```text
mimic-dice-app
mimicdice
mimic-dice-vicky
```

## Desplegar desde el dashboard de Cloudflare

1. Sube esta rama a GitHub.
2. En Cloudflare, abre `Workers & Pages`.
3. Elige `Create application`.
4. Elige `Pages`.
5. Conecta el repositorio de GitHub.
6. Selecciona la rama a desplegar.
7. Usa la configuracion de build indicada arriba.
8. Lanza el deploy.

## Dominio propio

De momento usaremos el dominio gratuito `pages.dev`. Mas adelante, si hace falta, Cloudflare permite asociar un dominio propio desde la configuracion del proyecto Pages.

Ejemplos:

```text
https://mimicdice.com
https://app.mimicdice.com
https://mimic-dice.yourdomain.com
```

## Notas del modo navegador

La version de navegador no puede escribir directamente en cualquier archivo local como hace Electron. Mimic Dice ya usa comportamientos seguros de navegador cuando la API de Electron no existe: descargas/subidas de JSON y almacenamiento local.

Los archivos estaticos salen de estas carpetas:

- `dist/assets`: codigo empaquetado y assets de interfaz
- `dist/data`: datos CSV y JSON de compendios
- `dist/images`: imagenes de bestiario e items

Las cabeceras de Cloudflare estan configuradas en `public/_headers`:

- los assets con hash tienen cache larga e inmutable
- las imagenes grandes tienen cache de una semana
- los CSV/JSON se refrescan facil tras cada deploy

No hace falta archivo `_redirects` para esta app. Cloudflare Pages ya tiene fallback SPA por defecto para navegaciones de navegador que no coinciden con un archivo real.

## Cuentas, Auth.js y D1

La web mantiene el modo invitado local y anade cuentas Google opcionales. Los invitados siguen usando `localStorage` y archivos JSON. Las cuentas guardan campanas privadas en D1, con autoguardado y publicacion voluntaria.

Recursos de produccion:

- D1: `mimic-dice-production`
- Binding: `DB`
- Migraciones: `migrations/`
- Callback Google: `https://mimic-dice.pages.dev/api/auth/callback/google`

Secrets requeridos en Pages (nunca se guardan en Git):

```text
AUTH_SECRET
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
REGISTRATION_CODE
```

Para desarrollo local, crear `.dev.vars` con esos nombres y valores de desarrollo. El archivo esta ignorado por Git. Aplicar migraciones locales con:

```powershell
npx wrangler d1 migrations apply mimic-dice-production --local
```

Aplicar migraciones de produccion con:

```powershell
npx wrangler d1 migrations apply mimic-dice-production --remote
```

## Almacenamiento cloud

- D1 guarda usuarios, metadatos, campañas y publicaciones individuales por fragmentos.
- R2 (`mimic-dice-assets`, binding `CLOUD_ASSETS`) guarda imágenes privadas.
- Antes del primer guardado cloud, las imágenes `data:` se redimensionan a un máximo de 1024 px y se convierten a WebP.
- Los objetos R2 se deduplican por SHA-256 dentro de cada usuario. D1 solo conserva sus URL y relaciones de acceso.
- Una imagen es accesible por su propietario y por usuarios propietarios de una campaña que la referencia. El acceso anónimo solo se permite si alguna campaña o publicación relacionada es pública.

La biblioteca comunitaria admite personajes, encuentros, hechizos, objetos y criaturas. Importar crea una copia en la campaña actual; no modifica la publicación original.

El backend devuelve `404` tanto para campanas privadas ajenas como inexistentes. Publicar una campana permite leerla y copiarla, pero nunca modificar el original. Cada copia queda privada y pertenece al usuario que la crea.

## Siguiente paso opcional: mover imagenes a R2

La build web actual pesa bastante porque `dist/images` contiene la biblioteca de imagenes de los compendios. Cloudflare Pages deberia poder manejar el numero actual de archivos, pero si los deploys se vuelven lentos o el proyecto crece, conviene mover `images` a Cloudflare R2 y apuntar la app al bucket publico.
