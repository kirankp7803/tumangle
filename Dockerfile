# Stage 1: Build the frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for Vite)
RUN npm install

# Copy source code
COPY . .

# Build the Vite app for production
RUN npm run build

# Stage 2: Setup the production backend
FROM node:20-alpine
WORKDIR /app

# Install native build tools required by better-sqlite3 in alpine
RUN apk add --no-cache python3 make g++ sqlite

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm install --omit=dev

# Copy the backend server file
COPY server.js .

# Copy the built frontend from Stage 1
COPY --from=frontend-builder /app/dist ./dist

# Create a volume for the SQLite database so data persists across container restarts
VOLUME ["/app/data"]

# Expose the application port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
