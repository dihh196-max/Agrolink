-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "vector";

-- TimescaleDB (optional — comment out if not using)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;
