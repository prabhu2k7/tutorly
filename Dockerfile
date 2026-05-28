# Multi-stage Dockerfile for Tutorly.
# Stage 1: build the Vite/React frontend.
# Stage 2: assemble the Python runtime + the prebuilt frontend, served by FastAPI.
#
# Works for:
#   - Hugging Face Spaces (PORT=7860)
#   - Render / Fly.io / Railway / any PaaS that respects $PORT
#   - Local self-host:  docker build -t tutorly . && docker run -p 7860:7860 tutorly

# ---------- Stage 1: frontend build ----------
FROM node:20-slim AS frontend-build

WORKDIR /frontend

# Install deps with the exact versions from the lockfile.
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install --no-audit --no-fund

# Build the static bundle. Output: /frontend/dist
COPY frontend/ ./
RUN npm run build


# ---------- Stage 2: Python runtime ----------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System deps: build tooling for wheels that need compiling, libgomp (some
# scientific libs link against it), curl for the healthcheck.
RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        libgomp1 \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first so source-only changes don't invalidate the layer.
COPY backend/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt

# Flatten backend/ into /app so `uvicorn main:app` works directly.
COPY backend/ ./

# Pull in the prebuilt frontend bundle from stage 1.
COPY --from=frontend-build /frontend/dist ./frontend/dist

# Writable runtime dirs. On HF Spaces these are EPHEMERAL (wiped on container
# restart). Fine for a demo; durable persistence needs Render Disk / Fly Volume.
RUN mkdir -p /app/uploads /app/chroma_db

# Non-root user — Hugging Face Spaces expects UID 1000.
RUN useradd -m -u 1000 user && \
    chown -R user:user /app
USER user

# Tell the FastAPI app where the built frontend lives.
ENV FRONTEND_DIST=/app/frontend/dist
# HF Spaces uses 7860 by default; other PaaS pass PORT via env.
ENV PORT=7860
EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

# Shell form so $PORT expands at runtime.
CMD uvicorn main:app --host 0.0.0.0 --port "$PORT" --proxy-headers --forwarded-allow-ips="*"
