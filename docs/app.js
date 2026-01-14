// Application Logic for AI Writing Detector

let detector;
let currentResults = null;

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize detector
        detector = new AIWritingDetector();
        await detector.initialize();

        // Update UI with metadata
        updateMetadataUI();

        // Setup event listeners
        setupEventListeners();

        console.log('✓ Application initialized successfully');
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showError('Failed to load detector. Please refresh the page.');
    }
});

function updateMetadataUI() {
    if (!detector.wikiData) return;

    const lastUpdate = new Date(detector.wikiData.metadata.lastUpdated);
    const formattedDate = lastUpdate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    document.getElementById('lastUpdate').textContent = `Last updated: ${formattedDate}`;
    document.getElementById('signCount').textContent = `${detector.wikiData.statistics.totalSigns}`;
    document.getElementById('footerUpdate').textContent = formattedDate;
}

function setupEventListeners() {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });

    // Text input
    const textInput = document.getElementById('textInput');
    textInput.addEventListener('input', updateCharCount);
    textInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            analyzeText();
        }
    });

    // Buttons
    document.getElementById('analyzeBtn').addEventListener('click', analyzeText);
    document.getElementById('clearBtn').addEventListener('click', clearInput);
    document.getElementById('sampleBtn').addEventListener('click', loadSample);

    // Export buttons
    document.getElementById('exportJsonBtn').addEventListener('click', () => exportResults('json'));
    document.getElementById('exportTextBtn').addEventListener('click', () => exportResults('text'));
    document.getElementById('copyReportBtn').addEventListener('click', copyReport);

    // Toggle all signs
    document.getElementById('toggleAllSigns').addEventListener('click', toggleAllSigns);
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === `${tabName}Tab`);
    });
}

function updateCharCount() {
    const text = document.getElementById('textInput').value;
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    document.getElementById('charCount').textContent = `${charCount.toLocaleString()} characters, ${wordCount.toLocaleString()} words`;
}

async function analyzeText() {
    const text = document.getElementById('textInput').value.trim();

    if (!text) {
        showError('Please enter some text to analyze.');
        return;
    }

    if (text.length < 50) {
        showError('Please enter at least 50 characters for meaningful analysis.');
        return;
    }

    // Show loading
    document.getElementById('loadingIndicator').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'none';

    try {
        // Analyze text
        currentResults = detector.analyzeText(text);

        // Display results
        displayResults(currentResults);

        // Scroll to results
        setTimeout(() => {
            document.getElementById('resultsSection').scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);

    } catch (error) {
        console.error('Analysis error:', error);
        showError('An error occurred during analysis. Please try again.');
    } finally {
        document.getElementById('loadingIndicator').style.display = 'none';
    }
}

function displayResults(results) {
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';

    // Display overall score
    displayOverallScore(results);

    // Display category scores
    displayCategoryScores(results);

    // Display detected signs
    displayDetectedSigns(results);

    // Display highlighted text
    displayHighlightedText(results);
}

function displayOverallScore(results) {
    const scoreValue = document.getElementById('scoreValue');
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreSummary = document.getElementById('scoreSummary');
    const confidenceLevel = document.getElementById('confidenceLevel');
    const detectionCount = document.getElementById('detectionCount');

    // Animate score
    animateScore(scoreValue, results.overallScore);

    // Update score circle color
    scoreCircle.className = 'score-circle';
    if (results.overallScore >= 70) {
        scoreCircle.classList.add('score-very-high');
    } else if (results.overallScore >= 50) {
        scoreCircle.classList.add('score-high');
    } else if (results.overallScore >= 30) {
        scoreCircle.classList.add('score-medium');
    } else {
        scoreCircle.classList.add('score-low');
    }

    // Update summary
    scoreSummary.textContent = results.summary;

    // Update metadata
    confidenceLevel.textContent = `Confidence: ${results.confidence}`;
    detectionCount.textContent = `${results.detections.length} sign${results.detections.length !== 1 ? 's' : ''} detected`;
}

function animateScore(element, targetScore) {
    const duration = 1000;
    const steps = 50;
    const increment = targetScore / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
        current += increment;
        step++;

        if (step >= steps) {
            current = targetScore;
            clearInterval(timer);
        }

        element.textContent = Math.round(current);
    }, duration / steps);
}

