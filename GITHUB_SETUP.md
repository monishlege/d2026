# GitHub Setup & Deployment Guide

## Pre-Push Checklist

Before pushing to GitHub:

- [ ] Remove all `.env` files with actual keys
- [ ] Ensure `.env.example` contains placeholder values only
- [ ] Verify `.gitignore` excludes sensitive files
- [ ] Remove any hardcoded API keys from code
- [ ] Test that `.env.local` is properly ignored
- [ ] Update README with setup instructions

## Repository Setup

### Step 1: Initialize Git (if not already done)

```bash
cd /path/to/dsih26
git init
```

### Step 2: Create `.gitignore` for Root

```bash
# Root .gitignore
cat > .gitignore << 'EOF'
# Environment variables
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Node
frontend/node_modules/
frontend/.next/
frontend/dist/

# Python
backend/__pycache__/
backend/*.pyc
backend/venv/
backend/.pytest_cache/

# Build outputs
build/
dist/

# Logs
*.log
logs/

# IDE project files
*.iml
.gradle
EOF
```

### Step 3: Verify Sensitive Files Are Ignored

```bash
# Test what would be committed
git status --porcelain

# Simulate what would be in the repo
git ls-files

# Ensure .env files are not in the list
git ls-files | grep -E "\.env"  # Should return nothing
```

### Step 4: Create GitHub Repository

1. Go to [GitHub.com](https://github.com/new)
2. Create new repository: `janrakshak-ai`
3. Choose visibility (public for open source, private for sensitive)
4. Don't initialize with README (we'll push our own)

### Step 5: Add Remote and Push

```bash
# Add remote
git remote add origin https://github.com/YOUR_USERNAME/janrakshak-ai.git

# Verify remote
git remote -v

# Stage all files
git add .

# Create initial commit
git commit -m "Initial commit: JanRakshak AI with Bhashini and Qdrant integration"

# Push to GitHub
git branch -M main
git push -u origin main
```

## Repository Structure for GitHub

```
janrakshak-ai/
├── backend/
│   ├── main.py
│   ├── config.py              # NEW: Config management
│   ├── bhashini_client.py     # NEW: Bhashini integration
│   ├── qdrant_client.py       # NEW: Qdrant integration
│   ├── mock_data.py
│   ├── requirements.txt       # UPDATED: New dependencies
│   ├── .env.example          # NEW: Config template
│   ├── .gitignore            # NEW: Git exclusions
│   ├── API_INTEGRATION_GUIDE.md  # NEW: Documentation
│   └── ...
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── firebase.ts       # Firebase config
│   │   │   └── firebaseAuth.ts   # Firebase auth
│   │   ├── components/
│   │   │   └── SecureLogin.tsx   # Phone + OTP UI
│   │   └── ...
│   ├── .env.example          # Firebase config template
│   ├── FIREBASE_SETUP.md     # Firebase documentation
│   ├── package.json          # UPDATED: Firebase dependency
│   └── ...
├── documents/
│   └── ... (PRD, architecture, etc.)
├── .github/
│   └── workflows/
│       └── ci-cd.yml         # GitHub Actions (optional)
├── QUICK_START.md            # Quick setup guide
├── IMPLEMENTATION_SUMMARY.md # Change summary
└── README.md                 # Main documentation
```

## GitHub Actions (Optional CI/CD)

### Create `.github/workflows/backend-tests.yml`

```yaml
name: Backend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'backend/**'
  pull_request:
    branches: [main]
    paths:
      - 'backend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.10'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install pytest
      
      - name: Run tests
        run: |
          cd backend
          python -m pytest test_logic.py -v
      
      - name: Lint
        run: |
          cd backend
          pip install flake8
          flake8 --count --select=E9,F63,F7,F82 --show-source
```

### Create `.github/workflows/frontend-tests.yml`

```yaml
name: Frontend Tests

on:
  push:
    branches: [main, develop]
    paths:
      - 'frontend/**'
  pull_request:
    branches: [main]
    paths:
      - 'frontend/**'

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Use Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: frontend/package-lock.json
      
      - name: Install dependencies
        run: |
          cd frontend
          npm install
      
      - name: Run tests
        run: |
          cd frontend
          npm run test
      
      - name: Lint
        run: |
          cd frontend
          npm run lint
```

## Collaboration Setup

### Branch Protection Rules

1. Go to GitHub Repository Settings
2. Navigate to "Branches"
3. Create rule for `main` branch:
   - Require pull request reviews (1+ reviewer)
   - Require status checks to pass
   - Require branches to be up to date
   - Dismiss stale reviews when new commits pushed
   - Require code review before merging

### Collaboration Guidelines

Create `CONTRIBUTING.md`:

