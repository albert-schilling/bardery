# Serves the SPA build; run `pnpm nx build web` first.
FROM nginxinc/nginx-unprivileged:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY build/client /usr/share/nginx/html
