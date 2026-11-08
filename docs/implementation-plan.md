# Book review final project

Use IBM's Express starter and retain its ten-book fixture and route layout.
Complete public search/review endpoints and registration, then session login and
owner-only review writes/deletes. Store password hashes instead of plaintext.
Keep the lab's in-memory data model; restarting resets users and reviews.
Add four callable Axios retrieval functions to router/general.js (async/await
and promise callbacks), with a command-line demonstration against the running API.

Verification: exercise the real HTTP server with Node's test runner, including
invalid input, duplicate registration, concurrent requests, and two-user review
ownership. Capture real cURL commands and outputs for all ten evidence items.
Verify GitHub fork metadata, then commit and push only this standalone repository.
The Coursera answers and final submission remain for the learner to review.
