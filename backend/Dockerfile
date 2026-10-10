FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY pyproject.toml uv.lock README.md ./
COPY alembic.ini ./
COPY src ./src
COPY migrations ./migrations

RUN pip install --no-cache-dir uv \
    && uv sync --locked --no-dev

RUN mkdir -p /app/storage/documents

EXPOSE 8000

CMD ["uv", "run", "--no-dev", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]