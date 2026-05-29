# @workspace-bootstrap

**Self-setup skill.** Run this skill in ANY new workspace or laptop to replicate the complete jasnaykel AI engineering environment automatically.

---

## What this skill sets up

### Global tools (install once per machine)
| Tool | Purpose | Install command |
|---|---|---|
| **Codegraph** | Pre-indexed code knowledge graph — fewer tokens, fewer tool calls | `npm i -g @colbymchenry/codegraph` |
| **Gentle-AI** | SDD workflows, persistent memory (Engram), multi-agent orchestration | `scoop install gentle-ai` (Windows) or `brew install gentle-ai` (Mac/Linux) |
| **Playwright** | Browser automation for QA tests | `npx playwright install chromium` (inside `qa-agent/`) |
| **Node.js 22+** | Required for Codegraph and qa-agent | https://nodejs.org |
| **Scoop** (Windows) | Package manager for Gentle-AI | `irm get.scoop.sh \| iex` |

### Project-level setup (run in each new workspace)
| Step | Command | Purpose |
|---|---|---|
| Install qa-agent deps | `cd qa-agent && npm install` | Playwright + TypeScript tooling |
| Init Codegraph | `codegraph init` | Create `.codegraph/` index directory |
| Index Codegraph | `codegraph index` | Build knowledge graph (271+ nodes) |
| Configure Gentle-AI | `gentle-ai` (interactive) | Wire SDD workflows to your agent |

---

## Bootstrap checklist for a new workspace

When opening a new project or laptop, run these checks IN ORDER:

### 1. Verify global tools
```powershell
node --version          # Must be 22+
codegraph --version     # Must be 0.9.7+
gentle-ai --version     # Must be 1.33+
```

### 2. Check skills directory
```
.github/
  copilot-instructions.md   ← master instructions file
  skills/
    brainstorming/           ← plan before coding
    grill-with-docs/         ← align agent with domain model
    spec-driven-development/ ← SDD lifecycle
    test-driven-development/ ← red-green-refactor
    systematic-debugging/    ← trace logs, consult base code
    debug-consultant/        ← Odoo 19 base code lookup
    security-auditor/        ← OWASP Top 10 checklist
    qa-validator/            ← Playwright test runner
    odoo-module-scaffold/    ← new module structure
    gentleman-programming/   ← clean architecture rules
    workspace-bootstrap/     ← this file (self-replication)
```
If any skill is missing, restore from the repo: `git pull origin feature/contac_review`

### 3. Check required root files
```
CONTEXT.md         ← shared language / glossary
ARCHITECTURE.md    ← module dependency graph
docs/
  specs/           ← spec files (.spec.md) per feature
  adr/             ← architecture decision records
```

### 4. Initialize Codegraph if missing
```powershell
Test-Path .codegraph   # False = needs init
codegraph init
codegraph index
```

### 5. Install qa-agent dependencies if missing
```powershell
cd qa-agent
npm install
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"; npx playwright install chromium
```

---

## Additional tools that elevate AI quality (optional but recommended)

| Tool | What it adds | Install |
|---|---|---|
| **Engram** (part of Gentle-AI) | Persistent memory across sessions — agent remembers past decisions | `engram tui` to browse memories |
| **spec-kit** (github/spec-kit) | Spec-Driven Development templates and GitHub integration | Use via `@spec-driven-development` skill |
| **andrej-karpathy skill** | Surgical minimal-change coding philosophy — reduces code bloat | Add from `antigravity-awesome-skills` catalog |
| **sonarqube** (VS Code extension) | Static analysis and security scanning on every save | Install from VS Code marketplace |
| **GitKraken MCP** | Git operations via natural language in the agent | Already configured in this workspace |
| **Pylance MCP** | Python type checking and refactoring inside the agent | Already configured in this workspace |

---

## Replication guide for another laptop (step by step)

```powershell
# 1. Clone the repo
git clone https://github.com/jasnaykel/sweet_cafe_odoo.git
cd sweet_cafe_odoo
git checkout feature/contac_review

# 2. Install global tools (Windows)
irm get.scoop.sh | iex
$env:PATH += ";$env:USERPROFILE\scoop\shims"
scoop bucket add gentleman https://github.com/Gentleman-Programming/scoop-bucket
scoop install gentle-ai
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npm i -g @colbymchenry/codegraph

# 3. Install project dependencies
cd qa-agent
npm install
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"
npx playwright install chromium
cd ..

# 4. Build Codegraph index
codegraph init
codegraph index

# 5. Verify
codegraph status     # Should show 271+ files
gentle-ai --version  # Should show 1.33+
```

---

## Skill invocation reference (all available skills)

| Skill | Invoke with | Use case |
|---|---|---|
| `@brainstorming` | "usa @brainstorming para planear..." | Before any implementation |
| `@grill-with-docs` | "usa @grill-with-docs antes de empezar" | Align agent with CONTEXT.md |
| `@spec-driven-development` | "aplica @spec-driven-development" | Full SDD lifecycle |
| `@test-driven-development` | "usa @test-driven-development" | TDD for Python modules |
| `@systematic-debugging` | "aplica @systematic-debugging" | Debug with hypothesis |
| `@debug-consultant` | "usa @debug-consultant" | Consult odoo-19.0/ base |
| `@security-auditor` | "revisa con @security-auditor" | OWASP review before merge |
| `@qa-validator` | "valida con @qa-validator" | Run Playwright tests |
| `@odoo-module-scaffold` | "crea módulo con @odoo-module-scaffold" | New Odoo 19 module |
| `@gentleman-programming` | "aplica @gentleman-programming" | Clean architecture review |
| `@workspace-bootstrap` | "ejecuta @workspace-bootstrap" | Setup new environment |
