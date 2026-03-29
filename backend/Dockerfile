FROM python:3.11-slim

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Add non-root user
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup

COPY requirements.txt ./
RUN pip install --no-cache-dir --user -r requirements.txt

COPY . .

# Fix permissions
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

CMD ["python", "main.py"]
