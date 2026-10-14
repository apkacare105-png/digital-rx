# ---- build the React app ----
FROM node:22-alpine AS client
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client ./
RUN npm run build

# ---- run the API + serve the built app ----
FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY server/package*.json ./server/
RUN cd server && npm install --omit=dev
COPY server ./server
COPY --from=client /app/client/dist ./client/dist
RUN mkdir -p /app/server/uploads && chown -R node:node /app
USER node
WORKDIR /app/server
EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD wget -qO- http://127.0.0.1:5000/api/health || exit 1
CMD ["node", "src/server.js"]
