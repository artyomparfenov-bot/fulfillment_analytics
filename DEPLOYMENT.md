# Fulfillment Analytics - Timeweb Cloud Deployment Guide

## Overview

This document provides step-by-step instructions for deploying the Fulfillment Analytics system to Timeweb Cloud. The application is a React-based SPA (Single Page Application) with a Node.js/Express backend for data processing and file uploads.

**Application Type:** Full-stack SPA with client-side routing  
**Frontend:** React 19 + TypeScript + Vite  
**Backend:** Express 4 + tRPC + MySQL  
**Deployment Target:** Timeweb Cloud  
**Data Size:** ~176,000 records (52 MB CSV)

---

## Architecture

### Frontend (SPA)
- **Framework:** React 19 with TypeScript
- **Build Tool:** Vite 7
- **Routing:** Client-side (Wouter)
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **Output:** dist/public/ (static files)
- **Fallback:** 200.html for SPA routing

### Backend
- **Runtime:** Node.js (ESM)
- **Framework:** Express 4
- **API:** tRPC 11
- **Database:** MySQL (Drizzle ORM)
- **Output:** dist/index.js (bundled server)

### Data Processing
- **XLSX Parsing:** xlsx library
- **CSV Handling:** PapaParse
- **Date Handling:** date-fns with flexible parsing
- **Compression:** gzip (70-80% reduction)
- **Caching:** React Query (1 hour) + memoization (5 min)

---

## Pre-Deployment Checklist

Before deploying to Timeweb Cloud, ensure you have:

