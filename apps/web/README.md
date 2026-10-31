# NeuroLab Web

## Configuración

1. Configura el backend según `apps/api/README.md`, aplica las migraciones y
   crea la cuenta local con `python scripts/create_local_admin.py` desde
   `apps/api`. La contraseña se solicita de forma oculta.
2. En desarrollo, Vite reenvía `/api` a `http://localhost:8000`.
3. Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se usan solo
   para la integración opcional de Supabase Storage. Nunca pongas claves
   secretas ni la contraseña de PostgreSQL en variables `VITE_*`.

El login valida la cuenta en la tabla PostgreSQL `users`; FastAPI emite un token
de acceso para proteger las rutas internas. No hay registro público.

La carga de archivos a Storage no está habilitada con la autenticación local:
el flujo actual de Storage depende de una sesión Supabase Auth. Para habilitarlo
se debe integrar carga firmada desde el backend; no abras el bucket a usuarios
anónimos.

## Desarrollo

```powershell
npm ci
npm run dev
```

Compilación de producción: `npm run build`.

La API implementa metadatos de modelos y solicitudes de reportes, pero aún no
almacena artefactos de modelos, genera archivos de reportes ni administra
invitaciones de usuarios. La UI indica esas limitaciones y no simula resultados.
