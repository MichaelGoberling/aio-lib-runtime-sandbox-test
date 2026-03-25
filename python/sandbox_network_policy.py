"""
Demonstrates sandbox network-policy modes: specific egress rules, allow-all,
and default-deny.

Setup is the same as sandbox.py — copy .env.example to .env, fill in your
credentials, then run:
    python sandbox_network_policy.py

NOTE: "blocked" assertions depend on Cilium enforcement being active on the
cluster. In local/mock environments, blocked requests may still succeed.
"""

import asyncio
import os

from dotenv import load_dotenv

load_dotenv()

from aio_runtime import init

CURL_TIMEOUT = 15_000
CURL_STATUS = 'curl -s -o /dev/null -w "%{http_code}"'
CURL_STATUS_WITH_TIMEOUT = 'curl -s --connect-timeout 5 -o /dev/null -w "%{http_code}"'


# ---------------------------------------------------------------------------
# Example 1 — Specific egress rules
#   Only httpbin.org:443 and api.github.com:443 are allowed.
#   Everything else is blocked.
# ---------------------------------------------------------------------------


async def test_specific_egress(compute) -> None:
    print("\n--- Specific egress rules ---")

    sandbox = await compute.sandbox.create(
        name="policy-specific",
        workspace="policy-test",
        max_lifetime=300,
        policy={
            "network": {
                "egress": [
                    {"host": "httpbin.org", "port": 443},
                    {"host": "api.github.com", "port": 443},
                ]
            }
        },
    )
    print(f"Created sandbox: {sandbox.id}")

    try:
        allowed = await sandbox.exec(
            f'{CURL_STATUS} https://httpbin.org/get',
            timeout=CURL_TIMEOUT,
        )
        print(f"  httpbin.org   (allowed) -> HTTP {allowed.stdout.strip()}")

        blocked = await sandbox.exec(
            f'{CURL_STATUS_WITH_TIMEOUT} https://example.com || echo "BLOCKED"',
            timeout=CURL_TIMEOUT,
        )
        print(f"  example.com   (blocked) -> {blocked.stdout.strip()}")
    finally:
        await sandbox.destroy()
        print("Sandbox destroyed.")


# ---------------------------------------------------------------------------
# Example 2 — Allow-all egress
#   All outbound traffic is permitted (useful for dev/debug).
# ---------------------------------------------------------------------------


async def test_allow_all(compute) -> None:
    print("\n--- Allow-all egress ---")

    sandbox = await compute.sandbox.create(
        name="policy-allow-all",
        workspace="policy-test",
        max_lifetime=300,
        policy={"network": {"egress": "allow-all"}},
    )
    print(f"Created sandbox: {sandbox.id}")

    try:
        result = await sandbox.exec(
            f'{CURL_STATUS} https://example.com',
            timeout=CURL_TIMEOUT,
        )
        print(f"  example.com (allow-all) -> HTTP {result.stdout.strip()}")
    finally:
        await sandbox.destroy()
        print("Sandbox destroyed.")


# ---------------------------------------------------------------------------
# Example 3 — Default-deny (no policy)
#   No policy is provided, so the default-deny baseline applies.
#   Only DNS and NATS are reachable.
# ---------------------------------------------------------------------------


async def test_default_deny(compute) -> None:
    print("\n--- Default-deny (no policy) ---")

    sandbox = await compute.sandbox.create(
        name="policy-default-deny",
        workspace="policy-test",
        max_lifetime=300,
    )
    print(f"Created sandbox: {sandbox.id}")

    try:
        result = await sandbox.exec(
            'curl -s --connect-timeout 5 https://httpbin.org/get || echo "BLOCKED"',
            timeout=CURL_TIMEOUT,
        )
        print(f"  httpbin.org (deny-all)  -> {result.stdout.strip()}")
    finally:
        await sandbox.destroy()
        print("Sandbox destroyed.")


# ---------------------------------------------------------------------------


async def main() -> None:
    runtime = await init(
        api_host=os.environ.get("AIO_RUNTIME_APIHOST", "http://localhost:8080"),
        namespace=os.environ.get("AIO_RUNTIME_NAMESPACE", "namespace"),
        api_key=os.environ.get("AIO_RUNTIME_AUTH", "auth"),
    )

    await test_specific_egress(runtime.compute)
    await test_allow_all(runtime.compute)
    await test_default_deny(runtime.compute)


if __name__ == "__main__":
    asyncio.run(main())
