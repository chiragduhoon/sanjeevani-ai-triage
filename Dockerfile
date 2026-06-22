# ---- Stage 1: Build the React/Vite frontend ----
FROM node:20-slim AS frontend
WORKDIR /frontend

# Install deps first (better layer caching)
COPY frontend/package*.json ./
RUN npm install

# Build the frontend -> produces /frontend/dist
COPY frontend/ ./
RUN npm run build

# ---- Stage 2: Python backend that serves the built frontend ----
FROM python:3.11-slim AS backend
WORKDIR /app

# Install backend deps
COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source
COPY backend/ ./

# Copy the built frontend into backend/static (served by FastAPI StaticFiles)
COPY --from=frontend /frontend/dist ./static

# main.py reads PORT from env (Railway sets it) and runs uvicorn
CMD ["python", "main.py"]
