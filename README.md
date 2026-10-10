# Doc Service

An AI-powered document processing application that lets users upload documents, track processing status, and review AI-generated analysis through a web interface.

Doc Service combines a React-based frontend, a FastAPI backend, PostgreSQL persistence, and Google's Gemini API in a containerized application.

## Features

- **Authentication:** User registration and JWT-based login.
- **Document uploads:** Upload PDF, DOCX, and TXT files up to 10 MB.
- **Text extraction:** Extract readable text from supported documents.
- **AI analysis:** Analyze extracted document content using the Gemini API.
- **Background processing:** Process documents asynchronously and track their status.
- **Document management:** List documents, view results, and delete documents.
- **User isolation:** Restrict document access to the authenticated owner.
- **Error handling:** Track processing failures and expose document status.
- **Containerization:** Run the frontend, backend, and database using Docker Compose.
- **Automated checks:** Backend tests, code quality checks, and CI through GitHub Actions.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Data fetching | TanStack Query |
| Backend | Python, FastAPI |
| Database | PostgreSQL |
| ORM and migrations | SQLAlchemy, Alembic |
| Authentication | JWT |
| AI | Google Gemini API |
| Infrastructure | Docker, Docker Compose |
| Quality and CI | Pytest, Ruff, GitHub Actions |

## Architecture

The application follows a straightforward client-server architecture.

1. The frontend sends authenticated requests to the FastAPI backend.
2. The backend validates requests and enforces document ownership.
3. Document metadata, extracted text, processing status, and analysis are stored in PostgreSQL.
4. Uploaded content is processed in a background task.
5. The Gemini API analyzes the extracted text.
6. The frontend retrieves the processing status and displays the results.

The application uses a single backend service and a relational database rather than a microservices architecture.

## Getting Started

### Prerequisites

Install the following:

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 1. Clone the repository

```bash
git clone https://github.com/Mugheerik/doc-service.git
cd doc-service
```

### 2. Configure environment variables

Create a local `.env` file from the example:

**Windows PowerShell**

```powershell
Copy-Item .env.example .env
```

Update `.env` with your local configuration and Gemini API key.

```dotenv
APPLICATION_ENV=development
LOG_LEVEL=INFO

DATABASE_URL=postgresql+psycopg://doc_service:doc_service@localhost:5432/doc_service

JWT_SECRET_KEY=replace-with-a-unique-secret-of-at-least-32-characters
AI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-3.5-flash-lite

FRONTEND_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:8000

POSTGRES_DB=doc_service
POSTGRES_USER=doc_service
POSTGRES_PASSWORD=doc_service
```

Generate a unique JWT secret before running the application locally. Keep your actual `.env` file private and never commit API keys or secrets.

### 3. Start the application

Build and start the containers:

```bash
docker compose up --build
```

Ensure the database migrations have been applied before using the application. If migrations are not applied automatically during startup, run the project's Alembic upgrade command inside the backend container.

### 4. Open the application

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Interactive API documentation | http://localhost:8000/docs |
| Backend health check | http://localhost:8000/health |
| Database readiness check | http://localhost:8000/health/ready |

Register an account, sign in, upload a supported document, and follow its processing status to review the extracted text and AI analysis.

## Supported Documents

| Format | Extension | Purpose |
|---|---|---|
| PDF | `.pdf` | Extract text from PDF pages |
| Word document | `.docx` | Extract paragraph text |
| Plain text | `.txt` | Read UTF-8 text |

**Maximum upload size:** 10 MB per document.

Scanned PDFs without an embedded text layer may require OCR, which is outside the current scope.

## Configuration

| Variable | Purpose |
|---|---|
| `APPLICATION_ENV` | Application environment |
| `LOG_LEVEL` | Logging verbosity |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET_KEY` | Secret used for authentication tokens |
| `AI_API_KEY` | Gemini API key |
| `GEMINI_MODEL` | Gemini model used for analysis |
| `FRONTEND_ORIGIN` | Allowed frontend origin for CORS |
| `NEXT_PUBLIC_API_URL` | Backend API URL used by the frontend |
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | PostgreSQL username |
| `POSTGRES_PASSWORD` | PostgreSQL password |

Use `.env.example` as the configuration reference. Never put real credentials in the repository.

## Development and Quality Checks

The backend uses Pytest for automated tests and Ruff for linting and formatting.

Run backend checks from the `backend` directory using the project's configured Python environment:

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
```

Build and start the complete application with Docker Compose:

```bash
docker compose up --build
```

Stop the services with:

```bash
docker compose down
```

To remove the local database volume and its persisted data as well, use `docker compose down -v`. **This permanently deletes the local database data**, so do not run it unless you intend to reset the database.

## Current Scope and Limitations

- Designed for local development and demonstration.
- Requires a valid Gemini API key and available model quota.
- Background processing uses the application process; it is not a separate durable job queue.
- Original uploaded files are held in memory during processing rather than persisted to object storage. Document records and processing results are stored in PostgreSQL.
- OCR, cloud deployment, distributed workers, and cloud monitoring are not included.

## License

See the [LICENSE](LICENSE) file for licensing terms.
