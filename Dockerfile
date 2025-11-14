FROM python:3.11-alpine
RUN apk add --no-cache \
	websocat \
	nginx

WORKDIR /app
COPY . /app
COPY nginx.conf /etc/nginx/http.d/cards.conf
RUN rm -f /etc/nginx/http.d/default.conf
RUN chmod +x /app/start /app/serve || true
RUN mkdir -p /run/nginx

EXPOSE 80

CMD ["/app/start"]
