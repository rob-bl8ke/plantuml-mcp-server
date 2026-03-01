FROM node:20-alpine

WORKDIR /app

# Used by docker-compose healthchecks
RUN apk add --no-cache wget

# Install runtime dependencies
COPY package.json ./
RUN npm install --omit=dev

# Copy MCP server source
COPY . .

EXPOSE 3002

CMD ["node", "index.js"]
