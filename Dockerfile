# Built by Coolify on push (GitHub App source). The private data repo arrives
# as the `data` submodule — its relative URL resolves through the same
# credentials Coolify cloned this repo with, so no extra tokens are needed.
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# data/normalized is derived output the data repo deliberately doesn't track —
# regenerate it from the raw snapshots before building.
RUN node etl/normalize.mjs && npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
