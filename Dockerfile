FROM node:22.23.3-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY index.html vite.config.js .nvmrc Makefile ./
COPY src ./src

RUN npm run build

EXPOSE 4173
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0"]
