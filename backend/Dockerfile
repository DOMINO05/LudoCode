# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Production Stage
FROM node:18-alpine

# Install additional compilers and tools for the playground
RUN apk add --no-cache \
    python3 \
    openjdk17-jdk \
    g++ \
    sqlite \
    bash

# Link python3 to python
RUN ln -sf python3 /usr/bin/python

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./

EXPOSE 3000

# Set secure default user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

CMD ["npm", "run", "start:prod"]
