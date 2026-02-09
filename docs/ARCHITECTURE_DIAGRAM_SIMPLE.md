# Architecture Diagram (Simple)

```mermaid
graph TD
  User[User] --> Web[Frontend (Next.js)]
  Web --> API[API Gateway (Express)]

  API --> Auth[Auth Service]
  API --> Payments[Payments Service]
  API --> Analytics[Analytics Service]
  API --> Notifications[Notifications Service]
  API --> Storage[Storage API]
  API --> Audit[Audit Logs API]

  Auth --> Mongo[(MongoDB)]
  Payments --> Mongo
  Analytics --> Mongo
  Notifications --> Redis[(Redis)]
  Storage --> Supabase[(Supabase Storage)]
  Audit --> Mongo

  API --> Tracing[OpenTelemetry]
  API --> Metrics[Prometheus]
```

Notes:
- The API gateway enforces auth, rate limiting, and security headers.
- Storage operations use signed URLs and audit logging.
- Audit logs are centralized in MongoDB for review.
