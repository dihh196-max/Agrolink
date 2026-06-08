FROM node:22-alpine
WORKDIR /app

# ── Install deps (cache this layer separately) ───────────────────────────────
COPY package.json package-lock.json ./
COPY packages/types/package.json      ./packages/types/
COPY packages/database/package.json   ./packages/database/
COPY apps/api/package.json            ./apps/api/

# Stubs so npm ci doesn't fail on missing workspace dirs
RUN mkdir -p apps/web apps/mobile && \
    printf '{"name":"@agrolink/web","private":true}' > apps/web/package.json && \
    printf '{"name":"@agrolink/mobile","private":true}' > apps/mobile/package.json

RUN npm ci --ignore-scripts

# ── Copy source ───────────────────────────────────────────────────────────────
COPY tsconfig.base.json ./
COPY packages/types      ./packages/types
COPY packages/database   ./packages/database
COPY apps/api            ./apps/api

# Compile @agrolink/database so its dist/index.js exists at runtime
RUN cd packages/database && npx tsc -p tsconfig.json

ENV NODE_ENV=production
EXPOSE 3001

CMD ["sh", "apps/api/start.sh"]
