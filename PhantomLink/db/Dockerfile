# Use the official PostgreSQL 13 image
FROM postgres:13

# Copy custom SQL initialization script (if provided)
COPY init.sql /docker-entrypoint-initdb.d/

# No need to set environment variables here; they will be passed via docker-compose.yml
