// Read-only checks against configured services. Never outputs credentials or provider responses.
const fs = require('node:fs');
const { parse } = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const env = parse(fs.readFileSync('.env'));
const configured = key => Boolean(env[key]?.trim());
const googleIds = (env.GOOGLE_OAUTH_CLIENT_IDS || '').split(',').map(x => x.trim()).filter(Boolean);

async function checkDatabase() {
  if (!configured('DATABASE_URL')) return { status: 'unconfigured' };
  const url = new URL(env.DATABASE_URL);
  url.searchParams.set('connect_timeout', '8');
  const db = new PrismaClient({ datasources: { db: { url: url.toString() } }, log: [] });
  try {
    const tables = await db.$queryRaw`SELECT to_regclass('users')::text AS users,
      to_regclass('user_sessions')::text AS sessions,
      to_regclass('oauth_pending_identities')::text AS pending,
      to_regclass('public_cache_revision')::text AS revision,
      to_regclass('_prisma_migrations')::text AS migrations`;
    let pendingMigrations = [];
    if (tables[0].migrations) {
      const applied = await db.$queryRaw`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
      const names = new Set(applied.map(row => row.migration_name));
      pendingMigrations = fs.readdirSync('prisma/migrations', { withFileTypes: true }).filter(x => x.isDirectory() && !names.has(x.name)).map(x => x.name);
    }
    return { status: tables[0].pending && tables[0].revision && tables[0].migrations && !pendingMigrations.length ? 'ready' : 'migration_required',
      requiredTables: { users: !!tables[0].users, sessions: !!tables[0].sessions, oauthPending: !!tables[0].pending, cacheRevision: !!tables[0].revision },
      migrationHistoryAvailable: !!tables[0].migrations, pendingMigrations };
  } catch { return { status: 'unreachable_or_schema_unavailable' }; }
  finally { await db.$disconnect(); }
}
async function checkGoogle() {
  if (!googleIds.length) return { status: 'unconfigured' };
  const formatValid = googleIds.every(id => /^[A-Za-z0-9_-]+\.apps\.googleusercontent\.com$/.test(id));
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', { signal: AbortSignal.timeout(8000), redirect: 'error' });
    const value = await response.json();
    return { status: formatValid && response.ok && value.keys?.length > 0 ? 'keys_reachable' : 'check_failed', audienceCount: googleIds.length,
      clientRegistrationVerified: false, realUserLoginVerified: false };
  } catch { return { status: 'keys_unreachable', realUserLoginVerified: false }; }
}
async function checkFacebook() {
  if (!configured('FACEBOOK_APP_ID') || !configured('FACEBOOK_APP_SECRET') || !/^v\d+\.\d+$/.test(env.FACEBOOK_GRAPH_VERSION || '') || !/^\d+$/.test(env.FACEBOOK_APP_ID)) return { status: 'unconfigured_or_invalid_version' };
  try {
    const url = new URL(`https://graph.facebook.com/${env.FACEBOOK_GRAPH_VERSION}/${env.FACEBOOK_APP_ID}`);
    url.searchParams.set('fields', 'id');
    const response = await fetch(url, { headers: { Authorization: `Bearer ${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}` }, signal: AbortSignal.timeout(8000), redirect: 'error' });
    const value = await response.json();
    return { status: response.ok && String(value.id) === env.FACEBOOK_APP_ID ? 'app_credentials_accepted' : 'app_check_failed',
      httpStatus: response.status, ...(Number.isInteger(value.error?.code) ? { providerErrorCode: value.error.code } : {}), realUserLoginVerified: false,
      limitedLoginSupported: false };
  } catch { return { status: 'app_check_unreachable', realUserLoginVerified: false, limitedLoginSupported: false }; }
}
async function main() {
  const [database, google, facebook] = await Promise.all([checkDatabase(), checkGoogle(), checkFacebook()]);
  const report = { checkedAt: new Date().toISOString(), readyForEndToEndSignOff: false, scope: 'Read-only configuration/provider probes; no real client login, no database migration or writes',
    website: { publicWebUrl: env.PUBLIC_WEB_URL || null, emailLinkOrigin: env.FRONTEND_URL || null, allowedOrigins: (env.CORS_ALLOWED_ORIGINS || '').split(',').filter(Boolean) },
    database, google, facebook,
    email: { smtpConfigured: ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM'].every(configured), realDeliveryVerified: false },
    push: { fcmServiceAccountConfigured: configured('FCM_SERVICE_ACCOUNT_JSON'), deliveryEnabled: env.NOTIFICATION_DELIVERY_ENABLED === 'true', realDeviceDeliveryVerified: false },
    storage: { publicConfigured: ['STORAGE_ENDPOINT', 'STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_BUCKET', 'STORAGE_PUBLIC_URL'].every(configured), returnEvidenceConfigured: configured('RETURN_STORAGE_BUCKET') && env.RETURN_STORAGE_PRIVATE === 'true' },
    missingClientEvidence: ['Next.js UI/browser login', 'Expo development build and Android/iOS provider registration', 'Real provider token exchange', 'Email delivery/onboarding/link', 'Client repositories not present in workspace'] };
  fs.mkdirSync('docs/api', { recursive: true });
  fs.writeFileSync('docs/api/client-readiness.json', JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
}
main().catch(() => { console.error('Client readiness failed; credentials and connection details omitted.'); process.exitCode = 1; });
