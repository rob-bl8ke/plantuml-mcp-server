# NPM Installation

## Option 1 — User-level MCP config (simplest, no publishing required)

VS Code supports a **user-level** MCP config file that applies to **all workspaces**, separate from the per-workspace mcp.json.

Location:
```
%APPDATA%\Code\User\mcp.json
```

Move your server registration there:

```powershell
code "$env:APPDATA\Code\User\mcp.json"
```

```json
{
  "servers": {
    "plantuml-mcp": {
      "type": "stdio",
      "command": "node",
      "args": ["C:/Code/rob-bl8ke/plantuml-mcp/mcp-server/index.js"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}",
        "GITHUB_MODEL": "gpt-4o-mini",
        "ENCODER_URL": "http://localhost:9091",
        "PLANTUML_BASE_URL": "http://localhost:9090/plantuml"
      }
    }
  }
}
```

Note the path is now **absolute** — the `${workspaceFolder}` variable is not available at user level. The server lives in one place on disk and every workspace can use it.

**Pros:** Simplest. No publishing. Works immediately.
**Cons:** Hardcoded absolute path — breaks if you move the repo or share the config with another developer.

---

## Option 2 — Publish to npm (most portable)

Publish mcp-server as a package to npm (public or private). Then any workspace registers it by package name — no file paths involved.

Add a `bin` entry to package.json:

````json
{
  // ...existing code...
  "bin": {
    "plantuml-mcp": "./index.js"
  }
}
````

After publishing, install globally:

```powershell
# PowerShell
npm install -g plantuml-mcp
```
```bash
# Bash
npm install -g plantuml-mcp
```

Any workspace's mcp.json then becomes path-free:

```json
{
  "servers": {
    "plantuml-mcp": {
      "type": "stdio",
      "command": "plantuml-mcp",
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}",
        "GITHUB_MODEL": "gpt-4o-mini",
        "ENCODER_URL": "http://localhost:9091",
        "PLANTUML_BASE_URL": "http://localhost:9090/plantuml"
      }
    }
  }
}
```

**Pros:** Truly portable — any developer installs the package and it works. Version controlled via npm. Can be shared publicly or privately.
**Cons:** Requires publishing. Global install needed on each machine.

---

## Option 3 — `npx` without installing (best balance)

Use `npx` to run the package directly without a global install. This works with either a published npm package or a local path:

**With a published package:**
```json
{
  "servers": {
    "plantuml-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["plantuml-mcp"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

**With a local path (before publishing):**
```json
{
  "servers": {
    "plantuml-mcp": {
      "type": "stdio",
      "command": "npx",
      "args": ["--yes", "file:C:/Code/rob-bl8ke/plantuml-mcp/mcp-server"],
      "env": {
        "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
      }
    }
  }
}
```

**Pros:** No global install needed. Easy to version pin (`npx plantuml-mcp@1.0.0`). Works in CI too.
**Cons:** Slower cold start — `npx` checks for updates on first run.

---

## Recommendation

| Option | Best for |
|---|---|
| **User-level mcp.json** | Just you, on one machine, right now |
| **npm publish + global install** | Sharing with a team or making it public |
| **`npx`** | Sharing with a team without requiring a global install |

**For now:** Use **Option 1** (user-level config) to unblock yourself immediately. When the server is stable and you want to share it, move to **Option 2/3** by publishing to npm and updating the user-level config to use `npx plantuml-mcp`.

# Docker Installation

Yes, there is. You can containerize the MCP server and run it as a Docker container. However there is an important constraint to understand first:

**stdio MCP servers communicate over stdin/stdout**, not HTTP. This means the MCP client (VS Code) needs to be able to pipe directly into the process. Docker does support this via `docker run` with no detach flag (`-i` for interactive stdin).

The mcp.json would look like this:

```json
{
  "servers": {
    "plantuml-mcp": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "--network", "host",
        "-e", "GITHUB_TOKEN=${env:GITHUB_TOKEN}",
        "-e", "GITHUB_MODEL=gpt-4o-mini",
        "-e", "ENCODER_URL=http://localhost:9091",
        "-e", "PLANTUML_BASE_URL=http://localhost:9090/plantuml",
        "plantuml-mcp:latest"
      ]
    }
  }
}
```

`--network host` is needed so the container can reach the encoder service on `localhost:9091`.

---

## What you'd need to add

**A `Dockerfile` in mcp-server:**

````dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package.json .
RUN npm install --production

COPY . .

ENTRYPOINT ["node", "index.js"]
````

**Build the image:**

```powershell
# PowerShell
docker build -t plantuml-mcp:latest ./mcp-server
```
```bash
# Bash
docker build -t plantuml-mcp:latest ./mcp-server
```

---

## How it compares to the other options

| Option | Path coupling | Requires publish | Portable | Cold start |
|---|---|---|---|---|
| User-level mcp.json | ✅ Absolute path | ❌ No | ❌ One machine | Fast |
| npm global install | ❌ None | ✅ Yes | ✅ Any machine | Fast |
| `npx` | ❌ None | ✅ Yes | ✅ Any machine | Slow |
| **Docker** | ❌ None | ❌ No (just share image) | ✅ Any machine with Docker | Medium |

---

## Key caveat — `--network host` on Windows/macOS

`--network host` **only works on Linux**. On Windows and macOS, Docker runs inside a Linux VM, so `host` networking doesn't bridge to the Windows/macOS `localhost`.

On Windows/macOS you'd need to replace `localhost` with the Docker host gateway:

```json
"-e", "ENCODER_URL=http://host.docker.internal:9091",
"-e", "PLANTUML_BASE_URL=http://host.docker.internal:9090/plantuml",
```

And drop `--network host`:

```json
{
  "servers": {
    "plantuml-mcp": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run", "--rm", "-i",
        "-e", "GITHUB_TOKEN=${env:GITHUB_TOKEN}",
        "-e", "GITHUB_MODEL=gpt-4o-mini",
        "-e", "ENCODER_URL=http://host.docker.internal:9091",
        "-e", "PLANTUML_BASE_URL=http://host.docker.internal:9090/plantuml",
        "plantuml-mcp:latest"
      ]
    }
  }
}
```

---

## Recommendation

The Docker option is a good fit **if** you want to share the server with a team without requiring them to have Node.js installed — they only need Docker. For a single developer on one machine, the user-level mcp.json (Option 1 from before) is still the simplest path.