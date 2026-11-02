const { spawn } = require('node:child_process');
const { existsSync } = require('node:fs');
const { readFile, writeFile } = require('node:fs/promises');
const path = require('node:path');

const envPath = path.resolve(__dirname, '../../.env');
const inspector = 'http://127.0.0.1:4040/api/tunnels';

async function tunnels() {
  try {
    const response = await fetch(inspector, {
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return null;
    return (await response.json()).tunnels;
  } catch {
    return null;
  }
}

function backendTunnel(items) {
  return items?.find((tunnel) => {
    try {
      const local = new URL(
        tunnel.config.addr.includes('://')
          ? tunnel.config.addr
          : `http://${tunnel.config.addr}`,
      );
      return (
        ['localhost', '127.0.0.1', '[::1]'].includes(local.hostname) &&
        local.port === '3000' &&
        tunnel.public_url.startsWith('https://')
      );
    } catch {
      return false;
    }
  });
}

async function configure(publicUrl) {
  const url = new URL(publicUrl);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('ngrok returned an invalid HTTPS origin.');
  const updates = {
    PAYMENT_PUBLIC_BASE_URL: `${url.origin}/api/v1`,
    PAYMENT_WEB_RETURN_URL:
      process.env.PAYMENT_WEB_RETURN_URL ||
      'https://localhost:3001/payment/return',
  };
  let text = await readFile(envPath, 'utf8');
  const newline = text.includes('\r\n') ? '\r\n' : '\n';
  for (const [key, value] of Object.entries(updates)) {
    if (/[\r\n]/.test(value)) throw new Error(`Invalid ${key}`);
    const match = new RegExp(`^${key}=.*\\r?$`, 'gm');
    if (match.test(text))
      text = text.replace(
        match,
        () => `${key}=${value}${newline === '\r\n' ? '\r' : ''}`,
      );
    else
      text += `${text.endsWith('\n') ? '' : newline}${key}=${value}${newline}`;
  }
  await writeFile(envPath, text);
  console.log(`\nPayment backend URL: ${url.origin}`);
  console.log(`SePay webhook URL: ${url.origin}/api/v1/payments/sepay/webhook`);
  console.log(
    'Saved payment URLs to backend/.env. Existing merchant keys and enable flags were preserved.',
  );
  console.log(
    process.env.NGROK_DOMAIN
      ? 'Using the explicitly configured NGROK_DOMAIN. Reuse this command to request the same domain.'
      : 'This automatically assigned URL is not guaranteed to be reusable. Set NGROK_DOMAIN to your assigned Dev Domain from https://dashboard.ngrok.com/domains before registering a stable SePay webhook.',
  );
  console.log(
    'Restart backend after this first setup so it loads the updated .env. Keep this tunnel running while testing.',
  );
}

async function main() {
  const health = await fetch('http://localhost:3000/api/v1/health/ready', {
    signal: AbortSignal.timeout(5000),
  });
  if (!health.ok)
    throw new Error(
      'Backend is not ready. Start backend with npm run start:dev first.',
    );
  const running = await tunnels();
  const existing = backendTunnel(running);
  if (existing) {
    if (
      process.env.NGROK_DOMAIN &&
      new URL(existing.public_url).hostname !== process.env.NGROK_DOMAIN
    )
      throw new Error(
        'The running tunnel uses a different domain than NGROK_DOMAIN. No configuration was changed.',
      );
    await configure(existing.public_url);
    return;
  }
  if (running)
    throw new Error(
      'Another ngrok agent is using port 4040. Keep it running and resolve its tunnel configuration before starting this helper.',
    );
  const windowsBinary =
    process.env.LOCALAPPDATA &&
    path.join(process.env.LOCALAPPDATA, 'Microsoft/WindowsApps/ngrok.exe');
  const binary =
    windowsBinary && existsSync(windowsBinary) ? windowsBinary : 'ngrok';
  const args = ['http', '3000', '--log=stdout'];
  if (process.env.NGROK_DOMAIN) {
    if (!/^[a-z0-9.-]+$/i.test(process.env.NGROK_DOMAIN))
      throw new Error(
        'NGROK_DOMAIN must contain only the hostname assigned to your ngrok account.',
      );
    args.push('--url', `https://${process.env.NGROK_DOMAIN}`);
  }
  const child = spawn(binary, args, { stdio: 'inherit', windowsHide: true });
  let ended = false;
  child.on('error', () => {
    ended = true;
    console.error(
      'Could not start ngrok. Install ngrok and link your account first.',
    );
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    ended = true;
    process.exitCode = code ?? 1;
    if (code)
      console.error(
        'ngrok stopped with an error. Check its error code above. ERR_NGROK_4018 requires account authentication; ERR_NGROK_313 requires using the Dev Domain assigned to your account.',
      );
  });
  for (const signal of ['SIGINT', 'SIGTERM'])
    process.on(signal, () => child.kill(signal));
  for (let attempt = 0; attempt < 30 && !ended; attempt++) {
    const tunnel = backendTunnel(await tunnels());
    if (tunnel) {
      try {
        await configure(tunnel.public_url);
      } catch (error) {
        child.kill();
        throw error;
      }
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  if (!ended) {
    child.kill();
    throw new Error(
      'ngrok did not publish a backend HTTPS URL in time. Check the ngrok output above.',
    );
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : 'Could not configure payment tunnel.',
  );
  process.exitCode = 1;
});
