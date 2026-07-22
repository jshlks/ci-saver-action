// index.js
'use strict';

const https = require('https');
const fs = require('fs');

const LICENSE_KEY =
  process.env.INPUT_LICENSE_KEY ||
  (process.env.GITHUB_WORKSPACE
    ? safeReadFile(process.env.GITHUB_WORKSPACE + '/license_key.txt')
    : '') ||
  '';

const GUMROAD_PRODUCT_ID = 'YOUR_GUMROAD_PRODUCT_ID';
const GITHUB_EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const GITHUB_OUTPUT = process.env.GITHUB_OUTPUT;

function safeReadFile(path) {
  try {
    return fs.readFileSync(path, 'utf8').trim();
  } catch {
    return '';
  }
}

function failLicense() {
  console.error('CI-Saver: Access Denied. Your Gumroad license key is invalid or expired.');
  process.exit(1);
}

function gumroadRequest(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);

    const req = https.request(
      {
        hostname: 'gumroad.com',
        path: '/l/verify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'CI-Saver/1.0',
        },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
      }
    );

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function writeOutput(name, value) {
  if (!GITHUB_OUTPUT) return;
  fs.appendFileSync(GITHUB_OUTPUT, `${name}=${value}\n`);
}

function getChangedFilesFromEvent() {
  if (!GITHUB_EVENT_PATH) return [];

  const raw = fs.readFileSync(GITHUB_EVENT_PATH, 'utf8');
  const event = JSON.parse(raw);

  const files = new Set();

  if (Array.isArray(event.commits)) {
    for (const commit of event.commits) {
      for (const key of ['added', 'modified', 'removed']) {
        if (Array.isArray(commit[key])) {
          for (const file of commit[key]) files.add(file);
        }
      }
    }
  }

  // Fallback for custom payloads that may include filenames directly.
  if (Array.isArray(event.changed_files)) {
    for (const file of event.changed_files) files.add(file);
  }

  if (event.pull_request && Array.isArray(event.pull_request.files)) {
    for (const file of event.pull_request.files) files.add(file);
  }

  return [...files];
}

(async () => {
  if (!LICENSE_KEY) failLicense();

  let gumroad;
  try {
    gumroad = await gumroadRequest({
      product_id: GUMROAD_PRODUCT_ID,
      license_key: LICENSE_KEY,
      increment_count_by_one: false,
    });
  } catch {
    failLicense();
  }

  let parsed;
  try {
    parsed = JSON.parse(gumroad.body || '{}');
  } catch {
    failLicense();
  }

  if (gumroad.statusCode < 200 || gumroad.statusCode >= 300 || parsed.success === false) {
    failLicense();
  }

  const changedFiles = getChangedFilesFromEvent();
  const allowed = /\.(md|txt|css|png|jpg)$/i;

  const onlyAllowed =
    changedFiles.length > 0 && changedFiles.every((file) => allowed.test(file));

  writeOutput('should_run', onlyAllowed ? 'false' : 'true');
  console.log(`should_run=${onlyAllowed ? 'false' : 'true'}`);
})().catch(() => {
  failLicense();
});
