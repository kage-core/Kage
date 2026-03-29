---
category: "repo_context"
tags: ["auth", "backend", "tenant", "headers"]
source: "Manual"
date: "2026-03-29"
---

# `x-tenant-id` Header Requirement

When calling `/src/api/login` (or any API endpoint that interacts with User data), the backend rigidly requires the `x-tenant-id` header to be present.

## The Gotcha:
Failure to provide this header results in a generic `500 Internal Server Error` instead of a standard `400 Bad Request` or `401 Unauthorized`. 

If you see a `500` error during fetch, check if you passed the tenant ID before trying to debug the backend server container.
