FROM node:20-alpine
WORKDIR /app
COPY package.json server.js ./
ENV PORT=3000
EXPOSE 3000
USER node
HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "server.js"]
