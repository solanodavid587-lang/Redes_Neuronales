# Despliegue de NeuroLab

La configuración gratuita despliega la web en Vercel y la API como un Web
Service Free en Render. Los datasets nuevos se guardan en el repositorio privado
de Hugging Face; la base de datos continúa en Supabase. Render Free no ofrece
Background Workers, así que el worker TensorFlow/Keras debe ejecutarse
localmente cuando se necesite entrenar. El filesystem de Render Free es
efímero: no se debe usar para persistir datasets ni artefactos.

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
2. El Blueprint crea solo la API `neurolab-api` en el plan **Free**. Completa
   las variables que Render solicita:
   - `SUPABASE_URL`: URL del proyecto Supabase (necesaria para formar el issuer
     JWT).
   - `CORS_ORIGINS`: array JSON con los orígenes permitidos, por ejemplo
     `["https://tu-app.vercel.app"]`.
   - **Hugging Face (datasets privados):** crea un repositorio privado del tipo
     **Dataset** y un token Fine-grained con lectura y escritura limitadas a ese
     repositorio. En las variables de `neurolab-api`, configura `HF_TOKEN` con
     el token y `HF_DATASET_REPO_ID` con el identificador `usuario/repositorio`.
     No agregues el token a Vercel ni al worker. La API usará Hugging Face para
     guardar los datasets nuevos cuando ambas variables estén configuradas.
     NeuroLab no impone un límite de tamaño propio; Hugging Face y Render sí
     pueden aplicar límites, cuotas y tiempo máximo de solicitud.
3. En las variables privadas de `neurolab-api`, configura los valores de
   Supabase **Connect → Session pooler**: `DB_HOST`, `DB_PORT`, `DB_DATABASE`,
   `DB_USERNAME` y `DB_PASSWORD`.
4. El Blueprint genera `WORKER_API_KEY` y `AUTH_TOKEN_SECRET`. Mantén ambos
   privados y no los pongas en Vercel. Para entrenar, configura `WORKER_API_KEY`
   también en el entorno local del worker y usa
   `NEUROLAB_API_URL=https://<tu-api>.onrender.com/api/v1`.
5. Al iniciar el contenedor, la API ejecuta `alembic upgrade head` antes de
   arrancar Uvicorn y expone `/health`. Si una migración falla, la API no inicia.
   Render Free puede tardar cerca de un minuto en despertar tras inactividad y
   dispone de 750 horas gratuitas al mes; el worker local que consulta la API
   continuamente puede mantenerla despierta.
6. Configura `VITE_API_BASE_URL` en Vercel con la URL pública de la API más
   `/api/v1`. Vuelve a desplegar la web para que Vite incorpore esa variable.

Los archivos que ya estaban en almacenamiento local o S3 no se migran
automáticamente a Hugging Face. Este Blueprint usa Hugging Face para cargas
nuevas cuando `HF_TOKEN` y `HF_DATASET_REPO_ID` están configurados.

### Límites del plan gratuito

Render Free duerme el servicio web tras 15 minutos sin tráfico, puede tardar
cerca de un minuto en despertar y concede 750 horas gratuitas al mes. No ofrece
Background Workers ni almacenamiento persistente. Hugging Face tiene sus propias
cuotas, condiciones y límites de archivo; quitar el límite de NeuroLab no elimina
los límites del proveedor. Consulta las [limitaciones vigentes de Render Free](https://render.com/docs/free)
y las de tu cuenta de Hugging Face antes de subir datasets grandes.

## Comprobación antes de publicar

- Verifica que `SUPABASE_URL`, la base PostgreSQL, secretos y orígenes CORS
  estén configurados. Comprueba que `HF_TOKEN` y `HF_DATASET_REPO_ID` estén en
  el servicio API y que el repositorio sea privado.
- Confirma que la revisión de base de datos aplicada incluya las métricas de
  evaluación (`alembic upgrade head`).
- Prueba el login, la carga de un dataset y la página de evaluación desde el
  dominio Vercel. Para entrenar, inicia el worker local con `WORKER_API_KEY` y
  `NEUROLAB_API_URL` apuntando a Render; no existe un worker remoto en este plan.
- Verifica los logs de API, previsualiza y elimina un dataset de prueba, y
  confirma que el worker local puede descargar el archivo privado. El
  entrenamiento no se ejecuta en Render con este plan gratuito.

La configuración de despliegue no equivale a un despliegue realizado: aún se
requieren una cuenta, credenciales de Supabase y Hugging Face, y el dominio real
de Vercel para completar `CORS_ORIGINS`.
