FROM node:18-alpine AS build

WORKDIR /app

COPY package.json ./

RUN npm install \
  && npm cache clean --force

COPY index.html vite.config.js ./
COPY src ./src

RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY server/package.json ./server/package.json

RUN cd server \
  && npm install --omit=dev \
  && npm cache clean --force

COPY server ./server
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV CLIENT_DIR=/app/dist
EXPOSE 3000

WORKDIR /app/server
CMD ["node", "server.js"]
