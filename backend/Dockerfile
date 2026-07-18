# ==================================================
# VAIC 2026 Backend - Dockerfile (PHASE 7 Release Candidate)
# Multi-stage: build NestJS (TypeScript) -> chạy bằng dist/ đã build
# ==================================================

FROM node:24-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---- Runtime image ----
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 3100
CMD ["node", "dist/main.js"]
