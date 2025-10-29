# Git LFS Setup Guide

This guide explains how to set up Git Large File Storage (LFS) for managing the large `data_merged.csv` file (52 MB).

## Why Git LFS?

The `data_merged.csv` file is 52 MB, which exceeds GitHub's recommended file size limit of 50 MB. Without Git LFS:
- GitHub will reject pushes with files > 100 MB
- Repository cloning becomes slow
- Storage quota is wasted on large binary files

**Git LFS solves this by:**
- Storing large files on a separate LFS server
- Keeping only pointers (small text files) in Git
- Reducing repository size by 99%
- Enabling efficient collaboration

## Setup Instructions

### 1. Install Git LFS

**macOS (Homebrew):**
```bash
brew install git-lfs
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install git-lfs
```

**Windows (Chocolatey):**
```bash
choco install git-lfs
```

**Or download from:** https://git-lfs.github.com/

### 2. Initialize Git LFS in Repository

```bash
cd /home/ubuntu/fulfillment_analytics

# Initialize Git LFS
git lfs install

# Verify installation
git lfs version
# Output: git-lfs/3.x.x (GitHub; linux amd64)
```

### 3. Track Large Files with Git LFS

```bash
# Track CSV files
git lfs track "*.csv"

# Track XLSX files
git lfs track "*.xlsx"

# Track other large files
git lfs track "*.tar.gz"

# Verify tracking
cat .gitattributes
# Output should show:
# *.csv filter=lfs diff=lfs merge=lfs -text
# *.xlsx filter=lfs diff=lfs merge=lfs -text
```

### 4. Add Existing Large Files

If `data_merged.csv` is already in Git (not recommended), remove and re-add it:

```bash
# Remove from Git history (keeps local file)
git rm --cached client/public/data_merged.csv

# Add to Git LFS
git add client/public/data_merged.csv

# Commit changes
git commit -m "Add data_merged.csv to Git LFS"
```

### 5. Push to GitHub

```bash
# Push with LFS support
git push origin main

# Verify LFS files were uploaded
git lfs ls-files
# Output should show:
# 52 MB client/public/data_merged.csv
```

## Verification

### Check Git LFS Status

```bash
# List all LFS-tracked files
git lfs ls-files

# Check LFS configuration
git lfs env

# Verify file is stored in LFS
file client/public/data_merged.csv
# Should show: ASCII text (pointer file)
```

### View LFS Pointer File

```bash
# LFS files are stored as pointers
cat client/public/data_merged.csv

# Output example:
# version https://git-lfs.github.com/spec/v1
# oid sha256:abc123def456...
# size 52428800
```

## GitHub Configuration

### Enable Git LFS on GitHub

1. **GitHub Free Plan:**
   - Includes 1 GB free LFS storage
   - 1 GB free bandwidth per month
   - Sufficient for most projects

2. **GitHub Pro/Enterprise:**
   - 50 GB LFS storage
   - Unlimited bandwidth

### GitHub LFS Limits

| Plan | Storage | Bandwidth |
|------|---------|-----------|
| Free | 1 GB | 1 GB/month |
| Pro | 50 GB | Unlimited |
| Enterprise | Custom | Custom |

**Current Usage:**
- `data_merged.csv`: 52 MB (fits in free tier)
- Remaining free storage: ~948 MB

## Workflow with Git LFS

### Cloning Repository

```bash
# Clone with LFS files
git clone https://github.com/artyomparfenov-bot/fulfillment_analytics.git

# LFS files are automatically downloaded
# No additional steps needed
```

### Updating Large Files

```bash
# Make changes to data_merged.csv
# (e.g., upload new XLSX files via UI)

# Stage and commit
git add client/public/data_merged.csv
git commit -m "Update analytics data"

# Push (LFS handles large file automatically)
git push origin main
```

### Pulling Updates

```bash
# Pull with LFS support
git pull origin main

# LFS files are automatically downloaded
```

## Troubleshooting

### "Git LFS not installed"

**Problem:** `git lfs` command not found  
**Solution:**
```bash
# Install Git LFS
brew install git-lfs  # macOS
sudo apt-get install git-lfs  # Linux

# Initialize
git lfs install
```

### "Pointer file instead of actual file"

**Problem:** File shows LFS pointer content instead of actual data  
**Solution:**
```bash
# Pull LFS files
git lfs pull

# Or fetch specific file
git lfs fetch origin main
git lfs checkout
```

### "LFS quota exceeded"

**Problem:** "Bandwidth quota exceeded"  
**Solution:**
- Upgrade GitHub plan
- Or use alternative LFS provider (Backblaze B2, etc.)

### "Large file rejected by GitHub"

**Problem:** "File too large" error on push  
**Solution:**
```bash
# Ensure file is tracked by LFS
git lfs track "*.csv"

# Remove from Git history
git rm --cached client/public/data_merged.csv

# Re-add with LFS
git add client/public/data_merged.csv

# Commit and push
git commit -m "Fix: Track CSV with LFS"
git push origin main
```

## Alternative: Exclude Data File

If you prefer not to use Git LFS, exclude the data file from Git:

```bash
# Add to .gitignore
echo "client/public/data_merged.csv" >> .gitignore

# Remove from Git
git rm --cached client/public/data_merged.csv

# Commit
git commit -m "Exclude large data file from Git"

# Push
git push origin main

# Users must download data separately
```

**Pros:**
- No Git LFS setup needed
- Smaller repository size

**Cons:**
- Data file not version controlled
- Manual download required after cloning
- Harder to track data changes

## Current Status

### Repository Size

```bash
# Check repository size
du -sh .git/

# Check with LFS
git lfs du --all
```

### Current Files

| File | Size | Storage |
|------|------|---------|
| data_merged.csv | 52 MB | Git LFS |
| Source code | ~5 MB | Git |
| node_modules | ~500 MB | .gitignore (not tracked) |
| **Total tracked** | **~57 MB** | **Git + LFS** |

## Best Practices

### Do's ✅

- ✅ Use Git LFS for files > 10 MB
- ✅ Track `.csv`, `.xlsx`, `.tar.gz` files
- ✅ Commit `.gitattributes` to repository
- ✅ Verify LFS is installed before cloning
- ✅ Monitor LFS quota usage

### Don'ts ❌

- ❌ Don't commit large files without LFS
- ❌ Don't push files > 100 MB to GitHub
- ❌ Don't track node_modules or build artifacts
- ❌ Don't store sensitive data in LFS
- ❌ Don't exceed GitHub's LFS quota

## References

- [Git LFS Documentation](https://git-lfs.github.com/)
- [GitHub LFS Guide](https://docs.github.com/en/repositories/working-with-files/managing-large-files)
- [Git LFS Specification](https://github.com/git-lfs/git-lfs/blob/main/docs/spec.md)

---

**Last Updated:** October 29, 2025  
**Maintained By:** Manus AI

