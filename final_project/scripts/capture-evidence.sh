#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
evidence_dir="$(cd -- "$project_dir/../submission" && pwd)"
run_dir="$(mktemp -d)"
port="${EVIDENCE_PORT:-5055}"
base="http://127.0.0.1:$port"
server_pid=''
cleanup() {
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; wait "$server_pid" 2>/dev/null || true; fi
  rm -rf -- "$run_dir"
}
trap cleanup EXIT
# Refuse an occupied port so evidence always uses a fresh, empty application.
node - "$port" <<'JS'
const net = require('node:net');
const server = net.createServer();
server.once('error', error => { console.error(error.message); process.exitCode = 1; });
server.listen(Number(process.argv[2]), '127.0.0.1', () => server.close());
JS
PORT="$port" node "$project_dir/index.js" > "$run_dir/server.log" 2>&1 &
server_pid=$!
ready=false
for ((i=0; i<100; i++)); do
  if curl --silent --fail "$base/" > /dev/null; then ready=true; break; fi
  if ! kill -0 "$server_pid" 2>/dev/null; then cat "$run_dir/server.log"; exit 1; fi
  sleep 0.1
done
if [[ "$ready" != true ]]; then cat "$run_dir/server.log"; exit 1; fi
cd -- "$run_dir"
capture() {
  local filename="$1"
  shift
  printf '$' >> "$evidence_dir/$filename"
  local argument
  for argument in "$@"; do
    printf ' %q' "$argument" >> "$evidence_dir/$filename"
  done
  printf '\n' >> "$evidence_dir/$filename"
  "$@" >> "$evidence_dir/$filename"
  printf '\n\n' >> "$evidence_dir/$filename"
}
for name in githubrepo getallbooks getbooksbyISBN getbooksbyauthor getbooksbytitle getbookreview register login reviewadded deletereview; do
  : > "$evidence_dir/$name"
done
capture githubrepo curl --fail-with-body --silent --show-error https://api.github.com/repos/Ziyadin23/expressBookReviews
# Check the real API response, rather than merely assuming the repository is a fork.
node - "$evidence_dir/githubrepo" <<'JS'
const fs = require('node:fs');
const content = fs.readFileSync(process.argv[2], 'utf8');
const metadata = JSON.parse(content.slice(content.indexOf('\n') + 1));
if (!metadata.fork || metadata.parent.full_name !== 'ibm-developer-skills-network/expressBookReviews') {
  throw new Error('GitHub did not confirm the required fork relationship.');
}
JS
capture getallbooks curl --fail-with-body --silent --show-error "$base/"
capture getbooksbyISBN curl --fail-with-body --silent --show-error "$base/isbn/1"
capture getbooksbyauthor curl --fail-with-body --silent --show-error "$base/author/Unknown"
capture getbooksbytitle curl --fail-with-body --silent --show-error "$base/title/Things%20Fall%20Apart"
capture getbookreview curl --fail-with-body --silent --show-error "$base/review/1"
capture register curl --fail-with-body --silent --show-error -X POST "$base/register" -H 'Content-Type: application/json' -d '{"username":"demo_reader","password":"demo-password-123"}'
capture login curl --fail-with-body --silent --show-error -X POST "$base/customer/login" -H 'Content-Type: application/json' -c cookies.txt -d '{"username":"demo_reader","password":"demo-password-123"}'
capture reviewadded curl --fail-with-body --silent --show-error -X PUT "$base/customer/auth/review/1" -H 'Content-Type: application/json' -b cookies.txt -d '{"review":"A compelling story with memorable characters."}'
capture reviewadded curl --fail-with-body --silent --show-error "$base/review/1"
capture reviewadded curl --fail-with-body --silent --show-error -X PUT "$base/customer/auth/review/1" -H 'Content-Type: application/json' -b cookies.txt -d '{"review":"Updated: A thoughtful exploration of tradition and change."}'
capture reviewadded curl --fail-with-body --silent --show-error "$base/review/1"
capture deletereview curl --fail-with-body --silent --show-error -X DELETE "$base/customer/auth/review/1" -b cookies.txt
capture deletereview curl --fail-with-body --silent --show-error "$base/review/1"
BOOKSTORE_URL="$base" node "$project_dir/router/general.js" > "$evidence_dir/axios-demo.json"
node - "$evidence_dir" <<'JS'
const fs = require('node:fs');
const path = require('node:path');
for (const name of ['githubrepo', 'getallbooks', 'getbooksbyISBN', 'getbooksbyauthor', 'getbooksbytitle', 'getbookreview', 'register', 'login', 'reviewadded', 'deletereview']) {
  const file = path.join(process.argv[2], name);
  fs.writeFileSync(file, fs.readFileSync(file, 'utf8').trimEnd() + '\n');
}
JS
printf 'Saved verified cURL evidence to %s\n' "$evidence_dir"
