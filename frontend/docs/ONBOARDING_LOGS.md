# Onboarding logs (debugging)

Onboarding writes logs to **localStorage** so you can debug issues after a session.

## Where logs are stored

- **Key:** `ONBOARDING_LOGS`
- **Limit:** Last 500 entries, max ~100KB (old entries are dropped).

## How to view logs

### 1. In the browser console (on the onboarding page)

- **Get logs as array:**  
  `JSON.parse(localStorage.getItem('ONBOARDING_LOGS') || '[]')`

- **Copy logs as text (one line per entry):**  
  `copy(__ONBOARDING_LOGS_STRING__())`

- **Get raw log entries:**  
  `__ONBOARDING_LOGS__()`

### 2. Copy as text from console (any time)

```js
copy(JSON.parse(localStorage.getItem('ONBOARDING_LOGS')||'[]').map(e=>e.ts+' ['+e.level+'] '+e.message+(e.data?' '+JSON.stringify(e.data):'')).join('\n'))
```

### 3. Clear logs

```js
localStorage.removeItem('ONBOARDING_LOGS')
```

## What is logged

- Form mount and step changes
- Restore from localStorage/backend (success and failures)
- Submit start, validation failures, company name / security validation blocks
- API submit success/failure and errors
- Validation errors on Next (step and field paths)
- Error boundary errors

Use these logs to see where the flow stopped or what error occurred.
