# ---------- Builder ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci --registry=https://registry.npmjs.org/

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# Build TypeScript -> dist/
RUN npm run build 


# ---------- Runner ----------
FROM node:22-alpine AS runner

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

RUN apk add --no-cache curl

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "dist/index.js"]