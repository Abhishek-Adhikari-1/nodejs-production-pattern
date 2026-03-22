# ---------- Builder ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Build TypeScript -> dist/
RUN npm run build 


# ---------- Runner ----------
FROM node:22-alpine AS runner

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

RUN apk add --no-cache curl

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]