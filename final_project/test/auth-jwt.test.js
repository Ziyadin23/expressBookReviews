const { test } = require('node:test');
const assert = require('node:assert/strict');
const { randomBytes } = require('node:crypto');
const jwt = require('jsonwebtoken');

const secret = randomBytes(32).toString('hex');
process.env.JWT_SECRET = secret;
const { requireLogin } = require('../router/auth_users');
const username = 'jwt-test-user';

function authorize(session) {
  const result = { allowed: false };
  const response = {
    status(code) { result.status = code; return this; },
    json(body) { result.body = body; return this; },
  };
  requireLogin({ session }, response, () => { result.allowed = true; });
  return result;
}

test('a valid signed session JWT authorizes its matching user', () => {
  const accessToken = jwt.sign({ username }, secret, { algorithm: 'HS256', expiresIn: '1h' });
  assert.deepEqual(authorize({ username, accessToken }), { allowed: true });
});

const invalidSessions = [
  ['a session username alone cannot authorize a review', { username }],
  ['a JWT with a forged signature cannot authorize a review', {
    username, accessToken: jwt.sign({ username }, randomBytes(32), { expiresIn: '1h' }),
  }],
  ['a JWT for another user cannot authorize a review', {
    username, accessToken: jwt.sign({ username: 'another-user' }, secret, { expiresIn: '1h' }),
  }],
];
for (const [name, session] of invalidSessions) {
  test(name, () => {
    assert.deepEqual(authorize(session), {
      allowed: false, status: 401, body: { message: 'Please log in first.' },
    });
  });
}

test('an expired session JWT cannot authorize a review', () => {
  const accessToken = jwt.sign({ username }, secret, { algorithm: 'HS256', expiresIn: -1 });
  assert.deepEqual(authorize({ username, accessToken }), {
    allowed: false, status: 401, body: { message: 'Please log in first.' },
  });
});
