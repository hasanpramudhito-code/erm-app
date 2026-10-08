# Build frontend, lalu jalankan server Express yang juga menyajikan hasil build.
FROM node:22-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html vite.config.js jsconfig.json ./
COPY public ./public
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app/server
COPY server/package.json server/package-lock.json ./
COPY server/prisma ./prisma
COPY server/prisma.config.ts ./
RUN npm ci
COPY server/src ./src
COPY --from=frontend /app/dist /app/dist
ENV NODE_ENV=production PORT=3001 DIR_UNGGAHAN=/data/unggahan
EXPOSE 3001
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
