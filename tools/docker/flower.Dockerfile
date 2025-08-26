FROM python:3.11-slim
WORKDIR /app
RUN pip install --no-cache-dir flower==2.0.1 redis>=5.0