function displayCategoryScores(results) {
    const container = document.getElementById('categoryScoresContainer');
    container.innerHTML = '';

    Object.entries(results.categoryScores).forEach(([category, score]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'category-score';

        const label = document.createElement('div');
        label.className = 'category-label';
        label.textContent = category;

        const barContainer = document.createElement('div');
        barContainer.className = 'category-bar-container';

        const bar = document.createElement('div');
        bar.className = 'category-bar';
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = `${score}%`;
        }, 100);

        if (score >= 70) bar.classList.add('bar-very-high');
        else if (score >= 50) bar.classList.add('bar-high');
        else if (score >= 30) bar.classList.add('bar-medium');
        else bar.classList.add('bar-low');

        const scoreLabel = document.createElement('div');
        scoreLabel.className = 'category-score-label';
        scoreLabel.textContent = score;

        barContainer.appendChild(bar);
        categoryDiv.appendChild(label);
        categoryDiv.appendChild(barContainer);
        categoryDiv.appendChild(scoreLabel);

        container.appendChild(categoryDiv);
    });
}

function displayDetectedSigns(results) {
    const container = document.getElementById('detectedSignsContainer');
    const noSignsMessage = document.getElementById('noSignsMessage');

    container.innerHTML = '';

    if (results.detections.length === 0) {
        noSignsMessage.style.display = 'block';
        return;
    }

    noSignsMessage.style.display = 'none';

    // Sort by score (highest first)
    const sortedDetections = [...results.detections].sort((a, b) => b.score - a.score);

    sortedDetections.forEach((detection, index) => {
        const signDiv = document.createElement('div');
        signDiv.className = 'detected-sign';

        const header = document.createElement('div');
        header.className = 'sign-header';
        header.onclick = () => toggleSign(index);

        const title = document.createElement('div');
        title.className = 'sign-title';

        const severityBadge = document.createElement('span');
        severityBadge.className = `severity-badge severity-${detection.severity}`;
        severityBadge.textContent = detection.severity;

        const name = document.createElement('span');
        name.textContent = detection.signName;

        title.appendChild(severityBadge);
        title.appendChild(name);

        const meta = document.createElement('div');
        meta.className = 'sign-meta';
        meta.innerHTML = `
            Score: ${detection.score}/100 |
            ${detection.matches.length} match${detection.matches.length !== 1 ? 'es' : ''}
            <span class="toggle-icon">▼</span>
        `;

        header.appendChild(title);
        header.appendChild(meta);

        const content = document.createElement('div');
        content.className = 'sign-content';
        content.id = `sign-content-${index}`;

        const description = document.createElement('p');
        description.className = 'sign-description';
        description.textContent = detection.description;

        const citation = document.createElement('div');
        citation.className = 'sign-citation';
        citation.innerHTML = `
            <strong>Wikipedia Reference:</strong>
            <a href="${detector.wikiData.metadata.sourceUrl}" target="_blank" rel="noopener">
                ${detection.wikiSection}
            </a>
        `;

        const matchesTitle = document.createElement('h4');
        matchesTitle.textContent = 'Detected Matches:';

        const matchesList = document.createElement('div');
        matchesList.className = 'matches-list';

        // Show up to 5 matches
        detection.matches.slice(0, 5).forEach(match => {
            const matchDiv = document.createElement('div');
            matchDiv.className = 'match-item';

            const matchValue = document.createElement('code');
            matchValue.textContent = match.value;

            const matchContext = document.createElement('div');
            matchContext.className = 'match-context';
            matchContext.textContent = `Context: ${match.context.text}`;

            matchDiv.appendChild(matchValue);
            matchDiv.appendChild(matchContext);
            matchesList.appendChild(matchDiv);
        });

        if (detection.matches.length > 5) {
            const moreMatches = document.createElement('p');
            moreMatches.className = 'more-matches';
            moreMatches.textContent = `... and ${detection.matches.length - 5} more`;
            matchesList.appendChild(moreMatches);
        }

        content.appendChild(description);
        content.appendChild(citation);
        content.appendChild(matchesTitle);
        content.appendChild(matchesList);

        signDiv.appendChild(header);
        signDiv.appendChild(content);

        container.appendChild(signDiv);
    });
}

