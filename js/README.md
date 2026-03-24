# js

Node.js example using `@adobe/aio-lib-runtime` to create, use, and destroy a compute sandbox.

## Setup

```bash
npm install
```

## Run

```bash
node sandbox.js
```

Override defaults via env vars:

```bash
AIO_RUNTIME_APIHOST=https://... \
AIO_RUNTIME_NAMESPACE=my-ns \
AIO_RUNTIME_API_KEY=uuid:key \
node sandbox.js
```
