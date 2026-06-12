# Build runs on Coolify (push-to-deploy). The site itself is public, but the
# build needs the private data repo — snapshots, normalized dataset and the
# transcript cache. Pass a read-only token for it as build arg DATA_REPO_TOKEN.
#
# Note: the data repo moves independently of this one. Deploys triggered for
# data refreshes must not reuse the cached clone layer — keep "Disable build
# cache" on in Coolify, or deploy with ?force=true.
FROM node:22-alpine AS build
ARG DATA_REPO_TOKEN
RUN apk add --no-cache git
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN git clone --depth 1 \
  "https://x-access-token:${DATA_REPO_TOKEN}@github.com/elkraneo/dunfey-hotel-data-private.git" data
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
