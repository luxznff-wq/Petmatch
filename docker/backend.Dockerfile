# API de PetMatch
FROM node:22-alpine

WORKDIR /app

# Se copian primero los manifiestos para aprovechar la caché de capas.
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev --workspace backend --include-workspace-root

COPY backend ./backend
COPY database ./database

ENV NODE_ENV=production
EXPOSE 4000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "run", "start", "-w", "backend"]
