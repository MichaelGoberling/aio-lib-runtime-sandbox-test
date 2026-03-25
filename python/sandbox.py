"""
Create a compute sandbox, run some setup commands, then drop into an interactive
prompt where you can run arbitrary commands on the sandbox.

Usage:
    Copy .env.example to .env, fill in your credentials, then run:
        python sandbox.py

    Env vars can also be set inline:
        AIO_RUNTIME_APIHOST=https://... AIO_RUNTIME_NAMESPACE=my-ns AIO_RUNTIME_AUTH=uuid:key python sandbox.py

Type "exit" or "quit" at the prompt to destroy the sandbox and exit.
"""

import asyncio
import os
import sys

from dotenv import load_dotenv

load_dotenv()

from aio_runtime import init


async def read_input(loop: asyncio.AbstractEventLoop, prompt: str) -> str:
    return await loop.run_in_executor(None, lambda: input(prompt))


async def main() -> None:
    runtime = await init(
        api_host=os.environ.get("AIO_RUNTIME_APIHOST", "http://localhost:8080"),
        namespace=os.environ.get("AIO_RUNTIME_NAMESPACE", "namespace"),
        api_key=os.environ.get("AIO_RUNTIME_AUTH", "auth"),
    )

    sandbox = await runtime.compute.sandbox.create(
        name="my-sandbox",
        size="MEDIUM",
        type="cpu:nodejs",
        workspace="workspace",
        max_lifetime=3600,
        envs={"API_KEY": "your-api-key"},
    )
    print("sandbox ready:", sandbox.id)

    status = await runtime.compute.sandbox.get_status(sandbox.id)
    print("status:", status)

    print("executing command...")
    result = await sandbox.exec("ls -al", timeout=10_000)
    print("stdout:", result.stdout.strip())
    print("exit code:", result.exit_code)

    print("writing file via write_file...")
    script = "console.log('hello from sandbox script', process.version)\n"
    write_result = await sandbox.write_file("hello.js", script)
    print("write_file result:", write_result)

    print("running the script...")
    result2 = await sandbox.exec("node hello.js", timeout=10_000)
    print("stdout:", result2.stdout.strip())
    print("stderr:", result2.stderr.strip())
    print("exit code:", result2.exit_code)

    loop = asyncio.get_event_loop()
    print("\nSandbox ready. Type a command to execute, or 'exit'/'quit' to destroy and exit.\n")

    while True:
        try:
            cmd = await read_input(loop, "> ")
        except EOFError:
            break

        if cmd.strip() in ("exit", "quit"):
            break
        if not cmd.strip():
            continue

        try:
            res = await sandbox.exec(cmd, timeout=30_000)
            if res.stdout:
                sys.stdout.write(res.stdout)
            if res.stderr:
                sys.stderr.write(res.stderr)
            print(f"[exit: {res.exit_code}]")
        except Exception as exc:
            print(f"exec error: {exc}", file=sys.stderr)

    await sandbox.destroy()
    print("sandbox destroyed")


if __name__ == "__main__":
    asyncio.run(main())
