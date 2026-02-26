# Multi-stage build for a lightweight image
FROM node:20-alpine AS node-stage

WORKDIR /app

# Install plantuml-encoder
RUN npm install plantuml-encoder express body-parser

# Copy encoding service
COPY encode-service.js .

EXPOSE 3000

CMD ["node", "encode-service.js"]
