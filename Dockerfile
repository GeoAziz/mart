# Multi-stage build for Next.js application
FROM node:18-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat

FROM base AS builder
COPY package*.json ./
RUN npm ci

COPY . .

# NEXT_PUBLIC_* vars are inlined at build time; supply them via --build-arg (docker-compose build.args).
# Server-side Firebase vars are also consumed at build time because `next build`
# executes route modules that import firebase-admin at module scope. Defaults use
# emulator mode so the build succeeds without a service account / real credentials.
ARG NEXT_PUBLIC_FIREBASE_API_KEY=
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID=
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
ARG NEXT_PUBLIC_FIREBASE_EMULATOR=
ARG NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=
ARG NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST=
ARG FIRESTORE_EMULATOR_HOST=
ARG FIREBASE_AUTH_EMULATOR_HOST=
ARG FIREBASE_PROJECT_ID=
ARG FIREBASE_CLIENT_EMAIL=
ARG FIREBASE_PRIVATE_KEY=
ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_EMULATOR=$NEXT_PUBLIC_FIREBASE_EMULATOR \
    NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST=$NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_HOST \
    NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST=$NEXT_PUBLIC_FIREBASE_FIRESTORE_EMULATOR_HOST \
    FIRESTORE_EMULATOR_HOST=$FIRESTORE_EMULATOR_HOST \
    FIREBASE_AUTH_EMULATOR_HOST=$FIREBASE_AUTH_EMULATOR_HOST \
    FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID \
    FIREBASE_CLIENT_EMAIL=$FIREBASE_CLIENT_EMAIL \
    FIREBASE_PRIVATE_KEY=$FIREBASE_PRIVATE_KEY

# Type errors are intentionally non-blocking in this repo (tsconfig strict:false +
# next.config ignoreBuildErrors). Gating the build on `tsc` would fail docker builds.
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["node", "server.js"]
