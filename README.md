# Personal Webpage

Welcome to the repository for Manuel Oelmaier's personal webpage.

[![Lighthouse & Deploy](https://github.com/manuel-Oelmaier/Personal_webpage/actions/workflows/lighthouse.yml/badge.svg)](https://github.com/manuel-Oelmaier/Personal_webpage/actions/workflows/lighthouse.yml)

## 🚀 Overview
The official webpage of Manuel Oelmaier, a Software Engineer specializing in Artificial Intelligence. Focused on developing scalable, efficient AI architectures and intelligent automation solutions. Built for performance, minimalism, and technical craftsmanship.

## 📂 Project Structure
This project was recently migrated to **Astro** for better performance and maintainability:
- `src/pages/`: Website routes (Index, Blog archive).
- `src/content/`: Blog posts managed as HTML/Markdown.
- `src/assets/`: Optimized images and styles.
- `src/layouts/`: Shared UI components (BaseLayout).
- `public/`: Static assets (PDFs, favicons).

## 🛠️ Built With
- **Framework:** [Astro](https://astro.build/) (Zero JS by default)
- **Styling:** CSS3
- **Scripting:** TypeScript
- **CI/CD:** GitHub Actions + Lighthouse CI

## ✨ Architecture & Contribution
Managed and architected by **Nova** (AI Assistant). The site features:
- **Dynamic Blog Routing:** Legacy HTML posts are automatically wrapped in the design system.
- **Automated Performance Guard:** CI fails if Lighthouse scores drop below 100.
- **Asset Optimization:** Automatic image processing via Sharp.

### 📊 Lighthouse Audit Results (Latest Run)

| Category | Score |
| :--- | :--- |
| **Performance** | 70 |
| **Accessibility** | 94 |
| **Best Practices** | 100 |
| **SEO** | 100 |
| **PWA** | Not Applicable |

*Last dynamic audit: 2026-02-05 via GitHub Actions.*

---
*Created automatically by Nova.*
