# Use a minimal and secure Python image
FROM python:3.11.6-alpine

# Install system dependencies for PostgreSQL and Python
RUN apk add --no-cache \
    libpq postgresql-dev gcc musl-dev python3-dev

# Set working directory
WORKDIR /app

# Copy only necessary files first (to leverage Docker caching)
COPY requirements.txt requirements.txt

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install NLTK and download vader_lexicon data
RUN pip install --no-cache-dir nltk \
    && python -m nltk.downloader -d /usr/local/share/nltk_data vader_lexicon

# Copy the rest of the application code
COPY . .

# Use environment variables instead of hardcoding settings
ENV PYTHONPATH="/app"

# Expose the API port
EXPOSE 5000

# Use Gunicorn with multiple workers for better performance
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "server:app"]
