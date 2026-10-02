FROM node:22

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY prisma ./prisma/
RUN npx prisma generate --schema=prisma/schema.prisma

COPY tsconfig.json nest-cli.json ./
COPY src ./src/

RUN npx nest build

EXPOSE 3001

CMD ["node", "dist/main.js"]
