# Rivendel

Gestor familiar privado de Almudena y Adri. Ahora mismo incluye el **módulo 1: lista de la compra**. Más adelante llegarán el recetario, el menú semanal, las cuentas, los pendientes y las ideas.

- Web instalable en Android (PWA), hecha con React y TypeScript.
- Supabase guarda los datos y los sincroniza en tiempo real.
- Funciona sin conexión: los cambios se guardan en el móvil y se envían al volver la red.
- Se publica sola en GitHub Pages con cada cambio.

## Puesta en marcha (una sola vez, unos 20 minutos)

### 1. Supabase

1. Crea un proyecto nuevo, por ejemplo `rivendel`, en una región de Europa. Guarda la contraseña de la base de datos.
2. Abre **SQL Editor → New query**, pega el contenido de [`supabase/schema.sql`](supabase/schema.sql) y pulsa **Run**. Debe terminar sin errores.
3. Ve a **Authentication → Sign In / Providers → Email** y desactiva **Confirm email**. Así no tendréis que confirmar la cuenta por correo; solo vais a usarla vosotros dos.
4. En **Project Settings → API Keys** (o **API**) copia dos datos:
   - **Project URL**: tiene esta forma, `https://xxxx.supabase.co`.
   - La clave **anon** o **publishable**. Esta clave es pública por diseño: lo que protege los datos son las reglas de seguridad del esquema.

### 2. GitHub

1. Crea un repositorio **vacío** llamado `rivendel`. Tiene que ser **público**, porque GitHub Pages solo es gratis para repositorios públicos. El código no contiene datos ni contraseñas.
2. Sube este código al repositorio.
3. Pon la Project URL y la clave publishable en el archivo `.env.production`.
4. En **Settings → Pages → Build and deployment → Source**, elige **GitHub Actions**.
5. Ve a **Actions → Publicar en GitHub Pages → Run workflow**. En un par de minutos la app estará en `https://TU-USUARIO.github.io/rivendel/`.

### 3. Volver a Supabase

1. En **Authentication → URL Configuration**, pon esa dirección en **Site URL**.

### 4. Crear el hogar

1. Adri abre la app, elige **crear cuenta** y después **Crear hogar**. El catálogo empieza con 19 productos.
2. En **Más → Hogar** aparece un código de 6 letras.
3. Almudena crea su cuenta, elige **Unirme con código** y escribe ese código.
4. Cuando estéis los dos dentro, en Supabase ve a **Authentication → Sign In / Providers** y desactiva **Allow new users to sign up**. A partir de ahí nadie más puede registrarse.

### 5. Instalar en Android

Abre la dirección en Chrome, pulsa el menú **⋮** y elige **Instalar app** o **Añadir a pantalla de inicio**.

## Mantenimiento

- **Supabase no se pausa.** La tarea *Mantener Supabase activo* hace una llamada mínima dos veces por semana. Tened en cuenta que GitHub desactiva las tareas programadas de un repositorio que pasa 60 días sin cambios. Si eso ocurre, actívala de nuevo en la pestaña Actions.
- **Copia de seguridad.** En **Más → Exportar datos** se descarga un archivo con todo.
- **Actualizaciones.** Cada cambio en `main` se publica solo. La app instalada se actualiza la próxima vez que la abráis.

## Desarrollo

```bash
cp .env.example .env   # y rellena los dos valores
npm install
npm run dev
npm test
```

Estructura:

- `src/lib/logic.ts`: reglas de la lista. No usa la red y tiene tests.
- `src/lib/store.ts`: copia local, cola de cambios sin conexión, sincronización y tiempo real.
- `src/screens/`: pantallas Compra, Hoy, Comida y Más.
- `supabase/schema.sql`: tablas, reglas de seguridad y funciones.
