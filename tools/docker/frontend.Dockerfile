# Etapa única, simple y estable para dev con pnpm
FROM node:20-bullseye
WORKDIR /app

# Habilita pnpm vía corepack (Node 20 ya lo trae)
RUN corepack enable

# Copia manifest + lockfile (asegúrate de tener pnpm-lock.yaml)
COPY apps/frontend/package.json apps/frontend/pnpm-lock.yaml ./

# Instala dependencias de forma reproducible
RUN pnpm install --frozen-lockfile

# Copia el resto del código
COPY apps/frontend/ .

EXPOSE 5173
CMD ["pnpm", "dev", "--host", "0.0.0.0"]
