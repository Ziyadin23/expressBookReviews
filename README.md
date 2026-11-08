# Express Book Reviews — final project

Completed IBM bookstore API, forked from
[ibm-developer-skills-network/expressBookReviews](https://github.com/ibm-developer-skills-network/expressBookReviews).
The assignment spells the repository name without the final `s`; the linked repository
is IBM's actual starter. Its original ten-book dataset in `final_project/router/booksdb.js`
is preserved, including the lab's ISBN keys `1` through `10`.

## Run

Requires Node.js 20 or later, npm, and cURL (for evidence generation).

```bash
cd final_project
npm ci
npm start
```

The server listens at `http://127.0.0.1:5000`. Set `PORT` to change it.
In another terminal, inside `final_project`:

```bash
npm run demo:axios
```

This runs four actual Axios requests concurrently. The functions live in
[`general.js`](final_project/router/general.js): `getAllBooks`, `getBooksByISBN`,
`getBooksByAuthor`, and `getBooksByTitle`. Three use `async/await`; the ISBN
function uses a promise callback. They return parsed JSON and propagate errors.
Set `BOOKSTORE_URL` if the server uses a different address or port.

## API

| Method | Path | Result |
| --- | --- | --- |
| GET | `/` | All ten books, keyed by ISBN |
| GET | `/isbn/:isbn` | One book |
| GET | `/author/:author` | Books matching the author |
| GET | `/title/:title` | Books matching the title |
| GET | `/review/:isbn` | Reviews keyed by username |
| POST | `/register` | Register with JSON `username` and `password` |
| POST | `/customer/login` | Log in with JSON `username` and `password`; returns a session cookie |
| PUT | `/customer/auth/review/:isbn` | Add or update your review with JSON `review` or query parameter `review` |
| DELETE | `/customer/auth/review/:isbn` | Delete your own review |

Author/title matching is exact and case-insensitive; URL-encode spaces and accents.
Unknown books/searches return 404. Invalid input returns 400, duplicate usernames
409, and unauthenticated writes or invalid logins 401. Registration returns 201.
Review writes return a confirmation and the current reviews. Use cURL's `-c` and
`-b` options to save and send the login cookie. Usernames accept 1–64 letters,
digits, underscores or hyphens (reserved object property names are rejected).

Passwords use salted scrypt hashes. Registration checks uniqueness again after
asynchronous hashing to handle simultaneous requests. Review writes are synchronous
in-memory mutations; simultaneous readers do not block on network or password hashing.
Each authenticated user can modify/delete only their own review, regardless of any
username supplied in the request body.

Successful login stores a signed JWT in the server-side session. Protected review
routes verify its signature, expiry and username before permitting a write. Tokens
expire after one hour; the browser or cURL client sends the session cookie.

## Verify and regenerate submission evidence

```bash
cd final_project
npm test
npm run evidence
```

Tests start and stop their own server on port 5000, so stop `npm start` first.
They cover the supplied dataset, missing books, invalid credentials, concurrent
registration and retrieval, and two separate users adding/updating/deleting reviews.
JWT middleware checks also cover missing, tampered, expired and mismatched tokens.

The evidence script starts a fresh server on port 5055, captures actual commands
and outputs, checks GitHub's fork metadata, runs the Axios example, and shuts down.
Set `EVIDENCE_PORT` if needed. It overwrites the ten named evidence files in
[`submission/`](submission/). It uses a disposable demonstration account, and its
cookie jar is deleted afterward.

See [`submission/README.md`](submission/README.md) for exactly what to paste into
Coursera, including the URL for `general.js`. Review the code and evidence before
submitting the assignment yourself.

## Lab limitations

As in IBM's starter, books, users and reviews are held in one Node process's memory.
Restarting resets users and reviews. Session storage is Express's development memory
store. This is a local course project; a deployed service needs persistent storage,
a shared session store and HTTPS cookies. An optional `SESSION_SECRET` environment
variable fixes the signing secret; otherwise a random secret is generated on startup.
Set `JWT_SECRET` to configure the JWT signing key; otherwise a separate random key
is generated when the server starts.
