# Respaldo de base de datos - Tropical Biohostel

## Script incluido: `backup-db.bat`

Realiza un `pg_dump` diario de la base de datos PostgreSQL que corre en Docker
(`turismo_db`, usuario `turismo_user`) y guarda el archivo `.sql` en la carpeta
`backups/` junto al script.

### Requisitos previos

- Docker Desktop ejecutado
- Contenedor de PostgreSQL levantado (`arrancar-db.bat` o `docker compose up -d`)
- `TURISMO_PG_PASSWORD` definida en el `.env` de la raíz del proyecto. Se genera
  sola con `node bin\credenciales.js`, que `instalar.bat` ya ejecuta.
- El nombre del contenedor debe coincidir con `CONTAINER_NAME` en el script
  (por defecto: `tropical-pg`, el nombre que crea `arrancar-db.bat`). Si levantas
  la base con `docker compose up -d`, el contenedor se llama
  `tropicalbiohostel_proyecto-postgres-1` y hay que ajustar esa línea.

### Ejecutar manualmente

Haz doble clic en `backup-db.bat` o ejecútalo desde la terminal:

```cmd
backup-db.bat
```

### Programar ejecución diaria (Windows - Programador de Tareas)

1. Abre el **Programador de Tareas** (`taskschd.msc`).
2. **Crear tarea básica...**
   - Nombre: `Respaldar BD Tropical Biohostel`
   - Desactivar "Configurado para" si aparece una versión antigua de Windows.
3. **Desencadenador:** Diario, a la hora que prefieras (ej. 03:00).
4. **Acción:** Iniciar un programa.
   - Programa o script: `X:\Proyectos\TropicalBiohostel_Proyecto\backup-db.bat`
   - Iniciar en: `X:\Proyectos\TropicalBiohostel_Proyecto`
5. **Finalizar.**

La tarea generará un archivo `.sql` cada día en la carpeta `backups/`.

### Restaurar un respaldo

```cmd
docker exec -i tropical-pg psql -U turismo_user -d turismo_db < backups\turismo_db_YYYYMMDD_HHMMSS.sql
```

### Alternativa: migrar a Neon o Supabase

Si prefieres no mantener la BD local, cambia `DATABASE_URL` en:

- `X:\Proyectos\TropicalBiohostel_Proyecto\.env`
- `X:\Proyectos\TropicalBiohostel_Proyecto\backend\.env`
- `X:\Proyectos\TropicalBiohostel_Proyecto\backend\.env.docker`

por el connection string de Neon/Supabase, despliega el backend en ese host y
elimina la dependencia de Docker para la base de datos.