```markdown
# Contributing to JanRakshak AI

## Development Workflow

1. Create feature branch from `main`
   ```
   git checkout -b feature/feature-name
   ```

2. Make changes and commit
   ```
   git commit -m "Clear commit message"
   ```

3. Push and create Pull Request
   ```
   git push origin feature/feature-name
   ```

4. Wait for reviews and CI checks to pass

5. Merge after approval

## Code Standards

### Backend (Python)
- Use Python 3.10+
- Follow PEP 8 style guide
- Add docstrings to functions
- Use type hints

### Frontend (TypeScript/React)
- Use TypeScript for type safety
- Follow ESLint rules
- Use React hooks
- Add component documentation

## Testing

- Backend: `python -m pytest`
- Frontend: `npm run test`

## Configuration

See `.env.example` files in backend/ and frontend/ for setup.
Never commit `.env` files with real credentials.
```

## Secrets Management for CI/CD

If using GitHub Actions, add secrets:

1. Go to Repository Settings → Secrets → Actions
2. Add secrets:
   - `BHASHINI_API_KEY`
   - `QDRANT_API_KEY`
   - `FIREBASE_API_KEY`
   - etc.

Use in workflows:
```yaml
- name: Run tests
  env:
    BHASHINI_API_KEY: ${{ secrets.BHASHINI_API_KEY }}
    QDRANT_API_KEY: ${{ secrets.QDRANT_API_KEY }}
  run: |
    cd backend
    python -m pytest
```

## Documentation on GitHub

### Update Main README.md

The root README should include:

1. **Project Overview**
   - What is JanRakshak AI?
   - Key features
   - Tech stack

2. **Quick Start**
   - Installation steps
   - Running locally
   - Configuration

3. **Architecture**
   - System diagram
   - API overview
   - Database schema

4. **API Documentation**
   - Link to API_INTEGRATION_GUIDE.md
   - Endpoint examples
   - Authentication

5. **Deployment**
   - Docker instructions
   - AWS/cloud deployment
   - Environment variables

6. **Contributing**
   - Link to CONTRIBUTING.md
   - Development setup
   - Testing procedures

7. **License**
   - Include LICENSE file

## GitHub Issues & Projects

### Set Up Issue Templates

Create `.github/ISSUE_TEMPLATE/bug_report.md`:

```markdown
---
name: Bug Report
about: Report a bug
---

## Description
Describe the bug clearly.

## Steps to Reproduce
1. Step one
2. Step two

## Expected Behavior
What should happen?

## Actual Behavior
What actually happened?

## Environment
- OS: 
- Browser:
- Version:

## Screenshots
(if applicable)
```

### Enable Discussions

1. Settings → Features → Discussions
2. Use for community Q&A
3. Pin common questions

## Versioning & Releases

### Semantic Versioning

Use format: `MAJOR.MINOR.PATCH`

```bash
# Tag a release
git tag -a v1.0.0 -m "Version 1.0.0: Initial release"
git push origin v1.0.0
```

On GitHub: Go to Releases → Create Release from Tag

### Changelog

Create `CHANGELOG.md`:

```markdown
# Changelog

All notable changes are documented here.

## [1.0.0] - 2024-01-XX

### Added
- Firebase phone + OTP authentication
- Bhashini API integration
- Qdrant RAG implementation

### Changed
- Renamed from Jansahayak to JanRakshak

### Fixed
- CORS configuration issues
```

## Security Considerations

### Secrets Scanning

1. Enable "Secret Scanning" (GitHub Pro+)
2. Automatically detects leaked credentials
3. Alerts maintainers of exposed secrets

### Dependabot

1. Settings → Security → Dependabot alerts
2. Enable automated dependency updates
3. Review and merge security patches

### Branch Protection

Always require:
- Status checks (tests passing)
- Code review before merge
- Stale review dismissal
- Up-to-date branches

## Monitoring & Analytics

### GitHub Insights

1. **Pulse** - Repository activity
2. **Insights** - Commit history, contributors
3. **Traffic** - Popular pages, referrers
4. **Deployments** - Release history

### Integration with External Services

- **Codecov** - Code coverage reports
- **SonarCloud** - Code quality analysis
- **Snyk** - Vulnerability scanning
- **Read the Docs** - Automated documentation hosting

## Final Checklist Before Public Release

- [ ] All `.env` files removed / gitignored
- [ ] README.md complete and accurate
- [ ] CONTRIBUTING.md created
- [ ] LICENSE file added (MIT, Apache, GPL)
- [ ] All tests passing
- [ ] No security warnings
- [ ] Documentation complete
- [ ] API docs generated
- [ ] Issue templates created
- [ ] Branch protection enabled

## Next Steps

1. **Create Issues** for known bugs/features
2. **Create Discussions** for design decisions
3. **Add to Organization** if part of group
4. **Set up CI/CD** with GitHub Actions
5. **Enable Pages** for documentation site

---

Ready to share with the community! 🚀

