/*
 * Usage (env vars override hardcoded defaults):
 *   AIO_RUNTIME_APIHOST=https://... \
 *   AIO_RUNTIME_NAMESPACE=my-ns \
 *   AIO_RUNTIME_API_KEY=uuid:key \
 *   node sandbox.js
 */

const { init } = require('@adobe/aio-lib-runtime')

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

  await sandbox.destroy()
  console.log('destroyed')
}

main().catch(err => { console.error(err); process.exit(1) })
