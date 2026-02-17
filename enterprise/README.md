# miniature-guacamole Enterprise Edition

This directory contains enterprise-only features for miniature-guacamole.

## Features (Coming Soon)

- **PostgreSQL Storage Adapter** - Persistent storage backend for production deployments
- **Multi-Tenant Isolation** - Row-level security and tenant separation
- **Data Export Connectors** - Snowflake, BigQuery, and other data warehouse integrations

## Structure

```
enterprise/
├── src/
│   ├── storage/        # PostgreSQL adapter implementation
│   ├── isolation/      # Multi-tenant isolation logic
│   └── connectors/     # Data export connectors
└── tests/
    └── unit/           # Enterprise-specific tests
```

## Installation

This directory is included in the enterprise distribution only and is excluded from OSS builds.

## License

PROPRIETARY - Not for distribution or use outside authorized deployments.
