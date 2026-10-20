FROM node:22

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY prisma ./prisma/
RUN npx prisma generate --schema=prisma/schema.prisma

# Compila el seed a JS plano para poder ejecutarlo en producción sin ts-node:
#   node prisma/dist/seed.js
RUN npx tsc prisma/seed.ts --outDir prisma/dist --module commonjs --target es2021 --esModuleInterop --skipLibCheck --moduleResolution node \
  || echo "⚠️  No se pudo compilar el seed (revisar deps de desarrollo)."

# --- Migraciones de esquema ---
# 1) Baseline: si la base es preexistente (sin historial en _prisma_migrations),
#    marca la migración inicial como aplicada SIN ejecutar su SQL.
# 2) Aplica las migraciones pendientes.
# Tolerante a que la base no sea accesible durante el build: no rompe el despliegue.
# Para aplicarlas manualmente:  npm run prisma:deploy
RUN node prisma/baseline.js || echo "⚠️  Baseline omitido (BD no accesible durante el build)."
RUN npx prisma migrate deploy || echo "⚠️  migrate deploy omitido (BD no accesible durante el build)."

COPY tsconfig.json nest-cli.json ./
COPY src ./src/
COPY scripts ./scripts/

RUN npx nest build

EXPOSE 3001

# scripts/start.js aplica el seed idempotente y luego levanta la API
CMD ["node", "scripts/start.js"]
