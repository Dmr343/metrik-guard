FROM node:22-alpine

LABEL org.opencontainers.image.source=https://github.com/Dmr343/metrik-guard
LABEL org.opencontainers.image.description="Metrik Guard — sitio web de seguridad empresarial"
LABEL org.opencontainers.image.licenses=MIT

WORKDIR /app

# Instalar dependencias primero (aprovecha la caché de Docker)
COPY package.json .
RUN npm install --omit=dev

# Copiar el servidor
COPY server.js .

# Copiar todos los archivos estáticos a /app/public
RUN mkdir -p public
COPY *.html         public/
COPY i18n.js        public/
COPY *.svg          public/
COPY *.jpeg         public/

EXPOSE 3000

CMD ["node", "server.js"]
