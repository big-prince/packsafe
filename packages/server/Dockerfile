FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json files for workspaces
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/server/package*.json ./packages/server/

# Copy source code
COPY packages/shared ./packages/shared/
COPY packages/server ./packages/server/

# Install dependencies and build
RUN npm install
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/server

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy built files
COPY --from=build /app/package*.json ./
COPY --from=build /app/packages/shared/package*.json ./packages/shared/
COPY --from=build /app/packages/server/package*.json ./packages/server/
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/server/dist ./packages/server/dist

# Install production dependencies only
ENV NODE_ENV=production
RUN npm install --omit=dev

# Create logs directory
RUN mkdir -p logs

# Expose port
EXPOSE 3001

# Start the server
CMD ["node", "packages/server/dist/index.js"]