- [ ] Timeweb Cloud account with Node.js runtime support
- [ ] MySQL database provisioned (or use Timeweb's managed MySQL)
- [ ] Environment variables configured (see Environment Variables section)
- [ ] Git repository pushed to GitHub
- [ ] Production build tested locally (`npm run build:frontend`)
- [ ] 200.html fallback verified in dist/public/

---

## Environment Variables

### Required Variables

Create a `.env.production` file or configure these in Timeweb Cloud's environment settings:

```bash
# Database
DATABASE_URL=mysql://user:password@host:3306/dbname

# Authentication
JWT_SECRET=your-secure-jwt-secret-here
VITE_OAUTH_PORTAL_URL=https://your-oauth-provider.com
OAUTH_SERVER_URL=https://your-oauth-backend.com
VITE_APP_ID=your-app-id

# Application
VITE_APP_TITLE="Fulfillment Analytics"
VITE_APP_LOGO="https://your-domain.com/logo.png"
OWNER_NAME=Admin
OWNER_OPEN_ID=owner-id

# Server
NODE_ENV=production
PORT=3000

# Manus Built-in APIs (if using)
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=your-api-key

# Analytics (optional)
VITE_ANALYTICS_ENDPOINT=https://analytics.example.com
VITE_ANALYTICS_WEBSITE_ID=your-website-id
```

### Environment Variable Notes

- **DATABASE_URL:** Use Timeweb's managed MySQL or external database. Format: `mysql://user:pass@host:port/database`
- **JWT_SECRET:** Generate a strong random string (32+ characters). Use `openssl rand -hex 32` to generate
- **VITE_OAUTH_PORTAL_URL:** Your OAuth provider's login portal URL
- **OAUTH_SERVER_URL:** Your OAuth provider's backend URL
- **NODE_ENV:** Must be `production` for optimized builds
- **PORT:** Timeweb typically uses port 3000, but check your hosting configuration

---

## Build and Deployment Steps

### 1. Local Build Verification

Test the production build locally before deploying:

```bash
# Install dependencies
pnpm install

# Build frontend
npm run build:frontend

# Verify 200.html was created
ls -la dist/public/200.html

# Build full stack (if deploying with backend)
npm run build
```

### 2. Push to GitHub

Ensure your repository is up to date:

```bash
git add .
git commit -m "Prepare for Timeweb Cloud deployment"
git push origin main
```

### 3. Timeweb Cloud Deployment

#### Option A: Deploy Frontend Only (SPA)

If using an external backend or serverless functions:

1. **Create a new project** in Timeweb Cloud
2. **Select Node.js runtime** (v18+)
3. **Configure build command:**
   ```bash
   npm install && npm run build:frontend
   ```
4. **Configure start command:**
   ```bash
   npx serve -s dist/public -l 3000
   ```
5. **Set environment variables** in Timeweb dashboard
6. **Deploy** and verify routing works

#### Option B: Deploy Full Stack (Frontend + Backend)

If deploying both frontend and backend:

1. **Create a new project** in Timeweb Cloud
2. **Select Node.js runtime** (v18+)
3. **Configure build command:**
   ```bash
   npm install && npm run build
   ```
4. **Configure start command:**
   ```bash
   NODE_ENV=production node dist/index.js
   ```
5. **Configure database** (MySQL connection)
6. **Set all environment variables** (see Environment Variables section)
7. **Deploy** and monitor logs

### 4. Verify Deployment

After deployment, test these endpoints:

```bash
# Frontend (SPA)
curl https://your-domain.com/
curl https://your-domain.com/alerts
curl https://your-domain.com/partners

# Backend API (if deployed)
curl https://your-domain.com/api/trpc/auth.me
curl https://your-domain.com/api/trpc/data.getMetrics
```

---

## SPA Routing Configuration

The application uses **client-side routing** with Wouter. Timeweb Cloud requires special configuration to serve index.html for all routes.

### How It Works

1. **Vite Configuration** (`vite.config.ts`):
   - `appType: 'spa'` tells Vite to generate SPA-compatible output
   - All non-file requests fallback to index.html

2. **Timeweb Configuration** (200.html):
   - Timeweb Cloud supports `200.html` as a fallback for SPA routing
   - The build script automatically creates `dist/public/200.html` (copy of index.html)
   - This enables client-side routing for all paths

3. **Build Output**:
   ```
   dist/public/
   ├── index.html          (main entry point)
   ├── 200.html            (SPA fallback for Timeweb)
   ├── css/
   │   └── index-*.css
   ├── js/
   │   └── index-*.js
   ├── images/
   └── fonts/
   ```

### Troubleshooting SPA Routing

If routes return 404 errors:

1. **Verify 200.html exists:**
   ```bash
   ls -la dist/public/200.html
   ```

2. **Check Timeweb configuration:**
   - Ensure SPA mode is enabled
   - Verify 200.html fallback is configured

3. **Test locally:**
   ```bash
   npx serve -s dist/public -l 3000
   # Navigate to http://localhost:3000/alerts
   # Should load without 404 error
   ```

---

## Performance Optimization

The application includes several performance optimizations for production:

### 1. Gzip Compression
- **Server-side:** Express gzip middleware (70-80% reduction)
- **Build:** Vite minification with Terser
- **Threshold:** Compress responses > 1KB

### 2. Asset Caching
- **Static assets:** 1 week cache (dist/public/*)
- **HTML:** No cache (always fetch latest)
- **Chunks:** Content-hashed filenames for cache busting

### 3. Data Caching
- **React Query:** 1-hour cache for API responses
- **Memoization:** 5-minute cache for computed metrics
- **Browser Cache:** Aggressive caching for static files

### 4. Code Splitting
- **Automatic:** Vite handles chunk splitting
- **Manual:** Use dynamic imports for large features
- **Monitoring:** Check build output for chunk sizes

### 5. Bundle Size
- **Current:** 1.09 MB (minified) → 290 KB (gzipped)
- **Optimization:** Consider code-splitting large components
- **Monitoring:** Use `npm run build:frontend` to track sizes

---

## Database Setup

### MySQL Schema

The application uses Drizzle ORM with the following schema:

```sql
-- Users table (authentication)
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional tables for analytics (if using backend)
-- See drizzle/schema.ts for complete schema
```

### Database Migration

After deploying to Timeweb Cloud:

```bash
# Run migrations
npm run db:push

# This command:
# 1. Generates migration files from schema.ts
# 2. Applies migrations to the database
```

---

## Data Management

### CSV Data File

The application includes a pre-processed CSV file with 176,294 records:

- **Location:** client/public/data_merged.csv
- **Size:** 52 MB (compressed in Git LFS)
- **Format:** Semicolon-delimited
- **Columns:** Orders + Reports merged data

### Updating Data

To update the data file:

1. **Prepare new XLSX files:**
   - Orders XLSX (columns: ID заказа, Партнер, Дата заказа, etc.)
   - Reports XLSX (columns: ID заказа, Артикул, Вес, etc.)

2. **Upload via UI:**
   - Navigate to Data Management page
   - Upload both XLSX files
   - System automatically merges and deduplicates

3. **Verify results:**
   - Check metrics update
   - Review alerts for new signals

### Data Deduplication

The system uses **last-wins strategy** for duplicate order IDs:
- If an order ID appears multiple times, the last record is kept
- Previous records are discarded
- Timestamps determine record order

---

## Monitoring and Maintenance

### Logs

Monitor application logs in Timeweb Cloud dashboard:

```bash
# View recent logs
# (Available in Timeweb Cloud dashboard)

# Check for errors
grep -i "error\|exception" logs/
```

### Health Checks

Implement health checks for monitoring:

```bash
# Frontend health
curl https://your-domain.com/

# Backend health (if deployed)
curl https://your-domain.com/api/trpc/auth.me
```

### Performance Monitoring

Track performance metrics:

- **Build size:** Check `npm run build:frontend` output
- **API response time:** Monitor tRPC calls in browser DevTools
- **Database queries:** Use Drizzle logging in development

### Backup and Recovery

For Timeweb Cloud:

1. **Database backups:**
   - Enable automatic backups in Timeweb dashboard
   - Test restore procedures regularly

2. **Code backups:**
   - GitHub repository serves as primary backup
   - Tag releases for easy rollback

3. **Data backups:**
   - Export CSV data regularly
   - Store in secure location

---

## Troubleshooting

### Common Issues

#### 1. 404 Errors on Routes
**Problem:** Routes like `/alerts` return 404  
**Solution:** Verify 200.html fallback is configured and exists

#### 2. Database Connection Errors
**Problem:** "Cannot connect to database"  
**Solution:** 
- Verify DATABASE_URL is correct
- Check database credentials
- Ensure database is accessible from Timeweb

#### 3. Large Bundle Size Warning
**Problem:** Build shows chunks > 500 KB  
**Solution:**
- This is a warning, not an error
- Consider code-splitting for large features
- Monitor performance in production

#### 4. XLSX Upload Fails
**Problem:** "Failed to parse XLSX file"  
**Solution:**
- Verify file format is valid XLSX
- Check column names match expected format
- Review error message in browser console

#### 5. Slow Data Loading
**Problem:** Metrics take long to calculate  
**Solution:**
- Check React Query cache settings
- Verify gzip compression is enabled
- Monitor browser DevTools Network tab

---

## Security Considerations

### Environment Variables
- **Never commit .env files** to Git
- Use Timeweb's environment variable management
- Rotate JWT_SECRET regularly
- Use strong, random values for all secrets

### Database Security
- **Use SSL/TLS** for database connections
- **Enable authentication** on MySQL
- **Restrict access** to database from Timeweb only
- **Regular backups** for disaster recovery

### API Security
- **CORS:** Configured for your domain
- **CSRF:** Protected by session cookies
- **Rate limiting:** Consider adding for public endpoints
- **Input validation:** All user inputs validated server-side

### Data Protection
- **HTTPS:** Always use HTTPS in production
- **Sensitive data:** Don't log passwords or tokens
- **Data retention:** Define policy for old records
- **GDPR compliance:** Implement data export/deletion if needed

---

## Support and Resources

### Documentation
- **Vite:** https://vitejs.dev/
- **React:** https://react.dev/
- **Express:** https://expressjs.com/
- **tRPC:** https://trpc.io/
- **Drizzle ORM:** https://orm.drizzle.team/
- **Timeweb Cloud:** https://timeweb.cloud/

### Debugging
- **Browser DevTools:** F12 for frontend debugging
- **Server logs:** Check Timeweb Cloud dashboard
- **Network tab:** Monitor API calls and performance
- **React DevTools:** Browser extension for React debugging

### Getting Help
- Check GitHub Issues: https://github.com/artyomparfenov-bot/fulfillment_analytics/issues
- Review error messages carefully
- Check browser console for JavaScript errors
- Monitor server logs for backend errors

---

## Deployment Checklist

Before going live:

- [ ] All environment variables configured
- [ ] Database migrations applied
- [ ] Frontend build tested locally
- [ ] 200.html fallback verified
- [ ] SPA routing tested on all pages
- [ ] API endpoints responding correctly
- [ ] HTTPS enabled
- [ ] Backups configured
- [ ] Monitoring enabled
- [ ] Team trained on deployment process

---

## Version Information

- **Application:** Fulfillment Analytics v1.0.0
- **Node.js:** v18+ (recommended v20+)
- **React:** 19.1.1
- **Vite:** 7.1.7
- **Express:** 4.21.2
- **MySQL:** 8.0+ (or compatible)
- **Deployment Date:** [Your deployment date]

---

## Next Steps

1. **Prepare environment variables** for Timeweb Cloud
2. **Test production build locally** (`npm run build:frontend`)
3. **Create Timeweb Cloud project** with Node.js runtime
4. **Configure deployment** using steps in this guide
5. **Monitor logs** after initial deployment
6. **Test all routes** to verify SPA routing works
7. **Set up monitoring** and backups

---

**Last Updated:** October 29, 2025  
**Maintained By:** Manus AI  
**Repository:** https://github.com/artyomparfenov-bot/fulfillment_analytics

