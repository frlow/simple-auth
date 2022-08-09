FROM node:alpine as build
ADD * /app/
WORKDIR /app
RUN yarn install
RUN yarn build

FROM alpine:latest
RUN apk add libstdc++ libgcc
COPY --from=build /app/server /server
EXPOSE 4321
CMD /server