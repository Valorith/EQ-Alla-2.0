<img width="1650" height="654" alt="image" src="https://github.com/user-attachments/assets/6f2d678a-ea3c-40ff-a2c9-b68b228354b5" />

<img width="1668" height="801" alt="image" src="https://github.com/user-attachments/assets/f64de775-d764-462e-bb42-802863f23d4a" />

<img width="1643" height="843" alt="image" src="https://github.com/user-attachments/assets/29c561d7-e4d6-4d11-812b-c8a33071f77d" />

<img width="1660" height="838" alt="image" src="https://github.com/user-attachments/assets/c7970b09-4028-4905-8f94-850942a8e0ee" />

<img width="1327" height="821" alt="image" src="https://github.com/user-attachments/assets/56eea33f-228e-4601-aa5b-797056cdf8d0" />


# EQ Alla 2.0

Modern EverQuest encyclopedia scaffold built as a monorepo around `Next.js 15`, `React 19`, `TypeScript`, `Tailwind CSS v4`, and shared data/UI packages.

## What is implemented

- A runnable monorepo with `apps/web`, `packages/data`, and `packages/ui`
- Modern responsive catalog UI with clean routes for the major Alla sections
- Legacy route compatibility for the old `?a=` query model and `task.php` / `spawngroup.php`
- Internal API routes for search and entity listings
- MySQL connectivity and schema-capability health checks for an EQEmu-style mirror
- Redis-backed cache abstraction with in-memory fallback
- Docker, Caddy, Vitest, and Playwright scaffolding

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Environment

Copy `.env.example` to `.env` and change values as needed:

```bash
cp .env.example .env
```

Required:

- `EQ_SITE_URL`: full public URL such as `https://eqalla.example.com`
- `EQ_SITE_HOST`: bare host/domain for Caddy, such as `eqalla.example.com`
- `EQ_DB_HOST`
- `EQ_DB_PORT`
- `EQ_DB_NAME`
- `EQ_DB_USER`
- `EQ_DB_PASSWORD`

Optional:

- `EQ_REDIS_URL`: defaults cleanly to the bundled Redis service when you use Docker Compose

The app is configured for live database-backed operation. `EQ_USE_MOCK_DATA` should remain `false`.

## Internet Hosting

EQ Alla 2.0 can be hosted in two straightforward ways:

- Docker: recommended if you want the app, Redis, and Caddy bundled together
- Non-Docker: recommended if you already manage Node.js processes and your own reverse proxy
- Windows launcher package: recommended if you want a folder with `EQ-Alla-2.0-Server.exe` that starts the server in a visible console window

### Before you start

Make sure you have:

- a reachable MySQL database with the EQEmu-style schema
- a public DNS record pointed at your server
- a completed `.env` file based on `.env.example`

Minimum `.env` values:

```env
EQ_USE_MOCK_DATA=false
EQ_SITE_URL=https://eqalla.example.com
EQ_SITE_HOST=eqalla.example.com
EQ_DB_HOST=127.0.0.1
EQ_DB_PORT=3306
EQ_DB_NAME=peq
EQ_DB_USER=app_user
EQ_DB_PASSWORD=change-me
EQ_REDIS_URL=redis://redis:6379
```

If you are not using Docker, set `EQ_REDIS_URL` to your own Redis instance or leave it unset to fall back to in-memory caching.

### Host with Docker

This path uses:

- `web`: Next.js app
- `redis`: cache service
- `caddy`: public web server and TLS terminator

1. Copy the environment template and update it for your server:

```bash
cp .env.example .env
```

2. Start the production stack:

```bash
npm run compose:up
```

3. Watch the startup logs:

```bash
npm run compose:logs
```

4. Confirm your DNS points to the server and that ports `80` and `443` are open.

5. Stop the stack when needed:

```bash
npm run compose:down
```

Notes:

- Caddy reads `EQ_SITE_HOST` from `.env`
- changing domains is just an `.env` update plus a restart
- HTTPS is handled by Caddy automatically once the domain resolves publicly

### Host without Docker

This path runs the built Next.js app directly on the server. You provide the reverse proxy yourself.

1. Copy the environment template and update it for your server:

```bash
cp .env.example .env
```

2. Install dependencies:

```bash
npm install
```

3. Build the app:

```bash
npm run build
```

4. Start the production server on the port you want to expose internally:

```bash
PORT=3000 npm run start
```

Or build and start in one step:

```bash
PORT=3000 npm run serve
```

5. Put a reverse proxy in front of the app and forward traffic to that local port.

Example Caddy config for a non-Docker host:

```caddy
eqalla.example.com {
  encode gzip zstd
  reverse_proxy 127.0.0.1:3000
}
```

### Build a Windows `.exe` launcher package

This path creates a distributable Windows server folder. The packaged folder includes:

- `runtime/`: the bundled Next.js standalone server
- `.env.example`: a template users can copy to `.env`
- `EQ-Alla-2.0-Server.exe`: a launcher that opens a console window and runs the server

The launcher reads `.env.local`, `.env`, `env.local`, or `env` from the same folder as the `.exe`, then starts the server on `0.0.0.0` using `PORT` or `EQ_PORT` if provided.

1. Build the package:

```bash
npm run package:windows
```

2. If you are already on Windows, the command will generate:

```text
dist/windows-server/EQ-Alla-2.0-Server.exe
```

3. If you run the command on macOS or Linux, it will still assemble the portable runtime package, but you must run the same command once on a Windows machine to generate the native `.exe`.

You can also let GitHub Actions build the Windows package for you automatically. Every push to `main`, plus any manual run from the Actions tab, triggers the `Build Windows Server Package` workflow and uploads `dist/windows-server` as a downloadable artifact.

4. In the packaged folder:

- copy `.env.example` to `.env`
- fill in the database and site values
- run `EQ-Alla-2.0-Server.exe`

5. Put a reverse proxy such as Caddy, IIS, or nginx in front of the local port if you want public HTTPS traffic.

Notes:

- the Windows launcher keeps the console window open while the server is running
- by default it serves on `http://0.0.0.0:3000`
- you can override the port with `PORT=8080` or `EQ_PORT=8080` in the env file
- the packaged runtime is built from Next.js `standalone` output, so it does not require Docker for deployment

### Operational Notes

- Keep `.env` on the server only. It is ignored by git.
- If the public domain changes, update both `EQ_SITE_HOST` and `EQ_SITE_URL`.
- If you run without Docker, use a process manager such as `systemd`, `pm2`, or `supervisor` so the app restarts automatically.
- If you run without Docker and do not provide Redis, the app will still run with in-memory cache fallback.
