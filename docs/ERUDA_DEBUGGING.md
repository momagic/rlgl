# Eruda Debugging Setup

This project includes Eruda for mobile debugging in production, controlled by environment variables.

## How to Enable Eruda in Production

### 1. Vercel Environment Variables

In your Vercel dashboard, add the following environment variable:

```
VITE_ENABLE_ERUDA=true
```

### 2. Local Development

For local development, create a `.env.local` file in the project root:

```bash
# .env.local
VITE_ENABLE_ERUDA=true
```

### 3. How It Works

- Eruda is loaded when the `VITE_ENABLE_ERUDA` environment variable is set to `true`
- It works in both development and production environments
- When enabled, Eruda will automatically initialize and show a floating debug button
- The debug tools include console, elements, network, resources, info, and more

### 4. Usage

Once enabled, you'll see a small floating button on your mobile device. Tap it to access:

- **Console**: View logs and execute JavaScript
- **Elements**: Inspect DOM elements
- **Network**: Monitor network requests
- **Resources**: View localStorage, sessionStorage, cookies
- **Info**: Device and browser information
- **Snippets**: Run custom JavaScript code

### 5. Security Note

- Eruda is only loaded when explicitly enabled via environment variables
- It's safe to leave the environment variable unset or set to `false` in production
- The debugging tools are only visible to users who know to look for them

### 6. Alternative Loading

You can also manually load Eruda from anywhere in your app:

```typescript
import { loadEruda } from './utils/eruda'

// Load Eruda programmatically
loadEruda().then(success => {
  if (success) {
    console.log('Eruda loaded successfully')
  }
})
```

## Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `VITE_ENABLE_ERUDA` | Enable Eruda debugging in production | `false` | No |
