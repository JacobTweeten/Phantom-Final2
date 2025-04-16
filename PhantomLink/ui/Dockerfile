# Use a smaller and stable Node.js image
FROM node:18-alpine AS build

# Set working directory
WORKDIR /app

# Copy package files first (to cache dependencies and speed up builds)
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy the rest of the source code
COPY . .

# Build the production version of the React app
RUN npm run build

# Use an optimized lightweight web server for serving static files
FROM nginx:alpine AS production

# Copy the built React app to Nginx's HTML directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose the port Nginx runs on
EXPOSE 80

# Start Nginx when the container runs
CMD ["nginx", "-g", "daemon off;"]
