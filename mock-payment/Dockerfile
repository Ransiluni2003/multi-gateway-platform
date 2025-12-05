# Use official Node.js LTS image
FROM node:20.19.0-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm config set registry https://registry.npmjs.org/
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose port
EXPOSE 5000

# Start the service
CMD ["npm", "start"]
