# ─────────────────────────────────────────
# Stage 1: Instala dependências
# ─────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

# ─────────────────────────────────────────
# Stage 2: Runtime leve (Sem Chromium)
# ─────────────────────────────────────────
FROM node:20-slim

WORKDIR /app

# Copia dependências do stage anterior e arquivos fonte
COPY --from=deps /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
