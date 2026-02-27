FROM node:20-alpine

WORKDIR /app

# Used by docker-compose healthchecks
RUN apk add --no-cache wget

# Install runtime dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy encoding service
COPY encode-service.js ./

EXPOSE 3000

CMD ["node", "encode-service.js"]
