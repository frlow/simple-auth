FROM node:alpine
ADD dist/server.js /server.js
EXPOSE 4321
CMD node /server.js