// index.js
'use strict';

const fs = require('fs');
const https = require('https');

function fail(message) {
  process.stdout.write(message + '\n');
  process.exit(1);
}

function postJson(urlString, bodyObj, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const body = JSON.stringify(bodyObj);

    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'ci-saver-action',
        },
        timeout: timeoutMs,
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve({ statusCode: res.statusCode || 0, body: data });
        });
      }
    );

    req.on('timeout', () => {
      req.destroy(new Error('Request timed out'));
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

function isValidSubscriptionResponse(response) {
  if (!response || typeof response !== 'object') return false;

  const success = response.success === true;
  const active =
    response.subscription_active === true ||
    response.subscription_status === 'active' ||
    response.recurring === true ||
    response.paid === true ||
    response.purchase && response.purchase.refunded === false;

  return success && active;
}

function extractChangedFiles(eventData) {
  const files = [];

  if (Array.isArray(eventData?.files)) {
    for (const f of eventData.files) {
      if (typeof f === 'string') files.push(f);
      else if (f && typeof f.filename === 'string') files.push(f.filename);
      else if (f && typeof f.path === 'string') files.push(f.path);
    }
  }

  if (Array.isArray(eventData?.commits)) {
    for (const commit of eventData.commits) {
      for (const key of ['added', 'modified', 'removed']) {
        if (Array.isArray(commit?.[key])) {
          for (const f of commit[key]) {
            if (typeof f === 'string') files.push(f);
          }
        }
      }
    }
  }

  if (Array.isArray(eventData?.pull_request?.files)) {
    for (const f of eventData.pull_request.files) {
      if (typeof f === 'string') files.push(f);
      else if (f && typeof f.filename === 'string') files.push(f.filename);
      else if (f && typeof f.path === 'string') files.push(f.path);
    }
  }

  return [...new Set(files)];
}

function onlyAllowedExtensions(files) {
  if (!files.length) return false;
  const allowed = new Set(['.md', '.txt', '.css', '.png', '.jpg']);
  return files.every((file) => {
    const lower = file.toLowerCase();
    const ext = lower.slice(lower.lastIndexOf('.'));
    return allowed.has(ext);
  });
}

(async () => {
  try {
    const licenseKey = process.env.INPUT_LICENSE_KEY;

    if (licenseKey === undefined || licenseKey === null || String(licenseKey).trim() === '') {
      fail('::error::CI-Saver: Missing license key. A paid $15/month Gumroad license is required to use this action.');
    }

    const validationPayload = {
      product_id: '0zdbjVb7SCH0flAjMt-BCA==',
      license_key: String(licenseKey).trim(),
      increment_count_by_one: false,
    };

    const gumroadResponse = await postJson('https://gumroad.com', validationPayload);

    let parsed;
    try {
      parsed = JSON.parse(gumroadResponse.body || '{}');
    } catch {
      parsed = null;
    }

    if (!isValidSubscriptionResponse(parsed)) {
      fail('::error::CI-Saver: Access Denied. Your $15/month Gumroad license key is invalid, expired, or unpaid.');
    }

    const eventPath = process.env.GITHUB_EVENT_PATH;
    if (!eventPath) {
      fail('::error::CI-Saver: Missing GITHUB_EVENT_PATH.');
    }

    const eventRaw = fs.readFileSync(eventPath, 'utf8');
    const eventData = JSON.parse(eventRaw);
    const changedFiles = extractChangedFiles(eventData);

    const shouldRun = !onlyAllowedExtensions(changedFiles);
    const outputPath = process.env.GITHUB_OUTPUT;

    if (!outputPath) {
      fail('::error::CI-Saver: Missing GITHUB_OUTPUT.');
    }

    fs.appendFileSync(outputPath, `should_run=${shouldRun ? 'true' : 'false'}\n`, 'utf8');
  } catch (err) {
    fail(`::error::CI-Saver: ${err && err.message ? err.message : 'Unexpected failure.'}`);
  }
})();
