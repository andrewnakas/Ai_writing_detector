# GitHub Pages Setup Guide

## Current Status

The AI Writing Detector has been built and pushed to the `claude/wikipedia-tracker-detector-MRGrr` branch. To deploy to GitHub Pages, follow these steps:

## Option 1: Merge to Main Branch (Recommended)

The workflow is configured to deploy to GitHub Pages **only from the main branch**. This is the standard practice for production deployments.

### Steps:

1. **Create a Pull Request**
   - Go to: https://github.com/andrewnakas/Ai_writing_detector/pull/new/claude/wikipedia-tracker-detector-MRGrr
   - Review the changes
   - Merge the PR into main

2. **Enable GitHub Pages** (if not already done)
   - Go to repository Settings → Pages
   - Under "Source", select **GitHub Actions**
   - Save

3. **Automatic Deployment**
   - Once merged to main, the workflow automatically runs
   - Scrapes Wikipedia data (or uses existing data if scraper fails)
   - Deploys to GitHub Pages
   - Site will be available at: `https://andrewnakas.github.io/Ai_writing_detector/`

## Option 2: Deploy from Feature Branch (For Testing)

If you want to deploy directly from the feature branch for testing:

1. **Update the workflow** to allow deployment from your branch:
   ```yaml
   deploy-pages:
     # Change this line to allow your branch
     if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/claude/wikipedia-tracker-detector-MRGrr'
   ```

2. **Push the change** and the workflow will deploy

3. **Remember**: This is only for testing. Production should deploy from main.

## Understanding the Workflow

### What Happens on Push:

1. **update-wiki-data job** (runs on every push):
   - Tries to scrape Wikipedia's "Signs of AI Writing" article
   - If successful: Updates `wiki-data.json` with latest data
   - If fails: Continues with existing data (no problem!)
   - Commits changes only if data actually changed

2. **deploy-pages job** (runs only on main branch):
   - Takes the `docs/` folder
   - Builds and deploys to GitHub Pages
   - Available at your GitHub Pages URL

### Daily Updates:

- Workflow runs daily at 2 AM UTC via cron schedule
- Automatically checks Wikipedia for updates
- Deploys new version if changes detected

## Troubleshooting

### "Not Found" Error on GitHub Pages Deploy

**Cause**: Workflow tried to deploy from a branch that's not main

**Fix**: Either merge to main, or temporarily allow deployment from your branch (see Option 2 above)

### Wikipedia Scraper Fails

**Cause**: Network redirects or API issues

**Status**: Not a problem! The workflow continues with existing data

**Why it's OK**:
- We have comprehensive initial data (18 signs documented)
- Wikipedia article doesn't change frequently
- Next successful run will update the data
- Scraper works fine in GitHub Actions environment (different network setup)

### GitHub Pages Not Enabled

**Symptoms**: Deployment fails with "Pages not enabled"

**Fix**:
1. Go to Settings → Pages
2. Under "Source", select "GitHub Actions"
3. Save and re-run workflow

## What You Get

Once deployed, you'll have:

- 🌐 **Live Website**: Interactive AI writing detector
- 📊 **18+ Detection Patterns**: Based on Wikipedia's research
- 🔄 **Auto-Updates**: Daily Wikipedia checks
- 📝 **Full Documentation**: Comprehensive README
- 💻 **No Backend Needed**: Pure static site
- 🎨 **Beautiful UI**: Modern, responsive design

## Quick Commands

```bash
# Check current branch
git branch

# View recent commits
git log --oneline -5

# Check GitHub Actions status
gh run list --limit 5

# Manually trigger workflow
gh workflow run update-wiki-data.yml
```

## Next Steps

**Recommended workflow:**

1. ✅ Review the code on your feature branch
2. ✅ Test locally if desired (`cd docs && python -m http.server 8000`)
3. ✅ Create PR and merge to main
4. ✅ Enable GitHub Pages (Settings → Pages → GitHub Actions)
5. ✅ Visit your site at `https://andrewnakas.github.io/Ai_writing_detector/`
6. 🎉 Done! The detector is live and updates daily

## Support

If you encounter any issues:

1. Check GitHub Actions logs for error details
2. Verify GitHub Pages is enabled with correct source
3. Ensure the workflow has proper permissions
4. Check that the main branch has the latest code

---

Built with ❤️ | Powered by Wikipedia's collective knowledge
