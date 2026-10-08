# ==========================================
# Stage 1: Build Frontend (Vite + React 19 + Tailwind)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

# Copy source and build static artifacts
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Python Runtime (FastAPI)
# ==========================================
FROM python:3.11-slim AS runner

# Optimize Python execution in containers
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080

WORKDIR /app

# Install minimal system tools
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend application
COPY backend/app ./app

# Copy compiled frontend from Stage 1 into /app/dist
COPY --from=frontend-builder /app/frontend/dist ./dist

# Instruct FastAPI where to find static frontend assets
ENV DIST_DIR=/app/dist

# Expose port (Cloud Run defaults to 8080)
EXPOSE 8080

# Run Uvicorn listening on the dynamically assigned Cloud Run PORT
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
