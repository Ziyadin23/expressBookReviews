const express = require('express');
const session = require('express-session');
const { randomBytes } = require('node:crypto');
const { authenticated, requireLogin } = require('./router/auth_users');
const { general } = require('./router/general');

const app = express();
app.use(express.json({ limit: '16kb' }));
app.use('/customer', session({
  secret: process.env.SESSION_SECRET || randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 1000 },
}));
app.use('/customer/auth', requireLogin);
app.use('/customer', authenticated);
app.use('/', general);
app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));
app.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ message: 'Invalid JSON body.' });
  if (error.type === 'entity.too.large') return res.status(413).json({ message: 'Request body is too large.' });
  console.error(error);
  return res.status(500).json({ message: 'Internal server error.' });
});

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, '127.0.0.1', () => console.log(`Server is running at http://127.0.0.1:${port}`));
}
module.exports = app;
