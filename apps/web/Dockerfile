# Serves the SPA build; run `pnpm nx build web` first.
# The digest pins the exact image, so a rebuild of the same commit gives the same nginx; the tag only
# says which version that is. Update both together, on purpose.
FROM nginxinc/nginx-unprivileged:1.31.6-alpine@sha256:26b0bf6fbf07297983cb341998d79c831508787de26627dd2a112321b9c3a4af
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY build/client /usr/share/nginx/html
