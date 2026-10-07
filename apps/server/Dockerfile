# Builds the api image from source. The build context is the repository root, for the lockfile:
#   docker build --file apps/server/Dockerfile --build-arg VERSION=<git sha> .
# The digest pins the exact image, so a rebuild of the same commit gives the same Node; the tag only
# says which version that is. Update both together, on purpose.
FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80 AS build
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# The pnpm version that `packageManager` in package.json pins; Node no longer ships Corepack.
RUN npm install --global "$(node --print 'require("./package.json").packageManager')"
# The manifest comes before the source, so a change to the source alone reuses the cached install.
COPY apps/server/package.json apps/server/
COPY packages/shared/schemas/package.json packages/shared/schemas/
# No install scripts: the root's `prepare` installs git hooks, and the server's dependencies need none.
# The `...` also installs the workspace packages the server depends on; without it their own dependencies
# are missing at build time and end up external to the bundle.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter "@bardery/server..."
COPY tsconfig.base.json ./
COPY apps/server/ apps/server/
COPY packages/shared/schemas/ packages/shared/schemas/
RUN pnpm --filter @bardery/server build

FROM node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80
# The app runs on node alone; npm would only add code that a scanner flags and an attacker could use.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
# No default: an image built without it fails at startup instead of reporting a wrong version.
ARG VERSION
ENV NODE_ENV=production VERSION=${VERSION}
WORKDIR /app
# The build bundles the dependencies, so the image needs no node_modules. migrate.mjs is the
# migrations job's command; the build puts the migrations it reads beside it, in db/.
COPY --from=build /repo/apps/server/dist/main.mjs /repo/apps/server/dist/migrate.mjs dist/
COPY --from=build /repo/apps/server/dist/db/ dist/db/
# The `node` user comes with the base image.
USER node
EXPOSE 3000
CMD ["node", "dist/main.mjs"]
