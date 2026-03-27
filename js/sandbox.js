/*
 * Copy .env.example to .env and fill in your credentials, then run:
 *   node sandbox.js
 *
 * Env vars can also be set inline:
 *   AIO_RUNTIME_APIHOST=https://... AIO_RUNTIME_NAMESPACE=my-ns AIO_RUNTIME_AUTH=uuid:key node sandbox.js
 *
 * Includes a simple network policy that only allows egress to httpbin.org:443.
 * See sandbox-network-policy.js for more detailed policy examples.
 *
 * After setup, an interactive prompt lets you run commands on the sandbox.
 * Type "exit" or "quit" to destroy the sandbox and exit.
 */

require('dotenv').config()
const { init } = require('@adobe/aio-lib-runtime')
const readline = require('node:readline')

function prompt (rl, question) {
  return new Promise(resolve => rl.question(question, resolve))
}

async function main () {
  const runtime = await init({
    apihost: process.env.AIO_RUNTIME_APIHOST || 'http://localhost:8080',
    namespace: process.env.AIO_RUNTIME_NAMESPACE || 'namespace',
    api_key: process.env.AIO_RUNTIME_AUTH || 'auth'
  })

  const sandbox = await runtime.compute.sandbox.create({
    name: 'my-sandbox',
    type: 'cpu:nodejs',
    workspace: 'workspace',
    maxLifetime: 3600,
    envs: {
      API_KEY: 'your-api-key'
    },
    policy: {
      network: {
        egress: [
          { host: 'httpbin.org', port: 443 }
        ]
      }
    }
  })
  console.log('created:', sandbox.id)
  console.log('network policy: egress allowed to httpbin.org:443')

  const status = await runtime.compute.sandbox.getStatus(sandbox.id)
  console.log('status:', status)

  const { stdout, exitCode } = await sandbox.exec('node --version', { timeout: 10000 })
  console.log('node version:', stdout.trim(), '| exit:', exitCode)

  await sandbox.writeFile('hello.js', `console.log('hello from sandbox')\n`)
  const { stdout: out } = await sandbox.exec('node hello.js', { timeout: 10000 })
  console.log(out.trim())

  // Stdin to command at start
  await sandbox.writeFile('upper.js', `
    process.stdin.setEncoding('utf8');
    let buf = '';
    process.stdin.on('data', c => buf += c);
    process.stdin.on('end', () => console.log(buf.toUpperCase()));
  `)
  const { stdout: upper } = await sandbox.exec('node upper.js', {
    timeout: 10000,
    stdin: 'hello from stdin\n'
  })
  console.log('exec stdin shortcut:', upper.trim())

  // Stdin for running command
  const catPromise = sandbox.exec('cat -n', { timeout: 10000 })
  const catExecId = catPromise.execId
  sandbox.writeStdin(catExecId, 'line one\n')
  sandbox.writeStdin(catExecId, 'line two\n')
  sandbox.closeStdin(catExecId)
  const catResult = await catPromise
  console.log('manual writeStdin/closeStdin:')
  console.log(catResult.stdout.trim())
  console.log(`[exit: ${catResult.exitCode}]`)

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
