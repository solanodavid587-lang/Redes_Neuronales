# Despliegue de NeuroLab

La configuración gratuita despliega la web en Vercel y la API como un Web
Service Free en Render. Los datasets nuevos y los modelos entrenados se guardan
en el repositorio privado de Hugging Face; la base de datos continúa en Supabase.
Render Free no ofrece Background Workers; la opción bajo demanda usa GitHub
Actions para ejecutar cada entrenamiento en un runner temporal. El filesystem
de Render y de los runners de GitHub es efímero, por lo que no se usa para
persistir datasets ni modelos.

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
   privados y no los pongas en Vercel. Para habilitar entrenamientos bajo demanda
   con GitHub Actions:
   - En Render configura `GH_ACTIONS_TOKEN` con un token Fine-grained limitado a
     este repositorio y con permiso **Actions: Read and write**.
   - En GitHub, en **Settings → Secrets and variables → Actions**, agrega el
     secreto `WORKER_API_KEY` con el mismo valor de Render y la variable
     `NEUROLAB_API_URL=https://neurolab-api-75uu.onrender.com/api/v1`.
   - El Blueprint establece `GH_ACTIONS_REPOSITORY` para este repositorio. La
     acción `.github/workflows/training-worker.yml` ejecuta un trabajo por
     entrenamiento, sube métricas a la API y conserva el modelo en el
     repositorio privado de Hugging Face.
   - GitHub Actions tiene cuotas y límites de ejecución; un runner gratuito es
     temporal y no equivale a un worker siempre activo. Si no configuras la
     integración, los trabajos quedan en cola y requieren un worker iniciado
     manualmente.
5. Al iniciar el contenedor, la API ejecuta `alembic upgrade head` antes de
   arrancar Uvicorn y expone `/health`. Si una migración falla, la API no inicia.
   Render Free puede tardar cerca de un minuto en despertar tras inactividad y
   dispone de 750 horas gratuitas al mes. El entrenamiento en GitHub Actions es
   puntual y no mantiene despierta la API entre trabajos.
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
  dominio Vercel. Para entrenar sin mantener un equipo encendido, configura y
  prueba GitHub Actions según los pasos anteriores; verifica también que los
  artefactos `.keras` aparezcan en el repositorio privado de Hugging Face.
- Verifica los logs de API, previsualiza y elimina un dataset de prueba, y
  confirma que el runner de GitHub puede descargar el archivo privado mediante
  la API.

La configuración de despliegue no equivale a un despliegue realizado: aún se
requieren una cuenta, credenciales de Supabase y Hugging Face, y el dominio real
de Vercel para completar `CORS_ORIGINS`.
