
## 1. Create and Add Your GitHub Token

### Why?
The MCP server’s `spec_to_diagrams` tool needs a GitHub token to access the GitHub Models API for diagram generation.

### How to Create a Token

1. Go to [https://github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Give it a name (e.g. `plantuml-mcp`)
4. **No scopes needed** — leave all checkboxes unticked
5. Click **Generate token** and copy it

---

### How to Add Your Token to the Environment

#### **Windows**

**PowerShell (persistent for all new sessions):**
```powershell
[System.Environment]::SetEnvironmentVariable('GITHUB_TOKEN', 'ghp_xxxxxxxxxxxx', 'User')
```

**PowerShell (current session only):**
```powershell
$env:GITHUB_TOKEN = 'ghp_xxxxxxxxxxxx'
```

**Bash (current session only):**
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

#### **macOS/Linux**

**Bash (persistent for all new sessions):**
Add this line to your `~/.bash_profile`, `~/.bashrc`, or `~/.zshrc`:
```bash
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```
Then reload your shell:
```bash
source ~/.bash_profile   # or ~/.bashrc or ~/.zshrc
```

---

### Why Doesn’t `echo $env:GITHUB_TOKEN` Show Up Immediately?

- On Windows, setting the variable with PowerShell’s `SetEnvironmentVariable` writes it to the registry, but **existing terminals and apps won’t see it until you log out and back in** (or restart your machine).
- Only **new processes** after the restart will see the updated environment.
- Setting it in the current session (`$env:GITHUB_TOKEN = ...` or `export GITHUB_TOKEN=...`) works immediately, but only for that terminal.

---

## 2. Check That the MCP Server Is Registered and Callable

### **VS Code MCP Registration**

- The MCP server should be registered in mcp.json in your project folder.
- Example entry:
    ```json
    {
      "servers": [
        {
          "id": "plantuml-mcp",
          "entry": "mcp-server/index.js",
          "env": {
            "GITHUB_TOKEN": "${env:GITHUB_TOKEN}"
          }
        }
      ]
    }
    ```

### **Verify Registration**

**PowerShell:**
```powershell
Get-Content .vscode\mcp.json
```

**Bash:**
```bash
cat .vscode/mcp.json
```

Check that your server appears in the list.

---

### **Check That the Server Is Running**

**PowerShell:**
```powershell
Get-Process code | Select-Object Id, MainWindowTitle
```

**Bash:**
```bash
ps aux | grep code
```

---

### **Test MCP Server Tool Availability in VS Code**

1. Open Copilot Chat (or your MCP-compatible chat agent)
2. Type `#` or `/` to see available tools
3. Confirm that `encode_plantuml` and `spec_to_diagrams` are listed

---

### **Test a Tool Call**

**PowerShell:**
```powershell
curl -X POST http://localhost:9091/encode -H "Content-Type: text/plain" -d "@startuml
actor User
User -> System: Login
@enduml"
```

**Bash:**
```bash
curl -X POST http://localhost:9091/encode -H "Content-Type: text/plain" -d "@startuml
actor User
User -> System: Login
@enduml"
```

You should get a JSON response with an encoded diagram URL.

---

## Summary Table

| Step | Windows | Mac/Linux |
|---|---|---|
| Set token (persistent) | `[System.Environment]::SetEnvironmentVariable('GITHUB_TOKEN', 'ghp_xxx', 'User')` then restart | `export GITHUB_TOKEN=ghp_xxx` in `~/.bash_profile` then `source ~/.bash_profile` |
| Set token (session) | `$env:GITHUB_TOKEN = 'ghp_xxx'` | `export GITHUB_TOKEN=ghp_xxx` |
| Check token | `echo $env:GITHUB_TOKEN` | `echo $GITHUB_TOKEN` |
| Register MCP server | Edit mcp.json | Edit mcp.json |
| Verify registration | `Get-Content .vscode\mcp.json` | `cat .vscode/mcp.json` |
| Test server | Use Copilot Chat, type `#` | Use Copilot Chat, type `#` |

---

**Tip:** If you set the token persistently, always restart VS Code (and ideally log out/in) to ensure the environment is refreshed.