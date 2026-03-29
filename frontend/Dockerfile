FROM node:20-alpine

WORKDIR /app

# Add non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY package*.json ./
RUN npm ci --only=production

COPY . .

RUN npm run build && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 5173

CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "5173"]
