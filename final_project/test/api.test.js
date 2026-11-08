const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const path = require('node:path');

const base = 'http://127.0.0.1:5000';
let server;
before(async () => {
  server = spawn(process.execPath, ['index.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '5000' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server did not start: ' + output)), 10000);
    server.stdout.on('data', data => {
      output += data;
      if (output.includes('Server is running')) { clearTimeout(timeout); resolve(); }
    });
    server.stderr.on('data', data => { output += data; });
    server.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${output}`)); });
  });
});
after(async () => {
  if (server && server.exitCode === null) { server.kill(); await once(server, 'exit'); }
});
async function request(route, { method = 'GET', body, cookie } = {}) {
  const response = await fetch(base + route, {
    method,
    headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json(), cookie: response.headers.get('set-cookie')?.split(';')[0] };
}

test('public catalog and searches use the supplied books and reject unknown ISBNs', async () => {
  const all = await request('/');
  assert.equal(all.status, 200);
  assert.equal(Object.keys(all.data).length, 10);
  assert.equal(all.data['1'].title, 'Things Fall Apart');
  assert.equal((await request('/isbn/8')).data.author, 'Jane Austen');
  assert.deepEqual(Object.keys((await request('/author/Unknown')).data), ['4', '5', '6', '7']);
  assert.equal((await request('/title/Pride%20and%20Prejudice')).data['8'].author, 'Jane Austen');
  assert.deepEqual((await request('/review/1')).data, {});
  for (const route of ['/isbn/999', '/review/999', '/isbn/__proto__', '/author/Nobody', '/title/Absent']) {
    assert.equal((await request(route)).status, 404, route);
  }
});

test('registration validates credentials and permits only one concurrent registration per username', async () => {
  assert.equal((await request('/register', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/register', { method: 'POST', body: { username: '__proto__', password: 'test-pass' } })).status, 400);
  assert.equal((await request('/register', { method: 'POST', body: { username: 'array', password: [] } })).status, 400);
  const attempts = await Promise.all(Array.from({ length: 5 }, () => request('/register', {
    method: 'POST', body: { username: 'duplicate', password: 'test-pass' },
  })));
  assert.deepEqual(attempts.map(r => r.status).sort(), [201, 409, 409, 409, 409]);
});

test('login requires registered credentials and prevents anonymous review writes', async () => {
  assert.equal((await request('/customer/login', { method: 'POST', body: {} })).status, 400);
  assert.equal((await request('/customer/login', { method: 'POST', body: { username: 'missing', password: 'bad' } })).status, 401);
  assert.equal((await request('/customer/login', { method: 'POST', body: { username: 'duplicate', password: 'bad' } })).status, 401);
  for (const method of ['PUT', 'DELETE']) {
    assert.equal((await request('/customer/auth/review/1', { method, body: { review: 'anonymous' } })).status, 401);
  }
});

test('two sessions can add, update and delete only their own reviews', async () => {
  const cookies = [];
  for (const username of ['alice', 'bob']) {
    assert.equal((await request('/register', { method: 'POST', body: { username, password: 'test-pass' } })).status, 201);
    const login = await request('/customer/login', { method: 'POST', body: { username, password: 'test-pass' } });
    assert.equal(login.status, 200);
    assert.ok(login.cookie);
    cookies.push(login.cookie);
  }
  const [alice, bob] = cookies;
  await Promise.all(cookies.map((cookie, i) => request('/customer/auth/review/1', {
    method: 'PUT', cookie, body: { review: `Review ${i}`, username: 'someone-else' },
  })));
  assert.deepEqual((await request('/review/1')).data, { alice: 'Review 0', bob: 'Review 1' });
  assert.equal((await request('/customer/auth/review/1', { method: 'PUT', cookie: alice, body: { review: '' } })).status, 400);
  assert.equal((await request('/customer/auth/review/999', { method: 'PUT', cookie: alice, body: { review: 'Missing book' } })).status, 404);
  assert.equal((await request('/customer/auth/review/1?review=Updated', { method: 'PUT', cookie: alice })).status, 200);
  assert.deepEqual((await request('/review/1')).data, { alice: 'Updated', bob: 'Review 1' });
  assert.equal((await request('/customer/auth/review/1', { method: 'DELETE', cookie: alice })).status, 200);
  assert.deepEqual((await request('/review/1')).data, { bob: 'Review 1' });
  assert.equal((await request('/customer/auth/review/1', { method: 'DELETE', cookie: alice })).status, 404);
  assert.equal((await request('/customer/auth/review/1', { method: 'DELETE', cookie: bob })).status, 200);
  assert.deepEqual((await request('/review/1')).data, {});
});

test('Axios retrieval functions return API data and propagate request failures', async () => {
  const { getAllBooks, getBooksByISBN, getBooksByAuthor, getBooksByTitle } = require('../router/general');
  assert.equal(typeof getAllBooks, 'function');
  assert.equal(Object.keys(await getAllBooks(base)).length, 10);
  assert.equal((await getBooksByISBN('1', base)).title, 'Things Fall Apart');
  assert.equal(Object.keys(await getBooksByAuthor('Unknown', base)).length, 4);
  assert.equal((await getBooksByTitle('Pride and Prejudice', base))['8'].author, 'Jane Austen');
  await assert.rejects(getBooksByISBN('999', base), error => error.response.status === 404);
  const concurrent = await Promise.all(Array.from({ length: 20 }, () => getAllBooks(base)));
  assert.ok(concurrent.every(books => Object.keys(books).length === 10));
});
