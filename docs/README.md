# Project Documentation

Complete guide to all documentation.

## Quick Navigation

### 🚀 Getting Started (00-getting-started/)
**For new team members and first-time setup**

- `COMPLETE_GUIDE.md` - Full project overview
- `ACTION_PLAN_SHIPPING.md` - Product shipping roadmap
- `LOCAL_SETUP.md` - Local development environment
- `00_START_HERE.md` - Entry point

**Start here**: Read `00_START_HERE.md` first.

### 👥 User Guides (01-user-guides/)
**For end-users and administrators**

- `USER_GUIDE.md` - General user documentation
- `ADMIN.md` - Administrator manual
- `keyboard-shortcuts.md` - Keyboard shortcuts reference

**Access**: Share with users and support team.

### 🏗️ Architecture (02-architecture/)
**For developers and architects**

- `blueprint.md` - System architecture overview
- `INFRASTRUCTURE_README.md` - Infrastructure architecture
- `analytics-integration-api.md` - Analytics integration
- `vendor-ui-guide.md` - Vendor UI components
- `VENDOR_UI_ENHANCEMENT_SUMMARY.md` - UI enhancements

**Best for**: Understanding the codebase structure.

### 🚢 Deployment (03-deployment/)
**For DevOps and release teams**

- `PRODUCTION_DEPLOYMENT.md` - Production deployment guide
- `PRODUCTION_READINESS_CHECKLIST.md` - Pre-launch checklist
- `GITHUB_SECRETS_SETUP.md` - GitHub Actions secrets configuration
- `e2e-user-stories.md` - End-to-end test scenarios

**Critical before launch**: Review the checklist.

### 🔬 Research (04-research/)
**For exploratory work and decisions**

- `brainstorm.md` - Project brainstorming notes
- `ASSISTANT_BOUNDARIES.md` - AI assistant guidelines

**Use case**: Understanding past decisions and constraints.

### 📋 Implementation (05-implementation/)
**For tracking progress and status**

- `FINAL_IMPLEMENTATION_REPORT.md` - Implementation summary
- `findings.md` - Technical findings
- `progress.md` - Current progress status
- `task_plan.md` - Task planning and tracking

**Status**: Check for latest project status.

---

## By Role

### 👨‍💻 Developer
1. Start with: `00-getting-started/LOCAL_SETUP.md`
2. Architecture: `02-architecture/blueprint.md`
3. Components: `02-architecture/vendor-ui-guide.md`
4. Implementation: `05-implementation/FINAL_IMPLEMENTATION_REPORT.md`

### 🎨 Product Manager / Designer
1. User Guide: `01-user-guides/USER_GUIDE.md`
2. Architecture: `02-architecture/blueprint.md`
3. UI Guide: `02-architecture/vendor-ui-guide.md`
4. Plan: `04-research/brainstorm.md`

### 🚀 DevOps / SRE
1. Infrastructure: `02-architecture/INFRASTRUCTURE_README.md`
2. Deployment: `03-deployment/PRODUCTION_DEPLOYMENT.md`
3. Checklist: `03-deployment/PRODUCTION_READINESS_CHECKLIST.md`
4. Secrets: `03-deployment/GITHUB_SECRETS_SETUP.md`

### 👤 System Administrator
1. Admin Guide: `01-user-guides/ADMIN.md`
2. Infrastructure: `02-architecture/INFRASTRUCTURE_README.md`
3. Deployment: `03-deployment/PRODUCTION_DEPLOYMENT.md`

### 🤖 AI/ML Engineer
1. Architecture: `02-architecture/blueprint.md`
2. Analytics: `02-architecture/analytics-integration-api.md`
3. Infrastructure: `infrastructure/README.md`

---

## Document Quick Reference

| Document | Purpose | Audience | Frequency |
|----------|---------|----------|-----------|
| LOCAL_SETUP.md | Development setup | Developers | Once per dev |
| COMPLETE_GUIDE.md | Project overview | All | Monthly |
| blueprint.md | System design | Technical | Reference |
| PRODUCTION_DEPLOYMENT.md | Release process | DevOps | Each release |
| PRODUCTION_READINESS_CHECKLIST.md | Pre-launch verification | DevOps/QA | Per launch |
| USER_GUIDE.md | User manual | End users | On changes |
| ADMIN.md | Admin operations | Admins | Reference |
| FINAL_IMPLEMENTATION_REPORT.md | Status report | Management | Monthly |

---

## Key Directories

### Source Code
- `src/` - Frontend (Next.js, React)
- `backend/` - Backend code, tests, scripts
- `mlops/` - ML/Ops pipeline

### Infrastructure
- `infrastructure/` - Kubernetes, Terraform, Docker, Monitoring
- `config/` - Application configuration files

### Tools
- `tools/` - Development utilities and AI assistants

---

## Common Tasks

### Setting up a new development environment
```
1. Read: 00-getting-started/LOCAL_SETUP.md
2. Follow: Step-by-step instructions
3. Reference: backend/README.md for backend setup
```

### Deploying to production
```
1. Checklist: 03-deployment/PRODUCTION_READINESS_CHECKLIST.md
2. Guide: 03-deployment/PRODUCTION_DEPLOYMENT.md
3. Secrets: 03-deployment/GITHUB_SECRETS_SETUP.md
```

### Understanding the architecture
```
1. Overview: 02-architecture/blueprint.md
2. Infrastructure: 02-architecture/INFRASTRUCTURE_README.md
3. Components: 02-architecture/vendor-ui-guide.md
```

### Troubleshooting issues
```
1. Check: 02-architecture/blueprint.md for system context
2. View: 05-implementation/findings.md for known issues
3. Reference: Individual component docs in specific folders
```

---

## Navigation Tips

- **New? Start with**: `00-getting-started/00_START_HERE.md`
- **Deploying? Go to**: `03-deployment/PRODUCTION_READINESS_CHECKLIST.md`
- **Setting up dev env? See**: `00-getting-started/LOCAL_SETUP.md`
- **Architecture questions? Check**: `02-architecture/blueprint.md`
- **Need admin help? Read**: `01-user-guides/ADMIN.md`

---

## Document Status

- ✅ Local Setup: Current and maintained
- ✅ Architecture: Current
- ✅ Deployment: Current  
- ⏰ User Guide: Updated quarterly
- ⏰ Implementation Report: Monthly updates
- 📝 Research: Archived for reference

---

**Last Updated**: June 1, 2026  
**Maintained By**: Development Team  
**Next Review**: Quarterly
