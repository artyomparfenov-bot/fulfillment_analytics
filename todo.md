# Fulfillment Analytics - TODO

## Completed Features
- [x] Basic dashboard with overview metrics
- [x] Partner analytics section
- [x] SKU analysis section
- [x] Churn analysis with cohorts and segments
- [x] Alerts and anomaly detection system
- [x] VSROK as separate direction
- [x] Advanced metrics (Retention Rate, Churn Rate, MoM Growth, Concentration Risk)
- [x] Time-series charts for orders by direction
- [x] Client segment analysis (new vs current clients)
- [x] Top/Bottom performers tracking
- [x] Enhanced Churn Analysis with 4 tabs (Overview, Cohorts, Segments, Risk Scoring)
- [x] Data update with CSV merge and deduplication

## In Progress
- [x] CSV data upload module with automatic system refresh
- [x] Backend API endpoint for CSV upload (tRPC procedure)
- [x] Frontend upload UI component with drag-and-drop
- [x] Real-time data refresh and metric recalculation
- [x] Error handling for invalid dates in data processing
- [x] Alert prioritization engine with multi-factor scoring
- [x] Alert severity levels and risk categories
- [x] Enhanced alerts UI with filtering and sorting
- [x] Alert grouping and aggregation by type
- [x] Customer size classification and revenue impact calculation
- [x] XLSX merge system for Orders + Reports files
- [x] Backend XLSX parsing and merging service (using Python logic)
- [x] Dual XLSX upload UI (Orders XLSX + Reports XLSX)
- [x] Automatic file type detection and validation
- [x] Data enrichment from Reports to Orders
- [x] Marketplace normalization from XLSX data

## Deployment Tasks (Timeweb Cloud)
- [x] Fix build errors (installed terser dependency)
- [x] Configure Vite for SPA routing (appType: 'spa')
- [x] Create SPA fallback script (scripts/spa-fallback.js)
- [x] Test production build locally (16.15s build, all files verified)
- [x] Create deployment documentation (DEPLOYMENT.md)
- [x] Create environment variables guide (ENV_SETUP.md)
- [x] Create quick start guide (QUICK_START_DEPLOYMENT.md)
- [x] Configure .gitignore for large data files
- [x] Create Git LFS setup guide (GIT_LFS_SETUP.md)
- [ ] Create final checkpoint
- [ ] Push to GitHub with deployment docs

## Planned Features
- [ ] Email/Slack notifications for critical alerts
- [ ] Predictive churn model (ML)
- [ ] Cohort-based benchmarks
- [ ] RFM segmentation
- [ ] Export functionality (Excel/CSV)
- [ ] Partner health dashboard cards
- [ ] Search functionality (partners, SKU)
- [ ] Alert count badge in navigation
- [ ] Keyboard shortcuts (Ctrl+K search)
- [ ] Data refresh timestamp display

## Known Issues
- advancedMetrics.ts has syntax errors in forEach callbacks (esbuild issue)
- data_merged.csv (52 MB) causes GitHub size warnings

## Deployment Configuration
- **Platform:** Timeweb Cloud
- **Configuration:** SPA with 200.html fallback
- **Build:** Frontend-only (dist/public) or full stack (dist/)
- **Environment:** Production with gzip compression enabled
- **Data:** 176,294 records (7,956 orders, 140 partners, 1,035 SKUs)

## Notes
- System uses semicolon-delimited CSV format
- Data stored in /client/public/data_merged.csv
- All calculations happen client-side
- Deduplication by ID заказа column
- GitHub: https://github.com/artyomparfenov-bot/fulfillment_analytics

