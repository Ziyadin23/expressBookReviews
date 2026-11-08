const express = require('express');
const axios = require('axios');
const { randomBytes, scrypt } = require('node:crypto');
const { promisify } = require('node:util');
const books = require('./booksdb');
const { users, isValid, validCredentials } = require('./auth_users');
const deriveKey = promisify(scrypt);
const public_users = express.Router();

public_users.post('/register', async (req, res, next) => {
  const { username, password } = req.body || {};
  if (!validCredentials(username, password)) return res.status(400).json({ message: 'Use a username of 1 to 64 letters, digits, underscores or hyphens, and a nonempty password up to 256 characters.' });
  if (isValid(username)) return res.status(409).json({ message: 'Username already exists.' });
  try {
    const salt = randomBytes(16).toString('hex');
    const hash = await deriveKey(password, salt, 64);
    // Recheck after hashing so simultaneous registrations cannot overwrite a user.
    if (isValid(username)) return res.status(409).json({ message: 'Username already exists.' });
    users.set(username, { salt, hash });
    return res.status(201).json({ message: 'User successfully registered. You can now log in.', username });
  } catch (error) { next(error); }
});

public_users.get('/', (req, res) => res.json(books));
public_users.get('/isbn/:isbn', (req, res) => {
  if (!Object.hasOwn(books, req.params.isbn)) return res.status(404).json({ message: 'Book not found.' });
  return res.json(books[req.params.isbn]);
});

function search(field) {
  return (req, res) => {
    const value = req.params[field].toLowerCase();
    const matches = Object.fromEntries(Object.entries(books).filter(([, book]) => book[field].toLowerCase() === value));
    if (!Object.keys(matches).length) return res.status(404).json({ message: 'No matching books found.' });
    return res.json(matches);
  };
}
public_users.get('/author/:author', search('author'));
public_users.get('/title/:title', search('title'));
public_users.get('/review/:isbn', (req, res) => {
  if (!Object.hasOwn(books, req.params.isbn)) return res.status(404).json({ message: 'Book not found.' });
  return res.json(books[req.params.isbn].reviews);
});

// Assignment tasks 10–13: Axios clients for the four public retrieval endpoints.
// These call the running server; server handlers above read the supplied fixture.
const defaultBaseURL = process.env.BOOKSTORE_URL || 'http://127.0.0.1:5000';
async function getAllBooks(baseURL = defaultBaseURL) {
  const response = await axios.get(`${baseURL}/`, { timeout: 5000 });
  return response.data;
}
function getBooksByISBN(isbn, baseURL = defaultBaseURL) {
  return axios.get(`${baseURL}/isbn/${encodeURIComponent(isbn)}`, { timeout: 5000 })
    .then(response => response.data);
}
async function getBooksByAuthor(author, baseURL = defaultBaseURL) {
  const response = await axios.get(`${baseURL}/author/${encodeURIComponent(author)}`, { timeout: 5000 });
  return response.data;
}
async function getBooksByTitle(title, baseURL = defaultBaseURL) {
  const response = await axios.get(`${baseURL}/title/${encodeURIComponent(title)}`, { timeout: 5000 });
  return response.data;
}

if (require.main === module) {
  Promise.all([getAllBooks(), getBooksByISBN('1'), getBooksByAuthor('Unknown'), getBooksByTitle('Things Fall Apart')])
    .then(([all, isbn, author, title]) => console.log(JSON.stringify({ all, isbn, author, title }, null, 2)))
    .catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { general: public_users, getAllBooks, getBooksByISBN, getBooksByAuthor, getBooksByTitle };
