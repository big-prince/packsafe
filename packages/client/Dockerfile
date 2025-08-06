FROM node:18-alpine AS build

WORKDIR /app

# Copy package.json files for workspaces
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/client/package*.json ./packages/client/

# Copy source code
COPY packages/shared ./packages/shared/
COPY packages/client ./packages/client/

# Install dependencies and build
RUN npm install
RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=packages/client

# Production stage with Nginx
FROM nginx:alpine

# Copy the built app
COPY --from=build /app/packages/client/dist /usr/share/nginx/html

# Copy custom Nginx config
COPY packages/client/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
