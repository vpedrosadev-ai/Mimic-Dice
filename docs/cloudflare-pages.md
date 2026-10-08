# Despliegue en Cloudflare Pages

Esta rama prepara Mimic Dice para funcionar como una app web normal en Cloudflare Pages, sin descargar ejecutables.

## Configuracion recomendada

- Project name: `mimicdice`
- Production branch: `feature/cloudflare-pages` para esta primera prueba
- Build command: `npm run build:cloudflare`
- Build output directory: `dist`
- Root directory: dejar vacio
- Node version: `22.16.0`

La URL canonica de produccion es:

```text
https://themimicdice.com
```

El alias `https://www.themimicdice.com` debe redirigir con `308` al dominio
canonico, conservando ruta y parametros. `https://mimic-dice.pages.dev` sirve
la aplicacion directamente para poder usar tambien el login de Google desde el
dominio de Pages.

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

## Dominio propio y alias www

Dominio canonico: `themimicdice.com`.

Configuracion recomendada en Cloudflare:

1. Mantener `themimicdice.com` como dominio personalizado activo del proyecto Pages actual.
2. Crear un registro DNS proxied para `www` y una redireccion permanente a `https://themimicdice.com`.
3. Conservar ruta y query string en la redireccion; por ejemplo,
   `https://www.themimicdice.com/foo?a=1` debe terminar en
   `https://themimicdice.com/foo?a=1`.
4. Mantener `mimic-dice.pages.dev` como host secundario funcional. Las cookies
   de Auth.js son independientes en cada dominio, por lo que el usuario debe
   iniciar sesion una vez en cada host.
5. Usar SSL/TLS `Full (strict)`, `Always Use HTTPS` y TLS minimo 1.2.

Para `www`, la configuracion oficial de Cloudflare puede hacerse con un registro
`A` proxied a `192.0.2.1` y una Single Redirect Rule. La regla debe responder
con `301` o `308` y preservar subruta y query string.

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
- Callbacks Google:
  - `https://themimicdice.com/api/auth/callback/google`
  - `https://mimic-dice.pages.dev/api/auth/callback/google`

En Google Cloud Console, el cliente OAuth de tipo `Web application` debe tener:

```text
Authorized JavaScript origins:
https://themimicdice.com
https://mimic-dice.pages.dev

Authorized redirect URIs:
https://themimicdice.com/api/auth/callback/google
https://mimic-dice.pages.dev/api/auth/callback/google
```

No hace falta autorizar `www` porque redirige antes de iniciar Auth.js. Ambos
hosts usan el mismo cliente OAuth, `AUTH_SECRET`, D1 y cuentas, aunque cada host
mantiene su propia cookie de sesion.

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

## Monsters League

El modo online usa un Durable Object independiente para conservar una única
versión autoritativa del lobby, la subasta, los bots y el estado en vivo del
combate. Antes de desplegar Pages por primera vez con esta función:

```powershell
npx wrangler deploy --config workers/monsters-league/wrangler.toml
npx wrangler d1 migrations apply mimic-dice-production --remote
```

Después se despliega Pages normalmente. El binding
`MONSTERS_LEAGUE_ROOMS` de `wrangler.toml` apunta al Worker
`mimicdice-monsters-league`, por lo que el Worker debe existir primero. La
migración `0010_multiplayer_rooms.sql` crea el índice de salas y su caducidad;
el estado efímero de cada partida permanece en el Durable Object.

Para probar todo el draft sin infraestructura ni otras cuentas, abre
Multijugador y usa **Probar con bots**. Ese flujo permanece local y nunca
intenta conectarse al Worker.

## Almacenamiento cloud

- D1 guarda usuarios, metadatos, campañas y publicaciones individuales por fragmentos.
- R2 (`mimic-dice-assets`, binding `CLOUD_ASSETS`) guarda imágenes privadas.
- Antes del primer guardado cloud, las imágenes `data:` se redimensionan a un máximo de 1024 px y se convierten a WebP.
- Los objetos R2 se deduplican por SHA-256 dentro de cada usuario. D1 solo conserva sus URL y relaciones de acceso.
- Las imágenes y publicaciones de mapas no tienen cuota acumulada por usuario. Cada imagen de mapa admite hasta 75 MiB y todas comparten el corte global de seguridad.
- El almacenamiento conjunto de archivos R2 tiene un corte de seguridad en 9 GB decimales. La migración `0008_global_asset_storage_limit.sql` mantiene un contador transaccional y rechaza la subida que superaría ese umbral.
- Una imagen es accesible por su propietario y por usuarios propietarios de una campaña que la referencia. El acceso anónimo solo se permite si alguna campaña o publicación relacionada es pública.

La biblioteca comunitaria admite personajes, encuentros, hechizos, objetos y criaturas. Importar crea una copia en la campaña actual; no modifica la publicación original.

El backend devuelve `404` tanto para campanas privadas ajenas como inexistentes. Publicar una campana permite leerla y copiarla, pero nunca modificar el original. Cada copia queda privada y pertenece al usuario que la crea.

## Siguiente paso opcional: mover imagenes a R2

La build web actual pesa bastante porque `dist/images` contiene la biblioteca de imagenes de los compendios. Cloudflare Pages deberia poder manejar el numero actual de archivos, pero si los deploys se vuelven lentos o el proyecto crece, conviene mover `images` a Cloudflare R2 y apuntar la app al bucket publico.
