# Environment Variables Setup Guide

This guide explains how to configure environment variables for the Fulfillment Analytics system in different environments.

## Quick Start

### Local Development

1. Create `.env` file in project root:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your local settings:
   ```bash
   # Database (local or remote)
   DATABASE_URL=mysql://root:password@localhost:3306/fulfillment_analytics
   
   # JWT Secret (any random string for development)
   JWT_SECRET=dev-secret-key-change-in-production
   
   # OAuth (use test credentials)
   VITE_OAUTH_PORTAL_URL=https://dev.oauth.example.com
   OAUTH_SERVER_URL=https://dev-api.oauth.example.com
   VITE_APP_ID=dev-app-id
   
   # Application
   VITE_APP_TITLE="Fulfillment Analytics (Dev)"
   VITE_APP_LOGO="https://placehold.co/40x40/3b82f6/ffffff?text=FA"
   OWNER_NAME=Developer
   OWNER_OPEN_ID=dev-owner-id
   
   # Server
   NODE_ENV=development
   PORT=3000
   ```

3. Start development server:
   ```bash
   npm run dev
   ```

### Production (Timeweb Cloud)

1. **Create `.env.production` file** (don't commit to Git):
   ```bash
   # Database (Timeweb managed or external)
   DATABASE_URL=mysql://user:password@db.timeweb.com:3306/fulfillment_analytics
   
   # JWT Secret (generate with: openssl rand -hex 32)
   JWT_SECRET=your-secure-random-string-here
   
   # OAuth (production credentials)
   VITE_OAUTH_PORTAL_URL=https://oauth.yourdomain.com
   OAUTH_SERVER_URL=https://api.oauth.yourdomain.com
   VITE_APP_ID=prod-app-id
   
   # Application
   VITE_APP_TITLE="Fulfillment Analytics"
   VITE_APP_LOGO="https://yourdomain.com/logo.png"
   OWNER_NAME=Admin
   OWNER_OPEN_ID=prod-owner-id
   
   # Server
   NODE_ENV=production
   PORT=3000
   
   # Manus APIs (if using)
   BUILT_IN_FORGE_API_URL=https://api.manus.im
   BUILT_IN_FORGE_API_KEY=your-api-key
   ```

2. **Configure in Timeweb Cloud:**
   - Go to project settings
   - Navigate to Environment Variables
   - Add each variable from `.env.production`
   - **Do not commit .env.production to Git**

## Environment Variables Reference

### Database Configuration

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `DATABASE_URL` | MySQL connection string | `mysql://user:pass@host:3306/db` | ✅ Yes |

**Format:** `mysql://[user]:[password]@[host]:[port]/[database]`

**Examples:**
- Local: `mysql://root:password@localhost:3306/fulfillment_analytics`
- Timeweb: `mysql://user123:securepass@db.timeweb.com:3306/analytics_db`
- AWS RDS: `mysql://admin:password@analytics.c9akciq32.us-east-1.rds.amazonaws.com:3306/analytics`

### Authentication Configuration

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `JWT_SECRET` | Session signing secret | 32+ random characters | ✅ Yes |
| `VITE_OAUTH_PORTAL_URL` | OAuth login portal | `https://oauth.example.com` | ✅ Yes |
| `OAUTH_SERVER_URL` | OAuth backend API | `https://api.oauth.example.com` | ✅ Yes |
| `VITE_APP_ID` | OAuth application ID | `app-12345` | ✅ Yes |
| `OWNER_OPEN_ID` | Owner's OAuth ID | `owner-uuid` | ✅ Yes |
| `OWNER_NAME` | Owner's display name | `Admin` | ✅ Yes |

**JWT_SECRET Generation:**
```bash
# Generate secure random string
openssl rand -hex 32

# Output example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

### Application Configuration

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `VITE_APP_TITLE` | App name in UI | `Fulfillment Analytics` | ✅ Yes |
| `VITE_APP_LOGO` | Logo URL | `https://example.com/logo.png` | ✅ Yes |
| `NODE_ENV` | Environment | `production` or `development` | ✅ Yes |
| `PORT` | Server port | `3000` | ✅ Yes |

### Optional: Manus Built-in APIs

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `BUILT_IN_FORGE_API_URL` | Manus API base URL | `https://api.manus.im` | ❌ No |
| `BUILT_IN_FORGE_API_KEY` | Manus API key | `key-xxx` | ❌ No |

### Optional: Analytics

| Variable | Purpose | Example | Required |
|----------|---------|---------|----------|
| `VITE_ANALYTICS_ENDPOINT` | Analytics service URL | `https://analytics.example.com` | ❌ No |
| `VITE_ANALYTICS_WEBSITE_ID` | Analytics website ID | `site-123` | ❌ No |

## Environment-Specific Configurations

### Development Environment

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=mysql://root:password@localhost:3306/fulfillment_analytics
JWT_SECRET=dev-key-not-secure
VITE_OAUTH_PORTAL_URL=http://localhost:8080
OAUTH_SERVER_URL=http://localhost:8081
VITE_APP_ID=dev-app
VITE_APP_TITLE="Fulfillment Analytics (Dev)"
VITE_APP_LOGO=https://placehold.co/40x40
OWNER_NAME=Developer
OWNER_OPEN_ID=dev-owner
```

### Staging Environment

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://staging_user:staging_pass@staging-db.example.com:3306/analytics
JWT_SECRET=$(openssl rand -hex 32)
VITE_OAUTH_PORTAL_URL=https://staging-oauth.example.com
OAUTH_SERVER_URL=https://staging-api.example.com
VITE_APP_ID=staging-app
VITE_APP_TITLE="Fulfillment Analytics (Staging)"
VITE_APP_LOGO=https://staging.example.com/logo.png
OWNER_NAME=Admin
OWNER_OPEN_ID=staging-owner-uuid
```

### Production Environment

```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=mysql://prod_user:prod_secure_pass@prod-db.timeweb.com:3306/analytics
JWT_SECRET=$(openssl rand -hex 32)  # Use secure random value
VITE_OAUTH_PORTAL_URL=https://oauth.yourdomain.com
OAUTH_SERVER_URL=https://api.oauth.yourdomain.com
VITE_APP_ID=prod-app-id
VITE_APP_TITLE="Fulfillment Analytics"
VITE_APP_LOGO=https://yourdomain.com/logo.png
OWNER_NAME=Admin
OWNER_OPEN_ID=prod-owner-uuid
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-production-key
```

## Timeweb Cloud Setup

### Step-by-Step Configuration

1. **Create Project:**
   - Log in to Timeweb Cloud
   - Create new Node.js project
   - Select Node.js v20+ runtime

2. **Add Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Click "Add Variable" for each required variable
   - Paste values from `.env.production`

3. **Configure Database:**
   - Option A: Use Timeweb's managed MySQL
   - Option B: Use external database (AWS RDS, etc.)
   - Update DATABASE_URL accordingly

4. **Deploy:**
   - Push code to GitHub
   - Timeweb will automatically build and deploy
   - Monitor logs for errors

### Timeweb Environment Variables Panel

```
DATABASE_URL: mysql://user:pass@db.timeweb.com:3306/analytics
JWT_SECRET: [32-character random string]
VITE_OAUTH_PORTAL_URL: https://oauth.yourdomain.com
OAUTH_SERVER_URL: https://api.oauth.yourdomain.com
VITE_APP_ID: prod-app-id
VITE_APP_TITLE: Fulfillment Analytics
VITE_APP_LOGO: https://yourdomain.com/logo.png
OWNER_NAME: Admin
OWNER_OPEN_ID: [owner-uuid]
NODE_ENV: production
PORT: 3000
```

## Security Best Practices

### Do's ✅

- ✅ Use strong, random values for JWT_SECRET
- ✅ Store .env files locally only (never commit)
- ✅ Use Timeweb's environment variable management
- ✅ Rotate secrets periodically
- ✅ Use HTTPS for all OAuth URLs
- ✅ Keep API keys private
- ✅ Use different credentials for each environment

### Don'ts ❌

- ❌ Don't commit .env files to Git
- ❌ Don't use same JWT_SECRET in multiple environments
- ❌ Don't share environment variables in chat/email
- ❌ Don't use weak passwords for database
- ❌ Don't expose API keys in frontend code
- ❌ Don't use HTTP for production OAuth URLs
- ❌ Don't reuse credentials across environments

## Troubleshooting

### "Cannot connect to database"

**Problem:** Application can't connect to MySQL  
**Solutions:**
1. Verify DATABASE_URL format is correct
2. Check database server is running
3. Verify credentials are correct
4. Ensure firewall allows connection
5. Check database user has required permissions

### "JWT verification failed"

**Problem:** Session authentication fails  
**Solutions:**
1. Verify JWT_SECRET is set and consistent
2. Check JWT_SECRET hasn't changed
3. Clear browser cookies and retry
4. Verify NODE_ENV is set correctly

### "OAuth login fails"

**Problem:** Can't log in with OAuth  
**Solutions:**
1. Verify VITE_OAUTH_PORTAL_URL is correct
2. Check OAUTH_SERVER_URL is accessible
3. Verify VITE_APP_ID matches OAuth provider
4. Check OAuth provider allows your domain
5. Verify HTTPS is enabled

### "App title/logo not updating"

**Problem:** VITE_* variables not reflected in UI  
**Solutions:**
1. Rebuild frontend: `npm run build:frontend`
2. Clear browser cache
3. Check variables are set in environment
4. Verify variables are used in code

## Variable Validation

Before deploying, validate all variables:

```bash
# Check all required variables are set
required_vars=(
  "DATABASE_URL"
  "JWT_SECRET"
  "VITE_OAUTH_PORTAL_URL"
  "OAUTH_SERVER_URL"
  "VITE_APP_ID"
  "VITE_APP_TITLE"
  "VITE_APP_LOGO"
  "OWNER_NAME"
  "OWNER_OPEN_ID"
  "NODE_ENV"
  "PORT"
)

for var in "${required_vars[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ Missing: $var"
  else
    echo "✅ Set: $var"
  fi
done
```

## Updating Variables

### Local Development

1. Edit `.env` file
2. Restart dev server: `npm run dev`

### Production (Timeweb Cloud)

1. Go to Project Settings → Environment Variables
2. Click variable to edit
3. Update value
4. Save changes
5. Redeploy application
6. Monitor logs for errors

## References

- [Timeweb Cloud Documentation](https://timeweb.cloud/docs)
- [Node.js Environment Variables](https://nodejs.org/en/knowledge/file-system/how-to-use-the-fs-module/)
- [Express.js Configuration](https://expressjs.com/en/advanced/best-practice-security.html)
- [MySQL Connection Strings](https://dev.mysql.com/doc/connector-nodejs/en/connector-nodejs-connections-connection-options.html)

---

**Last Updated:** October 29, 2025  
**Maintained By:** Manus AI

