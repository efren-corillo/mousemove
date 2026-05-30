# Branch Protection Configuration Log - 2026-05-14

## Attempt 1: Command Flags (Failed - Type Mismatch)

### Command
```bash
gh api repos/:owner/:repo/branches/master/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  -f "required_status_checks[strict]=true" \
  -f "required_status_checks[contexts][]=build" \
  -f "enforce_admins=false" \
  -f "required_pull_request_reviews[required_approving_review_count]=0" \
  -f "required_pull_request_reviews[dismiss_stale_reviews]=true" \
  -f "restrictions=null"
```

### Output
```text
{
  "message": "Invalid request.\n\nNo subschema in \"anyOf\" matched.\n...
  For 'properties/strict', \"true\" is not a boolean.\n
  For 'properties/required_approving_review_count', \"0\" is not an integer.\n
  ...
  "status": "422"
}
```

---

## Attempt 2: JSON Heredoc (Failed - Shell Syntax)

### Command
```bash
gh api repos/:owner/:repo/branches/master/protection \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  --input - <<EOF
{
  "required_status_checks": { "strict": true, "contexts": ["build"] },
  "enforce_admins": false,
  "required_pull_request_reviews": { "dismiss_stale_reviews": true, "required_approving_review_count": 0 },
  "restrictions": null
}
EOF
&& \
gh api repos/:owner/:repo/branches/develop/protection ...
```

### Output
```text
/usr/bin/bash: -c: line 19: syntax error near unexpected token `&&'
/usr/bin/bash: -c: line 19: `&& \'
```

---

## Attempt 3: Final Successful Configuration

### Command
```bash
gh api repos/:owner/:repo/branches/master/protection --method PUT -H "Accept: application/vnd.github+json" --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 0
  },
  "restrictions": null
}
EOF

gh api repos/:owner/:repo/branches/develop/protection --method PUT -H "Accept: application/vnd.github+json" --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ["build"]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 0
  },
  "restrictions": null
}
EOF
```

### Output (Master)
```json
{
  "url": "https://api.github.com/repos/efren-corillo/mousemove/branches/master/protection",
  "required_status_checks": {
    "strict": true,
    "contexts": ["build"]
  },
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 0
  },
  "enforce_admins": { "enabled": false },
  "allow_force_pushes": { "enabled": false },
  "allow_deletions": { "enabled": false }
}
```

### Output (Develop)
```json
{
  "url": "https://api.github.com/repos/efren-corillo/mousemove/branches/develop/protection",
  "required_status_checks": {
    "strict": true,
    "contexts": ["build"]
  },
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "required_approving_review_count": 0
  },
  "enforce_admins": { "enabled": false },
  "allow_force_pushes": { "enabled": false },
  "allow_deletions": { "enabled": false }
}
```
