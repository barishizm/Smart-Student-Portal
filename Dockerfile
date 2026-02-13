FROM node:20-alpine

# Create app directory
WORKDIR /usr/src/app

# Native module build dependencies (e.g., better-sqlite3)
RUN apk add --no-cache python3 make g++

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Run the seed script and then start the server
CMD ["sh", "-c", "node scripts/seedAdmin.js && npm start"]
