# NeuroLab Web

## Configuración

1. Configura el backend según `apps/api/README.md`, aplica las migraciones y
   crea la cuenta local con `python scripts/create_local_admin.py` desde
   `apps/api`. La contraseña se solicita de forma oculta.
2. En desarrollo, Vite reenvía `/api` a `http://localhost:8000`.
3. La carga de datasets se realiza a través de la API autenticada. Configura
   `DATASET_STORAGE_DIR` en el backend y usa almacenamiento persistente en
   despliegues. No se requieren variables de Supabase en el navegador para
   cargar archivos.

El login valida la cuenta en la tabla PostgreSQL `users`; FastAPI emite un token
de acceso para proteger las rutas internas. No hay registro público.

## Desarrollo

```powershell
npm ci
npm run dev
```

Compilación de producción: `npm run build`.

Los proyectos solo admiten las familias CNN y RNN. El diseñador persiste
topología, forma de entrada e hiperparámetros. Un worker separado usa
TensorFlow/Keras para entrenar y publica curvas y métricas de evaluación.

Para despliegue, configura `VITE_API_BASE_URL` con la URL pública de la API.
Vercel y Render, junto con las variables de producción y el almacenamiento S3
compartido por API y worker, se describen en [`DEPLOYMENT.md`](../../DEPLOYMENT.md).
