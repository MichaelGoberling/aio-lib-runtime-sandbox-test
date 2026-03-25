# js

Node.js example using `@adobe/aio-lib-runtime` to create, use, and destroy a compute sandbox.

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env` with your Adobe I/O Runtime credentials.

## Run

```bash
node sandbox.js
```

### Network Policy Example

Demonstrates the three network-policy modes (specific egress rules, allow-all, default-deny):

```bash
node sandbox-network-policy.js
```

### Env Vars

Env vars can also be set inline instead of using a `.env` file:

```bash
AIO_RUNTIME_APIHOST=https://... \
AIO_RUNTIME_NAMESPACE=my-ns \
AIO_RUNTIME_AUTH=uuid:key \
node sandbox.js
```
