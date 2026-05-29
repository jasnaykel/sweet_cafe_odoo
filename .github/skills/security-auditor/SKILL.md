# @security-auditor

Security review skill for Odoo 19 modules. Based on OWASP Top 10.

## When to invoke

- Before merging any new controller or model
- When adding external API integrations
- When modifying access rules or security files

## Checklist

### Access Control (A01)
- [ ] `ir.model.access.csv` defines permissions for every new model
- [ ] `security/rules.xml` uses `domain_force` to restrict record-level access
- [ ] No `sudo()` used without explicit justification in comments

### Injection (A03)
- [ ] No raw SQL strings — use ORM or `self.env.cr.execute()` with parameterized queries only
- [ ] No `eval()` or `exec()` on user-controlled input
- [ ] XML views do not embed unsanitized user data

### Insecure Design (A04)
- [ ] Controllers use `@http.route(auth='user')` or `auth='public'` intentionally
- [ ] Sensitive operations require `auth='user'` minimum

### Security Misconfiguration (A05)
- [ ] No hardcoded credentials or API keys in Python files
- [ ] No debug routes left active in production controllers

### Cryptographic Failures (A02)
- [ ] Passwords never stored in plain text
- [ ] MLC/payment data never logged

## Workflow

1. Run this checklist on the changed files.
2. Report each finding with: file, line, risk level (High/Medium/Low), fix suggestion.
3. Block merge on any High finding.
