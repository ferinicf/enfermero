# 💊 MediHorario — Control de Medicamentos

Aplicación para llevar el control exacto de las medicinas de un familiar: **qué medicina le toca, a qué hora, durante cuántos días, qué es y para qué sirve**.

## ¿Qué hace?

- **📷 Lee la receta del médico con una foto.** Con inteligencia artificial (Gemini) identifica cada medicamento, la dosis, la frecuencia (la convierte en horarios concretos del día), la duración del tratamiento y las indicaciones especiales (con alimentos, en ayunas, etc.). Todo se puede revisar y corregir antes de guardar.
- **🕐 Agenda del día ("Hoy").** Muestra todas las tomas del día en orden, resalta la próxima toma, avisa si una está atrasada, y permite marcar cada toma como *tomada* u *omitida* con un botón grande.
- **🔔 Recordatorios.** Notificaciones del navegador a la hora exacta de cada toma.
- **📖 Explicación de cada medicina.** Para cada medicamento: qué es, para qué sirve, efectos secundarios comunes y precauciones, en lenguaje sencillo para un adulto mayor y su familia (con recordatorio de confirmar siempre con el médico).
- **📅 Duración del tratamiento.** Barra de progreso "día 3 de 7", fecha de inicio y fin, y aviso cuando el tratamiento termina. Soporta medicinas de uso continuo (crónicas).
- **📦 Control de inventario.** Opcional: cuántas pastillas quedan; se descuenta una en cada toma y avisa cuando hay que comprar más.
- **📈 Historial y cumplimiento.** Porcentaje de adherencia de los últimos 7 días y el detalle de cada toma (a qué hora real se tomó, cuáles se omitieron o quedaron sin registrar).
- **✍️ Registro manual.** También se pueden agregar o editar medicinas a mano, y pedir a la IA que explique cualquier medicamento.
- **🖨️ Imprimir** el horario del día para pegarlo en el refrigerador o dárselo a otro cuidador.
- **⚕️ Revisión de interacciones.** Con un botón, la IA analiza si los medicamentos activos tienen interacciones conocidas entre sí, con nivel de riesgo y consejos prácticos (se vuelve a sugerir cuando cambia la lista de medicinas).
- **📲 Compartir por WhatsApp.** Envía al chat familiar el resumen del día: qué se tomó, a qué hora, qué falta y el porcentaje de cumplimiento.
- **👨‍👩‍👧 Modo familiar (opcional).** Con Supabase configurado, todos los teléfonos de la familia ven las mismas medicinas y tomas en tiempo real: cualquiera puede marcar una toma y los demás lo ven al instante.
- **🙋 Perfil por persona.** Al abrir la app por primera vez, cada quien dice su nombre (Papá, Mamá...). Cada toma queda registrada con quién la marcó: "Tomada a las 8:05 · Mamá".
- **🔔 Avisos dentro de la app.** Campanita con la actividad de la familia (quién registró qué y cuándo, con contador de no leídos) y avisos en pantalla al instante cuando otro familiar marca una toma desde su teléfono.
- **📱 Instalable como app.** Es una PWA: desde el navegador del teléfono se instala con su propio icono ("Agregar a pantalla de inicio" en iPhone, botón "Instalar" en Android) y funciona aunque falle el internet (excepto las funciones de IA).

Sin configuración extra, los datos se guardan en el propio dispositivo (localStorage): no se necesita cuenta ni servidor.

## 🚀 Usarla ya (app publicada)

La app se publica automáticamente con GitHub Pages en cada push a la rama `main`:

**https://ferinicf.github.io/enfermero/**

Primer uso (solo lo hace una persona):

1. Abrir la dirección en el teléfono e instalar la app (botón "Instalar" en Android, o Compartir → "Agregar a pantalla de inicio" en iPhone).
2. Tocar **Ajustes ⚙️** (arriba a la derecha) y pegar la clave gratuita de Gemini (el enlace para obtenerla está ahí mismo). Opcional: pegar también la conexión de Supabase para el modo familiar.
3. Tocar **"Compartir enlace de configuración"** y mandarlo al chat de la familia.

Los demás solo abren ese enlace: la app queda configurada sola, eligen su nombre y listo. Las claves nunca se suben al repositorio; viajan solo en ese enlace privado y se guardan en cada teléfono.

## Cómo ejecutarla

**Requisito:** Node.js

1. Instalar dependencias:
   `npm install`
2. Crear un archivo `.env.local` con la clave de Gemini (para leer recetas y explicar medicinas):
   `VITE_GEMINI_API_KEY=tu-clave`
   (se obtiene gratis en https://aistudio.google.com/apikey)
3. Ejecutar:
   `npm run dev`
4. Abrir http://localhost:3000 — de preferencia en el teléfono, para poder tomar la foto de la receta con la cámara.

## Modo familiar (opcional): varios teléfonos sincronizados

Para que toda la familia vea las mismas medicinas y quién marcó cada toma (en tiempo real):

1. Crear un proyecto gratuito en https://supabase.com.
2. En el **SQL Editor** de Supabase, ejecutar:

   ```sql
   create table medicines (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );

   create table dose_logs (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );

   create table vitals (
     id text primary key,
     data jsonb not null,
     updated_at timestamptz not null default now()
   );

   -- Acceso abierto con la clave anónima (app de uso familiar/privado).
   -- Si se quiere más seguridad, activar RLS con autenticación de Supabase.
   alter table medicines enable row level security;
   alter table dose_logs enable row level security;
   alter table vitals enable row level security;
   create policy "familia medicines" on medicines for all using (true) with check (true);
   create policy "familia dose_logs" on dose_logs for all using (true) with check (true);
   create policy "familia vitals" on vitals for all using (true) with check (true);

   -- Tiempo real: que los demás teléfonos se enteren de los cambios al instante
   alter publication supabase_realtime add table medicines;
   alter publication supabase_realtime add table dose_logs;
   alter publication supabase_realtime add table vitals;
   ```

   > **¿Ya tenías la base creada de antes?** Solo falta la tabla de signos
   > vitales: ejecuta únicamente las líneas de `vitals` de arriba (create
   > table + enable row level security + policy + realtime). Mientras no
   > exista, los signos vitales se guardan solo en cada teléfono.

3. Copiar la URL del proyecto y la clave `anon` (Settings → API) al `.env.local`:

   ```
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-clave-anon
   ```

4. Reiniciar la app. Aparecerá una nubecita en el encabezado cuando esté sincronizada. Si un teléfono ya tenía medicinas guardadas, se suben automáticamente la primera vez.

### Instalarla en cada teléfono de la familia

Una vez publicada la app en una URL (por ejemplo con Vercel o Netlify, gratis), cada familiar solo tiene que:

1. Abrir la URL en el navegador del teléfono.
2. **Android (Chrome):** tocar el botón "Instalar" que aparece abajo, o menú ⋮ → "Instalar aplicación".
   **iPhone (Safari):** botón Compartir → "Agregar a pantalla de inicio".
3. Abrir la app desde el icono, decir su nombre ("¿Quién usa este teléfono?") y listo: todos ven las mismas medicinas, quién marcó cada toma, y reciben los avisos en la campanita.

Nota: con la clave anónima y estas políticas, cualquiera que tenga la clave puede leer/escribir los datos. Para uso familiar es práctico; no publiques la clave.

## Aviso importante

La lectura de recetas y las explicaciones de medicamentos son generadas por inteligencia artificial y pueden contener errores. **Siempre verifica los medicamentos, dosis y horarios con el médico o farmacéutico.** Esta app es una herramienta de organización, no un consejo médico.
