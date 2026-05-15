# mTLS Inter-Service Security Documentation

This document outlines the zero-trust mutual TLS (mTLS) configuration for the Shuttle platform. mTLS ensures that only authorized services with valid, signed certificates can communicate with the backend.

## 1. Overview

In production (`NODE_ENV=production`), the backend enforces:
- **HTTPS**: All traffic is encrypted.
- **Client Certificate Verification**: The server requires a client certificate signed by the internal Root CA.
- **Peer Authentication**: Unrecognized or self-signed certificates (not signed by the Root CA) are rejected with a 403 Forbidden.

## 2. Certificate Infrastructure

The certificates are stored in `packages/backend/certs/` (ignored by Git for security):
- `ca.crt` / `ca.key`: The Root Certificate Authority (Keep the key secret!).
- `server.crt` / `server.key`: Used by the backend to identify itself to clients.
- `client.crt` / `client.key`: Used by other services (or test scripts) to identify themselves to the backend.

## 3. Generating Certificates

To generate or refresh the certificate bundle, run:

```bash
cd packages/backend
npx ts-node certs/scripts/generate-mtls.ts
```

This script uses `node-forge` to generate the entire chain without requiring a system installation of OpenSSL.

## 4. Client Configuration (Example)

When making requests to the backend from another Node.js service, use the generated client certificates:

```typescript
import https from 'https';
import fs from 'fs';

const agent = new https.Agent({
  cert: fs.readFileSync('./certs/client.crt'),
  key: fs.readFileSync('./certs/client.key'),
  ca: fs.readFileSync('./certs/ca.crt'), // Trust our private CA
});

// Example fetch call
fetch('https://localhost:3001/api/health', { agent });
```

## 5. Certificate Rotation Procedure

1. **Root CA**: Valid for 10 years. Rotation requires updating all services with the new `ca.crt`.
2. **Entity Certificates**: Valid for 2 years. 
   - Run the generation script to create new `.crt` and `.key` files.
   - Restart the backend to load new server certs.
   - Distribute new client certs to consuming services.

## 6. Development vs. Production

- **Development**: The server runs on standard **HTTP** (`http://localhost:3001`) for ease of use with browsers and debugging tools.
- **Production**: Set `NODE_ENV=production`. Ensure the `certs/` directory is populated in the deployment container (e.g., via Kubernetes Secrets or a CI/CD vault).
