const express = require('express');
const jwt = require('jsonwebtoken');
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const books = require('./booksdb');
const deriveKey = promisify(scrypt);
const jwtSecret = process.env.JWT_SECRET || randomBytes(32).toString('hex');
const regd_users = express.Router();
const users = new Map();

function validCredentials(username, password) {
  return typeof username === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(username)
    && !['__proto__', 'constructor', 'prototype'].includes(username)
    && typeof password === 'string' && password.trim().length > 0 && password.length <= 256;
}
const isValid = username => users.has(username);

async function authenticatedUser(username, password) {
  const user = users.get(username);
  if (!user) return false;
  const key = await deriveKey(password, user.salt, 64);
  return timingSafeEqual(key, user.hash);
}

function requireLogin(req, res, next) {
  if (req.session?.username && req.session.accessToken) {
    try {
      const payload = jwt.verify(req.session.accessToken, jwtSecret, { algorithms: ['HS256'] });
      if (payload.username === req.session.username) return next();
    } catch {}
  }
  return res.status(401).json({ message: 'Please log in first.' });
}

regd_users.post('/login', async (req, res, next) => {
  const { username, password } = req.body || {};
  if (!validCredentials(username, password)) return res.status(400).json({ message: 'A valid username and password are required.' });
  try {
    if (!await authenticatedUser(username, password)) return res.status(401).json({ message: 'Invalid username or password.' });
    const accessToken = jwt.sign({ username }, jwtSecret, { algorithm: 'HS256', expiresIn: '1h' });
    req.session.regenerate(error => {
      if (error) return next(error);
      req.session.username = username;
      req.session.accessToken = accessToken;
      return res.json({ message: 'User successfully logged in.', username });
    });
  } catch (error) { next(error); }
});

regd_users.put('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  if (!Object.hasOwn(books, isbn)) return res.status(404).json({ message: 'Book not found.' });
  const review = req.body?.review ?? req.query.review;
  if (typeof review !== 'string' || !review.trim() || review.length > 5000) {
    return res.status(400).json({ message: 'Review must contain 1 to 5000 characters.' });
  }
  const username = req.session.username;
  const updated = Object.hasOwn(books[isbn].reviews, username);
  books[isbn].reviews[username] = review.trim();
  return res.json({ message: updated ? 'Review successfully updated.' : 'Review successfully added.', reviews: books[isbn].reviews });
});

regd_users.delete('/auth/review/:isbn', (req, res) => {
  const { isbn } = req.params;
  if (!Object.hasOwn(books, isbn)) return res.status(404).json({ message: 'Book not found.' });
  const username = req.session.username;
  if (!Object.hasOwn(books[isbn].reviews, username)) return res.status(404).json({ message: 'You have no review for this book.' });
  delete books[isbn].reviews[username];
  return res.json({ message: 'Review successfully deleted.', reviews: books[isbn].reviews });
});

module.exports = { authenticated: regd_users, users, isValid, authenticatedUser, validCredentials, requireLogin };
