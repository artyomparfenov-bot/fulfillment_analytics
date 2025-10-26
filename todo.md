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
- None currently

## Notes
- System uses semicolon-delimited CSV format
- Data stored in /client/public/data_merged.csv
- All calculations happen client-side
- Deduplication by ID заказа column

