# WebSocket server container. Runs from the full source tree via tsx,
# unlike the Next.js app which uses the standalone production build.
FROM node:22-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS ws
COPY package*.json ./
RUN npm ci

COPY . .
RUN chown -R node:node /app
ENV NODE_ENV=production

USER node

EXPOSE 3001

CMD ["npm", "run", "ws:start"]