function toggleSign(index) {
    const content = document.getElementById(`sign-content-${index}`);
    const isExpanded = content.style.display === 'block';

    content.style.display = isExpanded ? 'none' : 'block';

    // Update icon
    const icon = content.previousElementSibling.querySelector('.toggle-icon');
    icon.textContent = isExpanded ? '▼' : '▲';
}

function toggleAllSigns() {
    const button = document.getElementById('toggleAllSigns');
    const allContents = document.querySelectorAll('.sign-content');
    const isExpanding = button.textContent === 'Expand All';

    allContents.forEach(content => {
        content.style.display = isExpanding ? 'block' : 'none';
    });

    // Update all icons
    document.querySelectorAll('.toggle-icon').forEach(icon => {
        icon.textContent = isExpanding ? '▲' : '▼';
    });

    button.textContent = isExpanding ? 'Collapse All' : 'Expand All';
}

function displayHighlightedText(results) {
    const container = document.getElementById('highlightedTextContainer');
    const highlightedHtml = detector.highlightMatches(results.text, results.detections);
    container.innerHTML = highlightedHtml;
}

function toggleLegend() {
    const legend = document.getElementById('highlightLegend');
    const icon = document.getElementById('legendToggleIcon');
    const isVisible = legend.style.display !== 'none';

    legend.style.display = isVisible ? 'none' : 'flex';
    icon.textContent = isVisible ? '▶' : '▼';
}

function exportResults(format) {
    if (!currentResults) {
        showError('No results to export. Please analyze text first.');
        return;
    }

    try {
        const exported = detector.exportResults(format);
        downloadFile(exported, `ai-detection-results.${format}`, format === 'json' ? 'application/json' : 'text/plain');
        showSuccess(`Results exported as ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Export error:', error);
        showError('Failed to export results.');
    }
}

function copyReport() {
    if (!currentResults) {
        showError('No results to copy. Please analyze text first.');
        return;
    }

    try {
        const report = detector.formatResultsAsText(currentResults);
        navigator.clipboard.writeText(report).then(() => {
            showSuccess('Report copied to clipboard!');
        }).catch(() => {
            showError('Failed to copy to clipboard.');
        });
    } catch (error) {
        console.error('Copy error:', error);
        showError('Failed to copy report.');
    }
}

function downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

function clearInput() {
    document.getElementById('textInput').value = '';
    document.getElementById('urlInput').value = '';
    updateCharCount();
    document.getElementById('resultsSection').style.display = 'none';
    currentResults = null;
}

function loadSample() {
    const sampleText = `The Implementation of Advanced Technologies: A Comprehensive Overview

In today's modern world, it's important to note that technology serves as a testament to human innovation and progress. Moreover, the integration of artificial intelligence stands as a powerful reminder of our capacity for advancement.

The benefits of this technology are breathtaking and stunning in their scope. It's not just about automation—it's about revolutionizing entire industries. Furthermore, experts say that the impact will be transformative, ensuring that businesses can leverage these capabilities while highlighting the importance of ethical considerations.

Key Features:
**Innovation**: The system showcases innovation in every aspect.
**Efficiency**: Efficiency is dramatically improved through automation.
**Scalability**: Scalability ensures growth potential for organizations.

Studies have shown that industry reports suggest significant improvements in productivity—making it clear that this technology plays a vital role in modern enterprise. As of my last update, the adoption rate continues to increase, demonstrating the value of these solutions.`;

    document.getElementById('textInput').value = sampleText;
    updateCharCount();
    showSuccess('Sample text loaded! Click "Analyze Text" to see the detector in action.');
}

function showError(message) {
    showNotification(message, 'error');
}

function showSuccess(message) {
    showNotification(message, 'success');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Fade in
    setTimeout(() => notification.classList.add('show'), 10);

    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Utility function for legend toggle (called from HTML)
window.toggleLegend = toggleLegend;
