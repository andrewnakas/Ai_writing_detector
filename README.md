# 🔍 AI Writing Detector

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![GitHub Pages](https://img.shields.io/badge/demo-live-brightgreen)](https://yourusername.github.io/Ai_writing_detector/)

A comprehensive AI writing detection tool based on [Wikipedia's Signs of AI Writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing). This project automatically tracks Wikipedia's evolving documentation of AI writing patterns and provides a user-friendly interface to analyze text for these indicators.

## 🌟 Features

- **📊 Comprehensive Analysis**: Detects 18+ signs of AI writing across 4 major categories
- **🔄 Auto-Updates**: GitHub Actions automatically fetches the latest Wikipedia article daily
- **🎯 Smart Scoring**: Weighted scoring algorithm considers severity, frequency, and context
- **📝 Detailed Reports**: Highlights detected patterns with citations to Wikipedia sources
- **💻 GitHub Pages**: Fully functional web interface requiring no backend
- **📤 Export Results**: Export analysis as JSON, text, or copy to clipboard
- **🎨 Beautiful UI**: Modern, responsive design with gradient themes

## 🚀 Live Demo

Visit the live detector: [https://yourusername.github.io/Ai_writing_detector/](https://yourusername.github.io/Ai_writing_detector/)

## 📖 What It Detects

Based on Wikipedia's comprehensive guide, the detector analyzes text across four categories:

### 1. Language and Tone
- Grandiose language and inflated symbolism
- Promotional phrasing about cultures/places
- Editorial commentary and unnecessary interpretation
- Overuse of conjunctive phrases
- Excessive em dashes
- Superficial analysis with -ing words

### 2. Structural Patterns
- Rule of three / triadic patterns
- Negative parallelism ("not X, but Y")
- Bolded bullet points with restatement
- Excessive boldface formatting

### 3. Content Issues
- Vague attribution and weasel wording
- Hallucinated or fabricated citations
- Contextless superlatives
- Generic filler content

### 4. Formatting and Technical Clues
- Title case in headings
- Markdown formatting artifacts
- Placeholder text
- Chatbot disclaimers and meta-text

## 🏗️ Architecture

```
Ai_writing_detector/
├── .github/
│   └── workflows/
│       └── update-wiki-data.yml    # Daily Wikipedia scraper
├── docs/                            # GitHub Pages root
│   ├── index.html                  # Main interface
│   ├── styles.css                  # Styling
│   ├── app.js                      # UI logic
│   ├── detector.js                 # Detection engine
│   └── wiki-data.json              # Latest Wikipedia data
├── scripts/
│   └── scrape-wiki.js              # Wikipedia scraper
├── package.json
└── README.md
```

## 🔧 How It Works

### 1. Data Collection Pipeline
- **GitHub Actions** runs daily at 2 AM UTC
- Scrapes Wikipedia's "Signs of AI Writing" article via API
- Parses content to extract signs, patterns, and examples
- Generates detection rules with regex patterns
- Commits updated `wiki-data.json` if changes detected

### 2. Detection Engine
- **Pattern Matching**: Uses regex to find specific phrases and structures
- **Keyword Analysis**: Identifies relevant keywords in context
- **Weighted Scoring**: Each sign weighted by severity (high/medium/low)
- **Category Aggregation**: Groups detections by category
- **Confidence Calculation**: Considers text length and detection diversity

### 3. User Interface
- **Text Input**: Paste text directly or load sample
- **Real-time Analysis**: Immediate feedback with detailed breakdown
- **Highlighted Results**: Visual highlighting with severity indicators
- **Export Options**: Download results in multiple formats

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (for running the scraper locally)
- GitHub account (for deploying)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Ai_writing_detector.git
   cd Ai_writing_detector
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the scraper** (optional)
   ```bash
   npm run scrape
   ```

4. **Serve locally**
   ```bash
   # Using Python
   cd docs
   python -m http.server 8000

   # Or using Node.js
   npx http-server docs
   ```

5. **Open in browser**
   ```
   http://localhost:8000
   ```

### Deployment to GitHub Pages

1. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: GitHub Actions
   - Save

2. **Push to your branch**
   ```bash
   git add .
   git commit -m "Initial deployment"
   git push origin your-branch-name
   ```

3. **Workflow automatically runs**
   - Scrapes Wikipedia article
   - Builds and deploys to GitHub Pages
   - Available at `https://yourusername.github.io/Ai_writing_detector/`

## 📊 Scoring Algorithm

The detector uses a multi-layered scoring approach:

```
Sign Score = log(matches + 1) × 20 × severity_multiplier × weight
Category Score = avg(sign_scores) × (0.7 + coverage_ratio × 0.3)
Overall Score = avg(category_scores) × (0.7 + length_factor × 0.15 + diversity_factor × 0.15)
```

**Severity Multipliers:**
- High: 3x
- Medium: 2x
- Low: 1x

**Confidence Levels:**
- **High**: 8+ signs detected, score ≥ 60
- **Medium-High**: 5+ signs, score ≥ 40
- **Medium**: 3+ signs, score ≥ 25
- **Low**: < 3 signs or score < 25

## ⚠️ Important Disclaimers

1. **Not 100% Accurate**: This detector identifies patterns commonly found in AI writing, but these patterns can also appear in human writing (especially marketing copy).

2. **Context Matters**: Some writing styles naturally use patterns that AI also uses. The detector provides indicators, not definitive proof.

3. **Educational Purpose**: Designed for education and awareness, not for definitive AI detection in high-stakes scenarios.

4. **Evolving Patterns**: AI writing patterns change as models improve. This tool tracks Wikipedia's latest documentation.

5. **No Guarantees**: Use this tool as one of many factors in assessing content, not as the sole determinant.

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Report Issues**: Found a bug or false positive? [Open an issue](https://github.com/yourusername/Ai_writing_detector/issues)
2. **Suggest Features**: Have ideas for improvement? Share them!
3. **Submit PRs**: Fork, improve, and submit pull requests
4. **Improve Documentation**: Help others understand the tool better

### Development Guidelines

- Follow existing code style
- Test thoroughly before submitting
- Update documentation as needed
- Keep commits focused and descriptive

## 📚 Resources

- [Wikipedia: Signs of AI Writing](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing)
- [Wikipedia: Project AI Cleanup](https://en.wikipedia.org/wiki/Wikipedia:Project_AI_Cleanup)
- [The Decoder: How to Spot AI Writing](https://the-decoder.com/heres-how-to-spot-ai-writing-according-to-wikipedia-editors/)
- [TechCrunch: Best Guide to Spotting AI Writing](https://techcrunch.com/2025/11/20/the-best-guide-to-spotting-ai-writing-comes-from-wikipedia/)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Wikipedia Community**: For compiling the comprehensive "Signs of AI Writing" guide
- **Project AI Cleanup**: For ongoing work to identify and address AI-generated content
- **Contributors**: Everyone who helps improve this tool

## 📞 Contact

- GitHub: [@yourusername](https://github.com/yourusername)
- Issues: [GitHub Issues](https://github.com/yourusername/Ai_writing_detector/issues)

---

**Note**: This tool is based on crowdsourced observations from Wikipedia editors. While useful for identifying common patterns, it should be used as a guide rather than absolute proof of AI generation.

## 🗺️ Roadmap

- [ ] Add support for multiple languages
- [ ] Implement API endpoint for programmatic access
- [ ] Add browser extension for on-page analysis
- [ ] Integrate with content management systems
- [ ] Machine learning-based pattern recognition
- [ ] Historical tracking of detection patterns
- [ ] Batch analysis for multiple documents
- [ ] Integration with plagiarism checkers

## 📈 Statistics

- **18+** AI writing signs tracked
- **4** major detection categories
- **Daily** updates from Wikipedia
- **100%** open source and free

---

Built with ❤️ by the community | Powered by Wikipedia's collective knowledge
