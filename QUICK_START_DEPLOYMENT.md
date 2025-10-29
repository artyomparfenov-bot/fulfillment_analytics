# Quick Start: Deploy to Timeweb Cloud in 5 Minutes

This is a quick reference guide. For detailed information, see [DEPLOYMENT.md](./DEPLOYMENT.md) and [ENV_SETUP.md](./ENV_SETUP.md).

## Prerequisites

- Timeweb Cloud account
- MySQL database (Timeweb managed or external)
- GitHub account (code already pushed)
- 10 minutes of time

## 5-Minute Deployment

### Step 1: Prepare Environment Variables (2 min)

Generate a secure JWT secret:
```bash
openssl rand -hex 32
# Output: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6 (save this)
```

### Step 2: Create Timeweb Cloud Project (1 min)

1. Log in to [Timeweb Cloud](https://timeweb.cloud)
2. Click "Create Project"
3. Select **Node.js** runtime (v20+ recommended)
4. Name: `fulfillment-analytics`
5. Click "Create"

### Step 3: Configure Environment Variables (1 min)

In Timeweb Cloud project settings, add these variables:

```
DATABASE_URL=mysql://user:password@host:3306/dbname
JWT_SECRET=[your-generated-secret-from-step-1]
VITE_OAUTH_PORTAL_URL=https://your-oauth-provider.com
OAUTH_SERVER_URL=https://your-oauth-backend.com
VITE_APP_ID=your-app-id
VITE_APP_TITLE=Fulfillment Analytics
VITE_APP_LOGO=https://your-domain.com/logo.png
OWNER_NAME=Admin
OWNER_OPEN_ID=your-owner-id
NODE_ENV=production
PORT=3000
```

### Step 4: Connect GitHub Repository (1 min)

1. In Timeweb project settings
2. Click "Connect GitHub"
3. Select `artyomparfenov-bot/fulfillment_analytics`
4. Select branch: `main`
5. Click "Connect"

### Step 5: Deploy (automatic)

Timeweb will automatically:
1. Clone repository
2. Install dependencies
3. Build frontend: `npm run build:frontend`
4. Create 200.html fallback
5. Deploy to production

**Deployment takes 2-5 minutes**

## Verify Deployment

After deployment completes:

```bash
# Test frontend
curl https://your-domain.com/

# Test SPA routing
curl https://your-domain.com/alerts
curl https://your-domain.com/partners

# Check 200.html exists
curl https://your-domain.com/200.html
```

## What Gets Deployed

```
dist/public/
├── index.html          (main app)
├── 200.html            (SPA fallback)
├── css/                (styles)
├── js/                 (JavaScript)
├── images/             (assets)
└── fonts/              (typography)
```

## Common Issues

### Routes return 404
- **Cause:** 200.html fallback not configured
- **Fix:** Verify 200.html exists in dist/public/
- **Check:** `ls -la dist/public/200.html`

### Database connection fails
- **Cause:** DATABASE_URL is incorrect
- **Fix:** Verify credentials and host
- **Test:** `mysql -u user -p -h host -D dbname`

### OAuth login fails
- **Cause:** OAuth URLs are incorrect
- **Fix:** Update VITE_OAUTH_PORTAL_URL and OAUTH_SERVER_URL
- **Test:** Visit OAuth provider's login page

### App is slow
- **Cause:** Large bundle size
- **Fix:** This is normal (1.09 MB → 290 KB gzipped)
- **Monitor:** Check React Query caching is working

## Build Configuration

The project uses these build commands:

```bash
# Frontend only (SPA)
npm run build:frontend

# Full stack (frontend + backend)
npm run build

# Start production server
npm run start
```

## File Structure

```
fulfillment_analytics/
├── client/                 # Frontend (React)
│   ├── src/
│   │   ├── pages/         # Page components
│   │   ├── components/    # UI components
│   │   ├── lib/           # Utilities
│   │   └── App.tsx        # Main app
│   └── public/
│       └── data_merged.csv # Analytics data (52 MB)
├── server/                 # Backend (Express)
│   ├── routers.ts         # tRPC procedures
│   └── db.ts              # Database queries
├── drizzle/               # Database schema
│   └── schema.ts
├── dist/                  # Build output
│   └── public/            # Frontend build
├── DEPLOYMENT.md          # Detailed guide
├── ENV_SETUP.md          # Environment variables
└── package.json          # Dependencies
```

## Next Steps

1. **Monitor deployment** in Timeweb dashboard
2. **Test all routes** after deployment
3. **Check logs** for any errors
4. **Set up backups** for database
5. **Configure monitoring** for uptime

## Support

- **Detailed guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Environment variables:** See [ENV_SETUP.md](./ENV_SETUP.md)
- **GitHub:** https://github.com/artyomparfenov-bot/fulfillment_analytics
- **Timeweb docs:** https://timeweb.cloud/docs

## Deployment Checklist

- [ ] Timeweb Cloud account created
- [ ] MySQL database provisioned
- [ ] Environment variables configured
- [ ] GitHub repository connected
- [ ] Deployment started
- [ ] Frontend loads without errors
- [ ] SPA routing works (test /alerts, /partners)
- [ ] Database connection successful
- [ ] Backups configured

---

**Estimated Time:** 5-10 minutes  
**Last Updated:** October 29, 2025

