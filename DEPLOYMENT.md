# Despliegue de NeuroLab

La aplicación se despliega como tres servicios: web en Vercel, API y worker
TensorFlow/Keras en Render. La API y el worker comparten datasets y artefactos
por medio de almacenamiento de objetos S3 compatible; el almacenamiento local
de Render no se comparte entre servicios ni es persistente.

## Vercel

1. Importa el repositorio y establece `apps/web` como **Root Directory**.
2. Usa el preset Vite; `apps/web/vercel.json` configura instalación, build,
   salida `dist` y fallback SPA para las rutas del cliente.
3. Añade `VITE_API_BASE_URL` con la URL pública de la API, incluyendo
   `/api/v1` (por ejemplo, `https://neurolab-api.onrender.com/api/v1`).
4. Después del primer despliegue, añade el dominio Vercel a `CORS_ORIGINS` en
   Render y vuelve a desplegar la API.

## Render

1. Crea un **Blueprint** desde este repositorio y revisa los costos de los
   servicios antes de aprobarlos. El Blueprint usa la base de datos Supabase
   existente; no crea una base de datos Render adicional.
2. En el grupo `neurolab-shared`, completa:
   - `SUPABASE_URL`: URL del proyecto Supabase (necesaria para formar el issuer
     JWT).
   - `CORS_ORIGINS`: array JSON con los orígenes permitidos, por ejemplo
     `["https://tu-app.vercel.app"]`.
   - Elige un proveedor y crea un bucket privado llamado, por ejemplo,
     `neurolab-files`.
   - **Cloudflare R2:**
     crea un bucket y un token S3 con permisos de lectura/escritura limitados a
     ese bucket. Usa `S3_REGION=auto`, `S3_ENDPOINT_URL=https://<account-id>.r2.cloudflarestorage.com`
     y las credenciales de ese token.
   - **Supabase Storage:** en la configuración S3 de Storage, genera una pareja
     de claves y copia literalmente el endpoint y la región que muestra
     Supabase. El endpoint directo suele tener esta forma:
     `https://<project-ref>.storage.supabase.co/storage/v1/s3`.
   - En cualquiera de los proveedores, completa `S3_BUCKET` con el nombre del
     bucket, `S3_ACCESS_KEY_ID` y `S3_SECRET_ACCESS_KEY` con las credenciales
     S3 correspondientes.
   - **Hugging Face (datasets privados):** crea un repositorio privado del tipo
     **Dataset** y un token Fine-grained con lectura y escritura limitadas a ese
     repositorio. En las variables de `neurolab-api`, configura `HF_TOKEN` con
     el token y `HF_DATASET_REPO_ID` con el identificador `usuario/repositorio`.
     No agregues el token a Vercel ni al servicio worker. La API usará Hugging
     Face para nuevos datasets cuando ambas variables estén configuradas y
     entregará al worker los archivos por una ruta autenticada. NeuroLab ya no
     aplica un límite de tamaño propio a las cargas; Hugging Face, el proveedor
     y Render pueden imponer límites y cuotas.
3. En las variables privadas de `neurolab-api`, configura los valores de
   Supabase **Connect → Session pooler**: `DB_HOST`, `DB_PORT`, `DB_DATABASE`,
   `DB_USERNAME` y `DB_PASSWORD`. El worker no necesita acceso a la base de
   datos.
4. El Blueprint genera `WORKER_API_KEY` y `AUTH_TOKEN_SECRET`. Mantén ambos
   privados y no los pongas en Vercel.
5. El servicio web de la API ejecuta `alembic upgrade head` antes del despliegue
   y expone `/health`. El worker usa la URL privada interna de la API. Si se
   eligió S3 para datasets o artefactos, configura las mismas credenciales S3 en
   API y worker; Hugging Face solo necesita configurarse en la API.
6. Configura `VITE_API_BASE_URL` en Vercel con la URL pública de Render más
   `/api/v1`. Vuelve a desplegar la web para que Vite incorpore esa variable.

Las credenciales S3 son exclusivamente de servidor. En Supabase, las claves S3
pueden operar en todos los buckets y omiten RLS; en R2, limita el token al
bucket de la aplicación. Guárdalas solo en el grupo de entorno privado de
Render; no las pongas en Vercel ni en el navegador. La ruta local se mantiene
para desarrollo, no como almacenamiento compartido de producción.

### Límites gratuitos y costos

Cloudflare R2 incluye actualmente una cuota mensual gratuita de 10 GB-mes de
almacenamiento Standard, 1 millón de operaciones Class A, 10 millones Class B y
sin cargos de egreso. El uso por encima de las cuotas se factura; revisa los
precios vigentes y configura alertas/límites en tu cuenta.

Supabase Storage Free incluye 1 GB de archivos, pero limita cada archivo a
50 MB. Ese límite del proveedor sigue aplicándose si se usa Supabase Storage;
NeuroLab no impone un límite propio de tamaño.
El límite por archivo se puede aumentar hasta 500 GB en Pro o superior;
revisa el precio y posibles cargos de cómputo, transferencia y almacenamiento
antes de elegirlo para datasets grandes.

Referencias oficiales: [precios de Cloudflare R2](https://developers.cloudflare.com/r2/pricing/),
[compatibilidad S3 de Supabase](https://supabase.com/docs/guides/storage/s3/compatibility),
[autenticación S3](https://supabase.com/docs/guides/storage/s3/authentication),
[límites de archivo de Supabase](https://supabase.com/docs/guides/storage/uploads/file-limits) y
[precios de Supabase](https://supabase.com/pricing).

## Comprobación antes de publicar

- Verifica que `SUPABASE_URL`, la base PostgreSQL, secretos y orígenes CORS
  estén configurados. Para Hugging Face, comprueba que `HF_TOKEN` y
  `HF_DATASET_REPO_ID` estén en el servicio API y que el repositorio sea privado;
  para S3, API y worker deben compartir endpoint, región y bucket. Ambos
  servicios deben usar el mismo `WORKER_API_KEY`.
- Confirma que la revisión de base de datos aplicada incluya las métricas de
  evaluación (`alembic upgrade head`).
- Prueba el login, la carga de un dataset, un entrenamiento CNN y otro RNN, y
  la página de evaluación desde el dominio Vercel.
- Verifica los logs de API y worker, previsualiza y elimina un dataset de
  prueba, inicia un entrenamiento y confirma que el worker puede descargar el
  archivo privado. Si usas S3 para artefactos, confirma que quedan en el bucket.

La configuración de despliegue no equivale a un despliegue realizado: aún se
requieren una cuenta, credenciales, bucket y dominios del usuario.
