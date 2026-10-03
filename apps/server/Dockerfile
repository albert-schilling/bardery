# Builds the api image from source. The build context is the repository root, for the lockfile:
#   docker build --file apps/server/Dockerfile --build-arg VERSION=<git sha> .
# The digest pins the exact image, so a rebuild of the same commit gives the same Node; the tag only
# says which version that is. Update both together, on purpose.
FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS base
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# The pnpm version that `packageManager` in package.json pins; Node no longer ships Corepack.
RUN npm install --global "$(node --print 'require("./package.json").packageManager')"
COPY apps/server/package.json apps/server/

FROM base AS build
# No install scripts: the root's `prepare` installs git hooks, and the server's dependencies need none.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @bardery/server
COPY tsconfig.base.json ./
COPY apps/server/ apps/server/
RUN pnpm --filter @bardery/server build

FROM base AS prod-deps
RUN pnpm install --frozen-lockfile --ignore-scripts --prod --filter @bardery/server

FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80
# No default: an image built without it fails at startup instead of reporting a wrong version.
ARG VERSION
ENV NODE_ENV=production VERSION=${VERSION}
# pnpm links each package from the root node_modules, so both keep their place in the tree.
WORKDIR /app/apps/server
COPY --from=prod-deps /repo/node_modules /app/node_modules
COPY --from=prod-deps /repo/apps/server/node_modules node_modules
COPY --from=build /repo/apps/server/dist dist
# The `node` user comes with the base image.
USER node
EXPOSE 3000
CMD ["node", "dist/main.mjs"]
