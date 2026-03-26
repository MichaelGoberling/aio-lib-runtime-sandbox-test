/*
 * Demonstrates sandbox network-policy modes: specific egress rules, allow-all,
 * and default-deny.
 *
 * Setup is the same as sandbox.js — copy .env.example to .env and fill in your
 * credentials, then run:
 *   node sandbox-network-policy.js
 *
 * NOTE: "blocked" assertions depend on Cilium enforcement being active on the
 * cluster. In local/mock environments, blocked requests may still succeed.
 */

require('dotenv').config()
const { init } = require('@adobe/aio-lib-runtime')

const CURL_TIMEOUT = 15000
const CURL_STATUS = 'curl -s -o /dev/null -w "%{http_code}"'
const CURL_STATUS_WITH_TIMEOUT = 'curl -s --connect-timeout 5 -o /dev/null -w "%{http_code}"'

// ---------------------------------------------------------------------------
// Example 1 — Specific egress rules
//   Only httpbin.org:443 and api.github.com:443 are allowed.
//   Everything else is blocked.
// ---------------------------------------------------------------------------

async function testSpecificEgress (compute) {
  console.log('\n--- Specific egress rules ---')

  const sandbox = await compute.sandbox.create({
    name: 'policy-specific',
    type: 'cpu:nodejs',
    workspace: 'policy-test',
    maxLifetime: 300,
    policy: {
      network: {
        egress: [
          { host: 'httpbin.org', port: 443 },
          { host: 'api.github.com', port: 443 }
        ]
      }
    }
  })
  console.log(`Created sandbox: ${sandbox.id}`)

  try {
    const allowed = await sandbox.exec(
      `${CURL_STATUS} https://httpbin.org/get`,
      { timeout: CURL_TIMEOUT }
    )
    console.log(`  httpbin.org   (allowed) → HTTP ${allowed.stdout.trim()}`)

    const blocked = await sandbox.exec(
      `${CURL_STATUS_WITH_TIMEOUT} https://example.com || echo "BLOCKED"`,
      { timeout: CURL_TIMEOUT }
    )
    console.log(`  example.com   (blocked) → ${blocked.stdout.trim()}`)
  } finally {
    await sandbox.destroy()
    console.log('Sandbox destroyed.')
  }
}

// ---------------------------------------------------------------------------
// Example 2 — Allow-all egress
//   All outbound traffic is permitted (useful for dev/debug).
// ---------------------------------------------------------------------------

async function testAllowAll (compute) {
  console.log('\n--- Allow-all egress ---')

  const sandbox = await compute.sandbox.create({
    name: 'policy-allow-all',
    type: 'cpu:nodejs',
    workspace: 'policy-test',
    maxLifetime: 300,
    policy: { network: { egress: 'allow-all' } }
  })
  console.log(`Created sandbox: ${sandbox.id}`)

  try {
    const result = await sandbox.exec(
      `${CURL_STATUS} https://example.com`,
      { timeout: CURL_TIMEOUT }
    )
    console.log(`  example.com (allow-all) → HTTP ${result.stdout.trim()}`)
  } finally {
    await sandbox.destroy()
    console.log('Sandbox destroyed.')
  }
}

// ---------------------------------------------------------------------------
// Example 3 — Default-deny (no policy)
//   No policy is provided, so the default-deny baseline applies.
//   Only DNS and NATS are reachable.
// ---------------------------------------------------------------------------

async function testDefaultDeny (compute) {
  console.log('\n--- Default-deny (no policy) ---')

  const sandbox = await compute.sandbox.create({
    name: 'policy-default-deny',
    type: 'cpu:nodejs',
    workspace: 'policy-test',
    maxLifetime: 300
  })
  console.log(`Created sandbox: ${sandbox.id}`)

  try {
    const result = await sandbox.exec(
      'curl -s --connect-timeout 5 https://httpbin.org/get || echo "BLOCKED"',
      { timeout: CURL_TIMEOUT }
    )
    console.log(`  httpbin.org (deny-all)  → ${result.stdout.trim()}`)
  } finally {
    await sandbox.destroy()
    console.log('Sandbox destroyed.')
  }
}

// ---------------------------------------------------------------------------

async function main () {
  const runtime = await init({
    apihost: process.env.AIO_RUNTIME_APIHOST || 'http://localhost:8080',
    namespace: process.env.AIO_RUNTIME_NAMESPACE || 'namespace',
    api_key: process.env.AIO_RUNTIME_AUTH || 'auth'
  })

  await testSpecificEgress(runtime.compute)
  await testAllowAll(runtime.compute)
  await testDefaultDeny(runtime.compute)
}

main().catch(err => { console.error(err); process.exit(1) })
