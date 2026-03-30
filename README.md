<img width="1650" height="654" alt="image" src="https://github.com/user-attachments/assets/6f2d678a-ea3c-40ff-a2c9-b68b228354b5" />

<img width="1668" height="801" alt="image" src="https://github.com/user-attachments/assets/f64de775-d764-462e-bb42-802863f23d4a" />

<img width="1643" height="843" alt="image" src="https://github.com/user-attachments/assets/29c561d7-e4d6-4d11-812b-c8a33071f77d" />

<img width="1660" height="838" alt="image" src="https://github.com/user-attachments/assets/c7970b09-4028-4905-8f94-850942a8e0ee" />

<img width="1327" height="821" alt="image" src="https://github.com/user-attachments/assets/56eea33f-228e-4601-aa5b-797056cdf8d0" />

# EQ Alla 2.0

EQ Alla 2.0 is a live EverQuest encyclopedia built on top of an EQEmu-style MySQL database. It is a `Next.js 15` app with shared `data` and `ui` packages in a monorepo.

This README is focused on one thing: getting the app running and serving traffic correctly.

## What You Need

Before hosting the app, make sure you have:

- an EQEmu-style MySQL database the app can read from
- a server or machine that will run the app
- a domain or hostname if you want to expose it to the internet
- an env file with the correct database and site values

## Required Environment Values

Copy `.env.example` to `.env` and edit it:

```bash
cp .env.example .env
```

Minimum values:

```env
EQ_USE_MOCK_DATA=false
EQ_SITE_NAME=EQ Alla 2.0
EQ_SITE_URL=https://eqalla.example.com
EQ_SITE_HOST=eqalla.example.com

EQ_DB_HOST=127.0.0.1
EQ_DB_PORT=3306
EQ_DB_NAME=peq
EQ_DB_USER=app_user
EQ_DB_PASSWORD=change-me
```

Optional:

```env
EQ_REDIS_URL=redis://redis:6379
```

Notes:

- `EQ_USE_MOCK_DATA` should stay `false`
- `EQ_SITE_URL` should be the full public URL
- `EQ_SITE_HOST` should be the bare host/domain used by Caddy
- if you do not provide Redis outside Docker, the app will fall back to in-memory caching

## Choose a Hosting Path

There are four practical ways to run this app:

1. `.exe app`
This is the primary and easiest distribution path for Windows users.

2. `Docker`
Best if you want the app, Redis, and Caddy bundled together.

3. `Without Docker`
Best if you want a normal Node.js deployment with your own reverse proxy.

4. `CLI`
Best for local testing, admin use, or running the server manually from a terminal.

## Setup With `.exe` App

This is the recommended end-user deployment path.

What you get:

- `EQ-Alla-2.0-Server.exe`
- `runtime/`
- `.env.example`
- `README.txt`

Important:

- the `.exe` is a launcher, not the whole app by itself
- keep the entire extracted folder together
- users should extract the zip anywhere they want and run the `.exe` from there

### How to get the `.exe` package

You can get it in either of these ways:

1. From GitHub Actions
- Go to the `Actions` tab
- Open the latest successful `Build Windows Server Package` run
- Download the `eq-alla-windows-server-zip` artifact

2. From a GitHub Release
- Download the attached Windows zip from the release assets

### First run behavior

On first launch:

- if no `.env`, `env`, `.env.local`, or `env.local` file exists beside the `.exe`, the launcher will create `.env` automatically from the bundled example
- it will then stop and ask you to edit the file

### How to run it

1. Extract the zip anywhere.
2. Double-click `EQ-Alla-2.0-Server.exe`.
3. If `.env` was auto-created, edit it and fill in the real values.
4. Run `EQ-Alla-2.0-Server.exe` again.
5. The app will start in a visible console window.

Default local listener:

```text
http://0.0.0.0:3000
```

You can change the port by setting either of these in `.env`:

```env
PORT=8080
```

or

```env
EQ_PORT=8080
```

### To serve it to the internet

