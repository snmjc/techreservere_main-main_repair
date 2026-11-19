
# TechReserve

## Run the development stack with Docker

Prerequisites: Docker Desktop with Docker Compose.

From the repository root, create the local environment file and start the
services:

```powershell
Copy-Item .env.dev.example .env.dev
docker compose --env-file .env.dev up --build -d
```

The stack includes the Vue frontend, Symfony backend, analytics service,
PostgreSQL, and pgAdmin. Open:

- Frontend: http://localhost:5173
- Backend: http://localhost:8000
- pgAdmin: http://localhost:5050

Set your development Clerk credentials in `.env.dev` if you need to test
authentication. The local environment file is ignored by Git.

To inspect the services and logs or stop the stack:

```powershell
docker compose --env-file .env.dev ps
docker compose --env-file .env.dev logs -f
docker compose --env-file .env.dev down
```

The database is stored in a named Docker volume and is preserved by `down`.
To remove the stack and its database data, use `docker compose --env-file
.env.dev down --volumes`.
