const jwt = require('jsonwebtoken');
const fs = require('fs');

// Apple Developer 資訊
const TEAM_ID = '4CK7B2U2UQ';
const KEY_ID = '25K4GNRY7T';
const SERVICE_ID = 'com.azbarber.app.signin';

// 讀取 .p8 私鑰（請修改路徑）
const privateKeyPath = process.argv[2] || '~/Downloads/AuthKey_25K4GNRY7T.p8';
const privateKey = fs.readFileSync(privateKeyPath.replace('~', process.env.HOME), 'utf8');

// 生成 client secret (有效期 6 個月)
const now = Math.floor(Date.now() / 1000);
const payload = {
  iss: TEAM_ID,
  iat: now,
  exp: now + (86400 * 180), // 180 天
  aud: 'https://appleid.apple.com',
  sub: SERVICE_ID,
};

const secret = jwt.sign(payload, privateKey, {
  algorithm: 'ES256',
  header: {
    alg: 'ES256',
    kid: KEY_ID,
  },
});

console.log('Apple Client Secret:');
console.log(secret);
console.log('\n有效期至:', new Date((now + 86400 * 180) * 1000).toISOString());
