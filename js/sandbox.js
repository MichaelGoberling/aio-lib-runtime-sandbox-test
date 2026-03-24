/*
 * Copy .env.example to .env and fill in your credentials, then run:
 *   node sandbox.js
 *
 * Env vars can also be set inline:
 *   AIO_RUNTIME_APIHOST=https://... AIO_RUNTIME_NAMESPACE=my-ns AIO_RUNTIME_API_KEY=uuid:key node sandbox.js
 *
 * After setup, an interactive prompt lets you run commands on the sandbox.
 * Type "exit" or "quit" to destroy the sandbox and exit.
 */

require('dotenv').config()
const { init } = require('@adobe/aio-lib-runtime')
const readline = require('readline')

function prompt (rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

async function main () {
  const runtime = await init({
    apihost: process.env.AIO_RUNTIME_APIHOST || 'http://localhost:8080',
    namespace: process.env.AIO_RUNTIME_NAMESPACE || 'namespace',
    api_key: process.env.AIO_RUNTIME_API_KEY || 'auth'
  })

  const sandbox = await runtime.compute.sandbox.create({
    region: 'us-east-1',
    name: 'my-sandbox',
    size: 'MEDIUM',
    type: 'cpu:nodejs',
    workspace: 'workspace',
    maxLifetime: 3600,
    envs: {
      API_KEY: 'your-api-key'
    }
  })
  console.log('created:', sandbox.id)

  const status = await runtime.compute.sandbox.getStatus(sandbox.id)
  console.log('status:', status)

  const { stdout, exitCode } = await sandbox.exec('node --version', { timeout: 10000 })
  console.log('node version:', stdout.trim(), '| exit:', exitCode)

  await sandbox.writeFile('hello.js', `console.log('hello from sandbox')\n`)
  const { stdout: out } = await sandbox.exec('node hello.js', { timeout: 10000 })
  console.log(out.trim())

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  console.log('\nSandbox ready. Type a command to execute, or "exit"/"quit" to destroy and exit.\n')

  while (true) {
    const cmd = await prompt(rl, '> ')
    if (cmd.trim() === 'exit' || cmd.trim() === 'quit') {
      rl.close()
      break
    }
    if (!cmd.trim()) continue
    try {
      const result = await sandbox.exec(cmd, { timeout: 30000 })
      if (result.stdout) process.stdout.write(result.stdout)
      if (result.stderr) process.stderr.write(result.stderr)
      console.log(`[exit: ${result.exitCode}]`)
    } catch (err) {
      console.error('exec error:', err.message)
    }
  }

  await sandbox.destroy()
  console.log('destroyed')
}

main().catch(err => { console.error(err); process.exit(1) })
