# Coursera submission guide

Open each file below and paste its complete contents into the corresponding answer.
The files contain actual cURL commands and actual responses from this project.

| Assignment task | File | Evidence |
| --- | --- | --- |
| 1 | [githubrepo](githubrepo) | GitHub API response with `fork: true` and IBM's repository as `parent` |
| 2 | [getallbooks](getallbooks) | All ten supplied books |
| 3 | [getbooksbyISBN](getbooksbyISBN) | ISBN 1: Things Fall Apart |
| 4 | [getbooksbyauthor](getbooksbyauthor) | All four books by Unknown |
| 5 | [getbooksbytitle](getbooksbytitle) | Things Fall Apart by title |
| 6 | [getbookreview](getbookreview) | Initial empty reviews `{}` from IBM's dataset |
| 7 | [register](register) | Successful registration |
| 8 | [login](login) | Successful login with session cookie saved by cURL |
| 9 | [reviewadded](reviewadded) | Add and update confirmations plus GET responses showing both versions |
| 10 | [deletereview](deletereview) | Deletion confirmation and empty reviews afterward |
| 11 | [general-js-url.txt](general-js-url.txt) | GitHub URL of the Axios implementation |

Paste this URL for Task 11:

https://github.com/Ziyadin23/expressBookReviews/blob/main/final_project/router/general.js

`axios-demo.json` additionally records the results of all four Axios functions.

IBM's actual upstream repository is `expressBookReviews` (plural). The assignment's
singular spelling returns 404. The fork proof records the actual upstream metadata.

The assignment mentions 14 tasks but combines the four Axios retrieval operations
into Task 11 (8 points). All four implementations are in the linked file.

The saved initial review is honestly empty because that is what IBM's supplied
fixture contains. `reviewadded` shows a review being created and then updated.
The cookie jar used in the commands is temporary and is not committed.

To repeat the commands manually, start the server with `PORT=5055 npm start` in
`final_project`, run the commands in assignment order from one working directory,
and keep the generated `cookies.txt` for authenticated requests. The demonstration
password is sample data. To regenerate everything automatically, use `npm run evidence`.

Review your work, select Begin in Coursera, fill in the answers, then submit.
No Coursera attempt has been started or submitted by this project.
