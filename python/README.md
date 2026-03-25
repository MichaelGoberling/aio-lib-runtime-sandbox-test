# python

Python example using `aio_runtime` to create, use, and destroy a compute sandbox.

## Setup

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` with your Adobe I/O Runtime credentials.

## Run

```bash
python sandbox.py
```

Env vars can also be set inline instead of using a `.env` file:

```bash
AIO_RUNTIME_APIHOST=https://... \
AIO_RUNTIME_NAMESPACE=my-ns \
AIO_RUNTIME_AUTH=uuid:key \
python sandbox.py
```

> Note: May need to use python3 if on MacOS
