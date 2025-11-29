FROM node:18-alpine

WORKDIR /app

COPY server/package.json ./server/package.json

RUN cd server \
  && npm install --omit=dev \
  && npm cache clean --force

COPY . .

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.js"]
