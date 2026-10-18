import { resolve } from 'node:path';

// All secrets come from the environment (Dokploy → Environment). Nothing here is sent to browsers.
const env = process.env;
export const config = {
  port: Number(env.PORT || 8080),
  dataDir: resolve(env.DATA_DIR || './data'),
  teamFile: resolve(env.TEAM_FILE || new URL('../../dist/team.js', import.meta.url).pathname),
  adminPasscode: env.ADMIN_PASSCODE || '',
  gowa: {
    url: env.GOWA_URL || 'http://gowa:3000',
    basicAuth: env.GOWA_BASIC_AUTH || '',
    deviceId: env.GOWA_DEVICE_ID || 'office',
    webhookSecret: env.WHATSAPP_WEBHOOK_SECRET || '',
  },
};
