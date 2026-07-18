# ==================================================
# VAIC 2026 Frontend - Dockerfile (PHASE 7 Release Candidate)
# Multi-stage: build Next.js -> chạy bằng `next start`
# ==================================================

FROM node:24-alpine AS builder
WORKDIR /app

# NEXT_PUBLIC_* được inline vào bundle lúc build -> phải truyền qua build arg
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3100/api/v1
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

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

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3001
CMD ["npm", "start"]
