# Docker Setup Guide for Amethyst Backend

This guide will help you run the entire microservices backend using Docker.

## Prerequisites

- Docker Desktop installed on your system
- Docker Compose (comes with Docker Desktop)
- All services should be stopped if running locally

## Quick Start

### 1. Stop All Running Services

First, stop any locally running services to free up the ports:

```bash
# Press Ctrl+C in each terminal where services are running
```

### 2. Build and Run with Docker Compose

From the root directory of the project, run:

```bash
# Build all services
docker-compose build

# Start all services
docker-compose up

# Or build and start in one command
docker-compose up --build

# To run in detached mode (background)
docker-compose up -d
```

### 3. Verify Services are Running

Check if all services are running:

```bash
docker-compose ps
```

You should see all 8 services running:

- API Gateway (http://localhost:3000)
- User Service (http://localhost:3001)
- Booking Service (http://localhost:3002)
- Provider Service (http://localhost:3003)
- Auth Service (http://localhost:3004)
- Service Catalog Service (http://localhost:3005)
- Review Service (http://localhost:3006)
- Customer Service (http://localhost:3007)

### 4. Test the Services

Test the API Gateway health endpoint:

```bash
curl http://localhost:3000/health
```

Test user service through API Gateway:

```bash
curl http://localhost:3000/api/users
```

## Common Docker Commands

### View Logs

```bash
# View logs for all services
docker-compose logs

# View logs for a specific service
docker-compose logs user-service

# Follow logs in real-time
docker-compose logs -f
```

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (careful - this deletes data)
docker-compose down -v
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart a specific service
docker-compose restart user-service
```

### Execute Commands in Containers

```bash
# Access a service's shell
docker-compose exec user-service sh

# Run Prisma migrations
docker-compose exec user-service npx prisma migrate dev
```

## Troubleshooting

### Port Already in Use

If you get "port already in use" errors:

1. Make sure all local services are stopped
2. Check what's using the port:

   ```bash
   # On Windows
   netstat -ano | findstr :3000

   # On Mac/Linux
   lsof -i :3000
   ```

### Database Connection Issues

The services use a shared SQLite database. If you have database issues:

1. Ensure the `dev.db` file exists in the root directory
2. Check volume mappings in docker-compose.yml
3. Verify DATABASE_URL environment variable is set correctly

### Service Can't Connect to Another Service

In Docker, services communicate using service names, not localhost:

- Use `http://user-service:3001` instead of `http://localhost:3001`
- The API Gateway is already configured correctly for this

## Development Workflow

### Making Code Changes

1. Make your code changes
2. Rebuild the affected service:
   ```bash
   docker-compose build user-service
   docker-compose up -d user-service
   ```

### Adding New Dependencies

1. Update package.json
2. Rebuild the service:
   ```bash
   docker-compose build --no-cache user-service
   docker-compose up -d user-service
   ```

## Production Considerations

For production deployment:

1. Update JWT_SECRET in docker-compose.yml
2. Use PostgreSQL instead of SQLite
3. Add proper volume management for data persistence
4. Implement proper logging and monitoring
5. Use Docker Swarm or Kubernetes for orchestration

## Environment Variables

Each service can be configured with environment variables in docker-compose.yml:

- `DATABASE_URL`: Database connection string
- `PORT`: Service port (should match EXPOSE in Dockerfile)
- `JWT_SECRET`: Secret key for JWT tokens (auth-service)
- `NODE_ENV`: Set to "production" for production builds

## Useful Tips

1. **View running containers**: `docker ps`
2. **Remove all stopped containers**: `docker container prune`
3. **Remove unused images**: `docker image prune`
4. **Check Docker disk usage**: `docker system df`
5. **Clean up everything**: `docker system prune -a` (careful!)

## Next Steps

1. Implement health checks in docker-compose.yml
2. Add container resource limits
3. Set up a reverse proxy (nginx) for production
4. Implement service discovery for dynamic scaling
5. Add monitoring with Prometheus/Grafana