The `.exe` app still needs a reverse proxy in front of it if you want public HTTPS traffic.

Examples:

- Caddy
- IIS
- nginx

Example Caddy config:

```caddy
eqalla.example.com {
  encode gzip zstd
  reverse_proxy 127.0.0.1:3000
}
```

## Setup With Docker

Use this if you want a more turnkey server deployment.

This path starts:

- `web`: the Next.js app
- `redis`: cache service
- `caddy`: reverse proxy and TLS terminator

### How to run it

1. Create `.env` from the template.

```bash
cp .env.example .env
```

2. Edit the values in `.env`.

At minimum:

- `EQ_SITE_URL`
- `EQ_SITE_HOST`
- `EQ_DB_HOST`
- `EQ_DB_PORT`
- `EQ_DB_NAME`
- `EQ_DB_USER`
- `EQ_DB_PASSWORD`

3. Start the production stack.

```bash
npm run compose:up
```

4. Watch the logs.

```bash
npm run compose:logs
```

5. Make sure:

- your DNS points to this server
- ports `80` and `443` are open
- the DB host is reachable from inside Docker

6. Stop the stack when needed.

```bash
npm run compose:down
```

### Docker notes

- Caddy reads `EQ_SITE_HOST` from `.env`
- HTTPS is handled automatically by Caddy once the domain resolves publicly
- Redis is included in this path, so `EQ_REDIS_URL=redis://redis:6379` is fine

## Setup Without Docker

Use this if you want a standard Node.js deployment on a server you already manage.

This is the best fit when you already have:

- Node installed
- a process manager
- your own reverse proxy

### How to run it

1. Create `.env`.

```bash
cp .env.example .env
```

2. Install dependencies.

```bash
npm install
```

3. Build the app.

```bash
npm run build
```

4. Start the production server.

```bash
PORT=3000 npm run start
```

Or do both build and start in one step:

```bash
PORT=3000 npm run serve
```

5. Put a reverse proxy in front of the app.

Example Caddy config:

```caddy
eqalla.example.com {
  encode gzip zstd
  reverse_proxy 127.0.0.1:3000
}
```

### Non-Docker notes

- if you do not provide Redis, the app will still run with in-memory caching
- use a process manager such as `systemd`, `pm2`, or `supervisor`
- if the public domain changes, update both `EQ_SITE_HOST` and `EQ_SITE_URL`

## Setup With CLI

Use this when you want to run the app directly from a terminal.

This is mainly useful for:

- local development
- local production testing
- admin troubleshooting
- validating env/database connectivity before putting a reverse proxy in front

### Development mode

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

### Production mode from the CLI

```bash
cp .env.example .env
npm install
npm run build
PORT=3000 npm run start
```

This keeps the server attached to the terminal session. If you close the terminal, the app stops.

## Build the Windows Package Yourself

If you want to build the Windows package manually:

```bash
npm run package:windows
```

Behavior:

- on Windows, it builds the packaged runtime and generates `EQ-Alla-2.0-Server.exe`
- on macOS or Linux, it builds the portable runtime package and zip, but not the native Windows `.exe`

GitHub Actions already automates the Windows packaging workflow, so in most cases you should not need to do this manually.

## Internet Hosting Checklist

No matter which hosting path you choose, check these before going live:

- `.env` has the correct DB host, DB name, DB user, and DB password
- `EQ_SITE_URL` matches the real public URL
- `EQ_SITE_HOST` matches the domain used by your proxy
- your domain points at the correct server
- your reverse proxy forwards traffic to the app’s local port
- ports `80` and `443` are open if you are serving public HTTP/HTTPS

## Repo Commands

Helpful commands:

```bash
npm run dev
npm run build
npm run start
npm run serve
npm run compose:up
npm run compose:down
npm run compose:logs
npm run package:windows
```

## Notes

- `.env`, `env`, `.env.local`, and `env.local` are ignored by git
- this app expects live database-backed operation
- the Windows `.exe` path is the best user-facing distribution method, but Docker and direct Node hosting are both supported
