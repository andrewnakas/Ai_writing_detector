// Application Logic for AI Writing Detector

let patternDetector;
let compressionDetector;
let imageVideoDetector;
let currentResults = null;
let currentImageFile = null;
let debugLogs = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Initialize all detectors
        patternDetector = new AIWritingDetector();
        await patternDetector.initialize();

        compressionDetector = new CompressionDetector();

        imageVideoDetector = new ImageVideoDetector();

        // Update UI with metadata
        updateMetadataUI();

        // Setup event listeners
        setupEventListeners();

        console.log('✓ Application initialized successfully');
        debugLog('Application initialized successfully');
        debugLog('Class checks:');
        debugLog('- FFTAnalyzer:', typeof FFTAnalyzer);
        debugLog('- MetadataDetector:', typeof MetadataDetector);
        debugLog('- PixelAnalysisDetector:', typeof PixelAnalysisDetector);
        debugLog('- AIModelDetector:', typeof AIModelDetector);
        debugLog('- ImageVideoDetector:', typeof ImageVideoDetector);
        debugLog('imageVideoDetector instance:', typeof imageVideoDetector);
        debugLog('');
        debugLog('🤖 Transformers.js status:');
        debugLog('- window.pipeline:', typeof window.pipeline);
        debugLog('- window.transformersReady:', typeof window.transformersReady);
        debugLog('- window.transformersEnv:', typeof window.transformersEnv);
    } catch (error) {
        console.error('Failed to initialize application:', error);
        debugLog('FATAL ERROR during initialization:', error.message);
        debugLog('Error stack:', error.stack);
        showError('Failed to load detector. Please refresh the page.');
    }
});

function updateMetadataUI() {
    if (!patternDetector.wikiData) return;

    const lastUpdate = new Date(patternDetector.wikiData.metadata.lastUpdated);
    const formattedDate = lastUpdate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    document.getElementById('lastUpdate').textContent = `Last updated: ${formattedDate}`;
    document.getElementById('signCount').textContent = `${patternDetector.wikiData.statistics.totalSigns}`;
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

    // Image/Video upload
    setupImageUploadListeners();
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

    // Update analyze button text based on tab
    const analyzeBtn = document.getElementById('analyzeBtn');
    if (tabName === 'image') {
        analyzeBtn.innerHTML = '🔍 Analyze Image';
    } else {
        analyzeBtn.innerHTML = '🔍 Analyze Text';
    }

    // Hide results when switching tabs
    document.getElementById('resultsSection').style.display = 'none';
}

function updateCharCount() {
    const text = document.getElementById('textInput').value;
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(w => w.length > 0).length;

    document.getElementById('charCount').textContent = `${charCount.toLocaleString()} characters, ${wordCount.toLocaleString()} words`;
}

async function analyzeText() {
    // Check which tab is active
    const activeTab = document.querySelector('.tab-button.active').dataset.tab;
    debugLog('=== Analyze button clicked ===');
    debugLog('Active tab:', activeTab);

    if (activeTab === 'image') {
        debugLog('Routing to IMAGE analysis');
        return analyzeImage();
    }

    debugLog('Routing to TEXT analysis');

    // Text analysis
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
        // Run both detectors with individual error handling
        let patternResults, compressionResults;

        console.log('Starting pattern-based analysis...');
        try {
            patternResults = patternDetector.analyzeText(text);
            console.log('Pattern-based analysis complete:', patternResults);
        } catch (error) {
            console.error('Pattern detector error:', error);
            showError('Pattern-based analysis failed: ' + error.message);
            document.getElementById('loadingIndicator').style.display = 'none';
            return;
        }

        console.log('Starting compression-based analysis...');
        try {
            compressionResults = await compressionDetector.analyze(text);
            console.log('Compression-based analysis complete:', compressionResults);
        } catch (error) {
            console.error('Compression detector error:', error);
            console.warn('Using fallback compression results');
            // Use fallback compression results if it fails
            compressionResults = {
                method: 'Compression-Based',
                score: 0,
                confidence: 'low',
                explanation: 'Compression analysis unavailable: ' + error.message,
                metrics: {
                    textAloneRatio: 0,
                    withAICorpusRatio: 0,
                    difference: 0,
                    textLength: text.length
                }
            };
        }

        // Combine results
        currentResults = {
            patternBased: patternResults,
            compressionBased: compressionResults,
            combined: calculateCombinedScore(patternResults, compressionResults),
            text: text
        };

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

function calculateCombinedScore(patternResults, compressionResults) {
    // Weight pattern-based detector more heavily (70%) as it's more specific
    // Compression detector contributes 30%
    const patternWeight = 0.70;
    const compressionWeight = 0.30;

    const combinedScore = Math.round(
        patternResults.overallScore * patternWeight +
        compressionResults.score * compressionWeight
    );

    // Determine combined confidence
    let confidence = 'low';
    if (patternResults.confidence === 'high' && compressionResults.confidence === 'high') {
        confidence = 'high';
    } else if (patternResults.confidence === 'high' || compressionResults.confidence === 'high') {
        confidence = 'medium-high';
    } else if (patternResults.confidence === 'medium' || compressionResults.confidence === 'medium') {
        confidence = 'medium';
    }

    // Generate agreement analysis
    const scoreDifference = Math.abs(patternResults.overallScore - compressionResults.score);
    let agreement = '';
    if (scoreDifference < 10) {
        agreement = '✓ Both methods strongly agree';
    } else if (scoreDifference < 25) {
        agreement = '~ Methods moderately agree';
    } else {
        agreement = '⚠ Methods show different assessments';
    }

    return {
        score: combinedScore,
        confidence: confidence,
        agreement: agreement,
        scoreDifference: scoreDifference
    };
}

function displayResults(results) {
    // Show results section
    document.getElementById('resultsSection').style.display = 'block';

    // Show text-specific sections (hide for image analysis)
    const categoryCard = document.querySelector('#categoryScoresContainer').closest('.card');
    const signsCard = document.querySelector('#detectedSignsContainer').closest('.card');
    const highlightCard = document.querySelector('#highlightedTextContainer').closest('.card');

    if (categoryCard) categoryCard.style.display = 'block';
    if (signsCard) signsCard.style.display = 'block';
    if (highlightCard) highlightCard.style.display = 'block';

    // Display overall combined score
    displayOverallScore(results);

    // Display detection methods comparison
    displayDetectionMethods(results);

    // Display category scores (pattern-based)
    displayCategoryScores(results.patternBased);

    // Display detected signs (pattern-based)
    displayDetectedSigns(results.patternBased);

    // Display highlighted text (pattern-based) - pass full results
    displayHighlightedText(results);
}

function displayDetectionMethods(results) {
    const container = document.getElementById('detectionMethodsContainer');

    if (!results || !results.patternBased || !results.compressionBased || !results.combined) {
        container.innerHTML = '<p>Error displaying detection methods.</p>';
        return;
    }

    const patternScore = results.patternBased.overallScore || 0;
    const patternConfidence = results.patternBased.confidence || 'unknown';
    const patternDetections = results.patternBased.detections || [];

    const compressionScore = results.compressionBased.score || 0;
    const compressionConfidence = results.compressionBased.confidence || 'unknown';
    const compressionExplanation = results.compressionBased.explanation || 'No explanation available';
    const metrics = results.compressionBased.metrics || {};

    const combinedScore = results.combined.score || 0;
    const combinedConfidence = results.combined.confidence || 'unknown';
    const combinedAgreement = results.combined.agreement || '';

    container.innerHTML = `
        <div class="method-card">
            <div class="method-header">
                <span class="method-icon">🎯</span>
                <h4>Pattern-Based</h4>
            </div>
            <div class="method-score-display">
                <div class="method-score">${patternScore}</div>
                <div class="method-score-label">/100</div>
            </div>
            <p class="method-confidence">Confidence: ${patternConfidence}</p>
            <p class="method-description">Analyzes ${patternDetections.length} Wikipedia-documented patterns including language tone, structure, and technical artifacts.</p>
        </div>

        <div class="method-card">
            <div class="method-header">
                <span class="method-icon">📦</span>
                <h4>Compression-Based</h4>
            </div>
            <div class="method-score-display">
                <div class="method-score">${compressionScore}</div>
                <div class="method-score-label">/100</div>
            </div>
            <p class="method-confidence">Confidence: ${compressionConfidence}</p>
            <p class="method-description">${compressionExplanation}</p>
            <details class="method-details" open>
                <summary>🔍 Debug Metrics (tap to copy)</summary>
                <textarea readonly class="debug-console" rows="11" style="width: 100%; font-family: monospace; font-size: 0.75rem; padding: 0.5rem; margin-top: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-tertiary); resize: vertical;">Text alone ratio: ${metrics.textAloneRatio || 'N/A'}
AI corpus ratio: ${metrics.corpusOnlyRatio || 'N/A'}
Seeded ratio: ${metrics.withAICorpusRatio || 'N/A'}
Expected ratio: ${metrics.expectedRatio || 'N/A'}
Difference: ${metrics.difference || 'N/A'} ${metrics.difference > 0 ? '(AI-like)' : '(Human-like)'}
Normalized: ${metrics.normalized || 'N/A'}
Soft-capped: ${metrics.softCapped || 'N/A'}
Raw score: ${metrics.rawScore || 'N/A'}
Text length: ${metrics.textLength || 'N/A'} chars

Tap anywhere in this box to select all and copy</textarea>
            </details>
        </div>

        <div class="method-card method-card-combined">
            <div class="method-header">
                <span class="method-icon">⚖️</span>
                <h4>Combined Score</h4>
            </div>
            <div class="method-score-display">
                <div class="method-score method-score-combined">${combinedScore}</div>
                <div class="method-score-label">/100</div>
            </div>
            <p class="method-confidence">Overall: ${combinedConfidence}</p>
            <p class="method-agreement">${combinedAgreement}</p>
            <p class="method-description">Weighted average: 70% pattern-based, 30% compression-based analysis.</p>
        </div>
    `;
}

function displayOverallScore(results) {
    const scoreValue = document.getElementById('scoreValue');
    const scoreCircle = document.getElementById('scoreCircle');
    const scoreSummary = document.getElementById('scoreSummary');
    const confidenceLevel = document.getElementById('confidenceLevel');
    const detectionCount = document.getElementById('detectionCount');

    // Use combined score for overall display
    const combinedScore = results.combined.score;

    // Animate score
    animateScore(scoreValue, combinedScore);

    // Update score circle color
    scoreCircle.className = 'score-circle';
    if (combinedScore >= 70) {
        scoreCircle.classList.add('score-very-high');
    } else if (combinedScore >= 50) {
        scoreCircle.classList.add('score-high');
    } else if (combinedScore >= 30) {
        scoreCircle.classList.add('score-medium');
    } else {
        scoreCircle.classList.add('score-low');
    }

    // Generate combined summary
    let likelihood = '';
    if (combinedScore >= 70) {
        likelihood = 'very high likelihood';
    } else if (combinedScore >= 50) {
        likelihood = 'high likelihood';
    } else if (combinedScore >= 30) {
        likelihood = 'moderate likelihood';
    } else if (combinedScore >= 15) {
        likelihood = 'some indicators';
    } else {
        likelihood = 'few indicators';
    }

    scoreSummary.textContent = `Multi-method analysis shows ${likelihood} of AI generation. ${results.combined.agreement}`;

    // Update metadata
    confidenceLevel.textContent = `Combined Confidence: ${results.combined.confidence}`;
    detectionCount.textContent = `${results.patternBased.detections.length} pattern${results.patternBased.detections.length !== 1 ? 's' : ''} detected`;
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
    try {
        const container = document.getElementById('detectedSignsContainer');
        const noSignsMessage = document.getElementById('noSignsMessage');

        if (!container) {
            console.error('detectedSignsContainer not found!');
            return;
        }

        container.innerHTML = '';

        console.log('displayDetectedSigns called with', results.detections ? results.detections.length : 0, 'detections');

        if (!results.detections || results.detections.length === 0) {
            if (noSignsMessage) noSignsMessage.style.display = 'block';
            return;
        }

        if (noSignsMessage) noSignsMessage.style.display = 'none';

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
            <a href="${patternDetector.wikiData.metadata.sourceUrl}" target="_blank" rel="noopener">
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

    } catch (error) {
        console.error('Error in displayDetectedSigns:', error);
    }
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
    try {
        const container = document.getElementById('highlightedTextContainer');

        if (!container) {
            console.error('highlightedTextContainer not found!');
            return;
        }

        if (!results || !results.text) {
            console.error('No text in results:', results);
            container.innerHTML = '<p style="color: var(--danger-color);">Error: No text to highlight</p>';
            return;
        }

        if (!results.patternBased || !results.patternBased.detections) {
            console.error('No detections in results:', results);
            container.innerHTML = '<p style="color: var(--warning-color);">No patterns detected in this text.</p>';
            return;
        }

        console.log('Highlighting text with', results.patternBased.detections.length, 'detections');
        const highlightedHtml = patternDetector.highlightMatches(results.text, results.patternBased.detections);
        container.innerHTML = highlightedHtml;
        console.log('Highlighted text displayed successfully');

    } catch (error) {
        console.error('Error in displayHighlightedText:', error);
        const container = document.getElementById('highlightedTextContainer');
        if (container) {
            container.innerHTML = `<p style="color: var(--danger-color);">Error displaying highlighted text: ${error.message}</p>`;
        }
    }
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
        const exported = patternDetector.exportResults(format);
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
        // Use the pattern detector's built-in export (it stores results internally)
        const report = patternDetector.exportResults('text');
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

// Debug Console Functions
function debugLog(message, data = null) {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    debugLogs.push(logEntry);
    if (data) {
        debugLogs.push(JSON.stringify(data, null, 2));
    }
    console.log(message, data);
    updateDebugConsole();
}

function updateDebugConsole() {
    const debugConsole = document.getElementById('mobileDebugConsole');
    if (debugConsole) {
        debugConsole.value = debugLogs.join('\n');
        debugConsole.scrollTop = debugConsole.scrollHeight;
    }
}

function clearDebugConsole() {
    debugLogs = [];
    updateDebugConsole();
}

// Image/Video Upload Functions

function setupImageUploadListeners() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('imageFileInput');
    const removeBtn = document.getElementById('removeFileBtn');

    // Click to browse
    dropZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelection(e.target.files[0]);
        }
    });

    // Drag and drop
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelection(e.dataTransfer.files[0]);
        }
    });

    // Remove file
    removeBtn.addEventListener('click', () => {
        currentImageFile = null;
        document.getElementById('dropZone').style.display = 'flex';
        document.getElementById('filePreviewContainer').style.display = 'none';
        document.getElementById('filePreview').innerHTML = '';
        document.getElementById('inlineImageResults').style.display = 'none';
        fileInput.value = '';
        document.getElementById('resultsSection').style.display = 'none';
    });
}

function handleFileSelection(file) {
    debugLog('=== File selected ===');
    debugLog('File name:', file.name);
    debugLog('File size:', file.size + ' bytes');
    debugLog('File type:', file.type);

    currentImageFile = file;

    // Validate file
    debugLog('Validating file...');
    const validation = imageVideoDetector.validateFile(file);
    debugLog('Validation result:', validation.valid ? 'VALID' : 'INVALID');

    if (!validation.valid) {
        debugLog('Validation error:', validation.error);
        showError(validation.error);
        return;
    }

    // Show preview
    debugLog('Showing file preview...');
    const dropZone = document.getElementById('dropZone');
    const previewContainer = document.getElementById('filePreviewContainer');
    const preview = document.getElementById('filePreview');

    dropZone.style.display = 'none';
    previewContainer.style.display = 'block';

    if (validation.isImage) {
        const reader = new FileReader();
        reader.onload = (e) => {
            preview.innerHTML = `
                <img src="${e.target.result}" alt="Preview">
                <div class="file-preview-info">
                    <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)
                </div>
            `;
        };
        reader.readAsDataURL(file);
    } else if (validation.isVideo) {
        preview.innerHTML = `
            <div class="file-preview-info">
                <span style="font-size: 3rem;">🎥</span><br>
                <strong>${file.name}</strong> (${(file.size / (1024 * 1024)).toFixed(2)} MB)<br>
                <em>Video detection coming soon!</em>
            </div>
        `;
    }

    showSuccess('File loaded! Click "Analyze" to detect AI generation.');
}

async function analyzeImage() {
    debugLog('=== analyzeImage() called ===');
    debugLog('currentImageFile exists:', currentImageFile ? 'YES' : 'NO');

    if (currentImageFile) {
        debugLog('File name:', currentImageFile.name);
        debugLog('File size:', currentImageFile.size + ' bytes');
        debugLog('File type:', currentImageFile.type);
    }

    if (!currentImageFile) {
        debugLog('ERROR: No image file uploaded');
        showError('Please upload an image first.');
        return;
    }

    debugLog('imageVideoDetector exists:', imageVideoDetector ? 'YES' : 'NO');
    debugLog('typeof imageVideoDetector:', typeof imageVideoDetector);

    // Debug AI model availability
    debugLog('🤖 AIModelDetector class exists:', typeof AIModelDetector !== 'undefined' ? 'YES' : 'NO');
    debugLog('🤖 window.pipeline exists:', typeof window.pipeline !== 'undefined' ? 'YES' : 'NO');
    debugLog('🤖 Transformers.js ready promise:', window.transformersReady ? 'YES' : 'NO');

    // Show loading
    const loadingIndicator = document.getElementById('loadingIndicator');
    loadingIndicator.style.display = 'block';
    loadingIndicator.querySelector('p').textContent = 'Analyzing image (pixel, metadata, AI model)...';
    document.getElementById('resultsSection').style.display = 'none';

    try {
        debugLog('Calling imageVideoDetector.analyzeImage()...');

        const results = await imageVideoDetector.analyzeImage(currentImageFile);

        debugLog('Image analysis complete!');
        debugLog('Results received:', results ? 'YES' : 'NO');

        currentResults = results;

        // Display results
        debugLog('Calling displayImageResults()...');
        displayImageResults(results);
        debugLog('Results displayed successfully');

        // Log the actual scores to debug console
        debugLog('');
        debugLog('========== ANALYSIS RESULTS ==========');
        debugLog('PIXEL ANALYSIS SCORE:', results.pixelAnalysis.score + '/100');
        debugLog('METADATA ANALYSIS SCORE:', results.metadataAnalysis.score + '/100');
        debugLog('🤖 AI MODEL SCORE:', results.aiModelAnalysis ? (results.aiModelAnalysis.score + '/100') : 'NOT AVAILABLE');
        debugLog('🤖 AI MODEL AVAILABLE:', results.aiModelAnalysis?.details?.available ? 'YES' : 'NO');
        if (results.aiModelAnalysis && !results.aiModelAnalysis.details?.available) {
            debugLog('🤖 AI MODEL REASON:', results.aiModelAnalysis.details?.reason || results.aiModelAnalysis.explanation);
        }
        debugLog('COMBINED SCORE:', results.combined.score + '/100');
        debugLog('METHODS USED:', results.combined.methodsUsed || 'unknown');
        debugLog('ASSESSMENT:', results.combined.assessment);
        debugLog('CONFIDENCE:', results.combined.confidence);
        debugLog('AGREEMENT:', results.combined.agreement);
        debugLog('======================================');
        debugLog('');

        // Show notification to scroll up
        showSuccess('✓ Analysis complete! Scores: Pixel=' + results.pixelAnalysis.score + ', Metadata=' + results.metadataAnalysis.score + ', Combined=' + results.combined.score);

        // Scroll to results - force it to the top
        setTimeout(() => {
            debugLog('Attempting to scroll to results...');
            const resultsSection = document.getElementById('resultsSection');

            // Log position info
            const rect = resultsSection.getBoundingClientRect();
            debugLog('Results section position - Top:', rect.top, 'Left:', rect.left, 'Visible:', rect.top >= 0 && rect.top <= window.innerHeight);
            debugLog('Results section display:', window.getComputedStyle(resultsSection).display);
            debugLog('Results section visibility:', window.getComputedStyle(resultsSection).visibility);

            // Force scroll to top of page where results are
            window.scrollTo({ top: 0, behavior: 'smooth' });
            debugLog('Scrolled to top of page');

            // Also try scrollIntoView
            resultsSection.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            debugLog('scrollIntoView command sent');
        }, 300);

    } catch (error) {
        debugLog('ERROR in image analysis:', error.message);
        debugLog('Error stack:', error.stack);
        showError('Image analysis error: ' + error.message + ' (check debug console below)');
    } finally {
        const loadingIndicator = document.getElementById('loadingIndicator');
        loadingIndicator.style.display = 'none';
        loadingIndicator.querySelector('p').textContent = 'Analyzing text...';
    }
}

function displayImageResults(results) {
    debugLog('=== displayImageResults() called ===');
    debugLog('Results object keys:', Object.keys(results).join(', '));

    try {
        // Show INLINE results in the image tab
        const inlineResults = document.getElementById('inlineImageResults');
        const inlineContent = document.getElementById('inlineImageResultsContent');

        debugLog('inlineImageResults:', inlineResults ? 'FOUND' : 'NOT FOUND');
        debugLog('inlineImageResultsContent:', inlineContent ? 'FOUND' : 'NOT FOUND');

        if (inlineResults && inlineContent) {
            inlineResults.style.display = 'block';
            inlineContent.innerHTML = generateInlineImageResults(results);
            debugLog('Inline results populated and displayed');
        }

        // Also show results section (for desktop users who scroll)
        const resultsSection = document.getElementById('resultsSection');
        debugLog('resultsSection element:', resultsSection ? 'FOUND' : 'NOT FOUND');

        resultsSection.style.display = 'block';
        debugLog('Set resultsSection display to block');

        // Display overall score
        debugLog('Calling displayImageOverallScore()...');
        displayImageOverallScore(results);
        debugLog('displayImageOverallScore() complete');

        // Display detection methods
        debugLog('Calling displayImageDetectionMethods()...');
        displayImageDetectionMethods(results);
        debugLog('displayImageDetectionMethods() complete');

        // Hide text-specific sections
        debugLog('Hiding text-specific sections...');
        const categoryCard = document.getElementById('categoryScoresContainer')?.closest('.card');
        const signsCard = document.getElementById('detectedSignsContainer')?.closest('.card');
        const highlightCard = document.getElementById('highlightedTextContainer')?.closest('.card');

        debugLog('categoryCard:', categoryCard ? 'FOUND' : 'NOT FOUND');
        debugLog('signsCard:', signsCard ? 'FOUND' : 'NOT FOUND');
        debugLog('highlightCard:', highlightCard ? 'FOUND' : 'NOT FOUND');

        if (categoryCard) categoryCard.style.display = 'none';
        if (signsCard) signsCard.style.display = 'none';
        if (highlightCard) highlightCard.style.display = 'none';

        debugLog('=== Image results displayed successfully ===');
    } catch (error) {
        debugLog('ERROR in displayImageResults:', error.message);
        debugLog('Error stack:', error.stack);
    }
}

function generateInlineImageResults(results) {
    const pixel = results.pixelAnalysis || {};
    const metadata = results.metadataAnalysis || {};
    const aiModel = results.aiModelAnalysis || {};
    const combined = results.combined || {};
    const imageInfo = results.imageInfo || {};

    // Determine score color
    const getScoreColor = (score) => {
        if (score >= 70) return 'var(--danger-color)';
        if (score >= 50) return '#ff9800';
        if (score >= 30) return '#ffc107';
        return 'var(--success-color)';
    };

    // Generate pixel sub-methods breakdown
    const pixelDetails = pixel.details || {};
    const generatePixelSubMethods = () => {
        if (!pixelDetails) return '';

        const methods = [
            { name: 'Upsampling Artifacts', data: pixelDetails.upsampling, icon: '🔄', weight: '30%' },
            { name: 'Frequency Analysis (FFT)', data: pixelDetails.frequency, icon: '📊', weight: '25%' },
            { name: 'Checkerboard Patterns', data: pixelDetails.checkerboard, icon: '🏁', weight: '15%' },
            { name: 'Texture Analysis', data: pixelDetails.texture, icon: '🎨', weight: '15%' },
            { name: 'Noise Analysis', data: pixelDetails.noise, icon: '🌫️', weight: '10%' },
            { name: 'Color Distribution', data: pixelDetails.color, icon: '🌈', weight: '5%' }
        ];

        return methods.map(method => {
            if (!method.data) return '';
            const score = method.data.aiLikelihood || 0;
            return `
                <div style="background: var(--bg-tertiary); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 0.5rem;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                        <span style="font-weight: 600;">${method.icon} ${method.name}</span>
                        <span style="font-size: 1.25rem; font-weight: bold; color: ${getScoreColor(score)};">${Math.round(score)}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">Weight: ${method.weight}</div>
                    ${generateMethodDetails(method.name, method.data)}
                </div>
            `;
        }).join('');
    };

    // Generate detailed info for each detection method
    const generateMethodDetails = (methodName, data) => {
        if (!data) return '';

        switch(methodName) {
            case 'Upsampling Artifacts':
                return data.duplicateRatio ? `
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Duplicate pixel ratio: ${(data.duplicateRatio * 100).toFixed(2)}%
                        ${data.duplicateRatio > 0.14 ? '<br><span style="color: var(--danger-color);">⚠️ High upsampling detected</span>' : ''}
                    </div>
                ` : '';

            case 'Frequency Analysis (FFT)':
                return data.rioStdDev !== undefined ? `
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        ${data.rioScore !== undefined ? `RIO score: ${Math.round(data.rioScore)}/100<br>` : ''}
                        ${data.highFreqScore !== undefined ? `High-freq score: ${Math.round(data.highFreqScore)}/100<br>` : ''}
                        High freq ratio: ${(data.highFreqRatio * 100).toFixed(1)}%
                        ${data.highFreqRatio > 0.55 ? '<br><span style="color: var(--danger-color);">⚠️ Elevated high-frequency content (GAN/diffusion)</span>' : ''}
                    </div>
                ` : '';

            case 'Checkerboard Patterns':
                return data.checkerboardRatio !== undefined ? `
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Pattern ratio: ${(data.checkerboardRatio * 100).toFixed(2)}%
                        ${data.checkerboardRatio > 0.05 ? '<br><span style="color: var(--danger-color);">⚠️ GAN artifact detected</span>' : ''}
                    </div>
                ` : '';

            case 'Texture Analysis':
                return data.entropy !== undefined ? `
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Entropy: ${data.entropy.toFixed(2)} | Contrast: ${data.contrast?.toFixed(0) || 'N/A'}
                    </div>
                ` : '';

            case 'Noise Analysis':
                return data.avgNoise !== undefined ? `
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Avg noise level: ${data.avgNoise.toFixed(2)}
                        ${data.avgNoise < 2 ? '<br><span style="color: var(--danger-color);">⚠️ Unnaturally smooth</span>' : ''}
                    </div>
                ` : '';

            case 'Color Distribution':
                return data.avgSmoothness !== undefined ? `
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        Smoothness: ${(data.avgSmoothness * 100).toFixed(1)}%
                    </div>
                ` : '';

            default:
                return '';
        }
    };

    // Generate AI model predictions
    const generateAIModelPredictions = () => {
        if (!aiModel.details || !aiModel.details.available) {
            return '<p style="color: var(--text-muted); font-style: italic;">AI model detection unavailable (Transformers.js not loaded or model failed to load)</p>';
        }

        const predictions = aiModel.details.predictions || [];
        const indicators = aiModel.details.aiIndicators || [];
        const reasoning = aiModel.details.reasoning || [];

        return `
            <div style="margin-top: 0.5rem;">
                <p><strong>Model:</strong> ${aiModel.details.modelName}</p>

                ${predictions.length > 0 ? `
                    <p style="margin-top: 0.75rem;"><strong>Top Classifications:</strong></p>
                    <div style="margin-top: 0.5rem;">
                        ${predictions.slice(0, 5).map((pred, i) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-tertiary); padding: 0.5rem; border-radius: var(--radius-sm); margin-bottom: 0.25rem;">
                                <span style="font-size: 0.875rem;">${i + 1}. ${pred.label}</span>
                                <span style="font-weight: 600; color: ${getScoreColor(pred.score * 100)};">${(pred.score * 100).toFixed(1)}%</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}

                ${indicators.length > 0 ? `
                    <p style="margin-top: 0.75rem;"><strong>AI Indicators:</strong></p>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem;">
                        ${indicators.map(ind => `<li>${ind}</li>`).join('')}
                    </ul>
                ` : ''}

                ${reasoning.length > 0 ? `
                    <p style="margin-top: 0.75rem;"><strong>Reasoning:</strong></p>
                    <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem; color: var(--text-secondary);">
                        ${reasoning.map(r => `<li>${r}</li>`).join('')}
                    </ul>
                ` : ''}
            </div>
        `;
    };

    return `
        <!-- Image Display -->
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <img src="${results.imageElement.src}" alt="Analyzed Image" style="max-width: 100%; max-height: 400px; border-radius: var(--radius-md); box-shadow: var(--shadow-md); margin-bottom: 1rem;">
        </div>

        <!-- Score Overview -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
            <div style="background: linear-gradient(135deg, ${getScoreColor(combined.score)}15, ${getScoreColor(combined.score)}05); border: 2px solid ${getScoreColor(combined.score)}; padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                <div style="font-size: 3rem; font-weight: bold; color: ${getScoreColor(combined.score)};">
                    ${combined.score}
                </div>
                <div style="font-size: 0.875rem; color: var(--text-primary); margin-top: 0.25rem; font-weight: 600;">
                    Combined Score
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                    ${combined.methodsUsed} methods · ${combined.confidence} confidence
                </div>
            </div>

            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: ${getScoreColor(pixel.score)};">
                    ${pixel.score || 0}
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    🔬 Pixel Analysis
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                    ${combined.breakdown?.pixelWeight ? `${Math.round(combined.breakdown.pixelWeight * 100)}% weight` : ''}
                </div>
            </div>

            <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                <div style="font-size: 2rem; font-weight: bold; color: ${getScoreColor(metadata.score)};">
                    ${metadata.score || 0}
                </div>
                <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                    📋 Metadata
                </div>
                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                    ${combined.breakdown?.metadataWeight ? `${Math.round(combined.breakdown.metadataWeight * 100)}% weight` : ''}
                </div>
            </div>

            ${aiModel.details?.available ? `
                <div style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: ${getScoreColor(aiModel.score)};">
                        ${aiModel.score || 0}
                    </div>
                    <div style="font-size: 0.875rem; color: var(--text-secondary); margin-top: 0.25rem;">
                        🤖 AI Model
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">
                        ${combined.breakdown?.aiModelWeight ? `${Math.round(combined.breakdown.aiModelWeight * 100)}% weight` : ''}
                    </div>
                </div>
            ` : ''}
        </div>

        <!-- Overall Assessment -->
        <div style="background: var(--bg-secondary); padding: 1.25rem; border-radius: var(--radius-md); margin-bottom: 1.5rem; border-left: 4px solid ${getScoreColor(combined.score)};">
            <div style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">
                📊 Overall Assessment
            </div>
            <div style="font-size: 1rem; color: ${getScoreColor(combined.score)}; margin-bottom: 0.5rem; font-weight: 600;">
                ${combined.assessment}
            </div>
            <div style="font-size: 0.875rem; color: var(--text-secondary);">
                ${combined.agreement}
            </div>
        </div>

        <!-- Detection Methods Breakdown -->
        <div style="margin-bottom: 1rem;">
            <h3 style="margin-bottom: 1rem; color: var(--text-primary);">🔬 Detection Methods Breakdown</h3>

            <!-- Pixel Analysis -->
            <details open style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; border: 1px solid var(--border-color);">
                <summary style="cursor: pointer; font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem; user-select: none;">
                    🔬 Pixel Analysis - ${pixel.score}/100
                    <span style="font-size: 0.875rem; color: var(--text-muted);">(${pixel.confidence} confidence)</span>
                </summary>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);"><em>${pixel.explanation}</em></p>

                    <h4 style="font-size: 0.875rem; margin-bottom: 0.75rem; color: var(--text-primary);">Sub-Method Scores:</h4>
                    ${generatePixelSubMethods()}

                    ${pixelDetails.reasons && pixelDetails.reasons.length > 0 ? `
                        <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                            <p style="font-weight: 600; margin-bottom: 0.5rem;">🎯 Key Findings:</p>
                            <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem;">
                                ${pixelDetails.reasons.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
            </details>

            <!-- Metadata Analysis -->
            <details style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; border: 1px solid var(--border-color);">
                <summary style="cursor: pointer; font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem; user-select: none;">
                    📋 Metadata Analysis - ${metadata.score}/100
                    <span style="font-size: 0.875rem; color: var(--text-muted);">(${metadata.confidence} confidence)</span>
                </summary>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);"><em>${metadata.explanation}</em></p>

                    ${metadata.details ? `
                        <div style="margin-bottom: 1rem;">
                            <p><strong>File Type:</strong> ${metadata.details.fileType}</p>
                            <p><strong>Has EXIF Data:</strong> ${metadata.details.hasEXIF ? 'Yes' : 'No'}</p>
                            ${metadata.details.software ? `<p><strong>Software:</strong> ${metadata.details.software}</p>` : ''}
                        </div>

                        ${metadata.details.aiMarkers && metadata.details.aiMarkers.length > 0 ? `
                            <div style="background: var(--danger-color)15; border: 2px solid var(--danger-color); padding: 0.75rem; border-radius: var(--radius-sm); margin-bottom: 1rem;">
                                <p style="color: var(--danger-color); font-weight: 700; margin-bottom: 0.5rem;">
                                    🚨 AI Generator Markers Detected
                                </p>
                                <p style="font-size: 0.875rem; color: var(--text-primary);">
                                    ${metadata.details.aiMarkers.join(', ')}
                                </p>
                            </div>
                        ` : ''}

                        ${metadata.details.reasons && metadata.details.reasons.length > 0 ? `
                            <div style="margin-top: 1rem; padding: 0.75rem; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
                                <p style="font-weight: 600; margin-bottom: 0.5rem;">🎯 Findings:</p>
                                <ul style="margin: 0.5rem 0; padding-left: 1.5rem; font-size: 0.875rem;">
                                    ${metadata.details.reasons.map(r => `<li>${r}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    ` : ''}
                </div>
            </details>

            <!-- AI Model Detection -->
            <details ${aiModel.details?.available ? 'open' : ''} style="background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem; border: 1px solid var(--border-color);">
                <summary style="cursor: pointer; font-weight: 600; margin-bottom: 0.5rem; font-size: 1rem; user-select: none;">
                    🤖 AI Model Detection - ${aiModel.score || 0}/100
                    <span style="font-size: 0.875rem; color: var(--text-muted);">${aiModel.details?.available ? `(${aiModel.confidence} confidence)` : '(unavailable)'}</span>
                </summary>
                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                    <p style="margin-bottom: 1rem; color: var(--text-secondary);"><em>${aiModel.explanation}</em></p>
                    ${generateAIModelPredictions()}
                </div>
            </details>
        </div>

        <!-- Image Information -->
        <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md); font-size: 0.875rem; color: var(--text-secondary);">
            <p style="font-weight: 600; margin-bottom: 0.5rem;">📄 Image Information</p>
            <p><strong>Dimensions:</strong> ${imageInfo.dimensions.width} × ${imageInfo.dimensions.height} pixels</p>
            <p><strong>File Size:</strong> ${(imageInfo.fileSize / 1024).toFixed(1)} KB</p>
            <p><strong>File Type:</strong> ${imageInfo.fileType}</p>
            <p><strong>File Name:</strong> ${imageInfo.fileName}</p>
        </div>
    `;
}

function displayImageOverallScore(results) {
    try {
        debugLog('displayImageOverallScore: Getting DOM elements...');
        const scoreValue = document.getElementById('scoreValue');
        const scoreCircle = document.getElementById('scoreCircle');
        const scoreSummary = document.getElementById('scoreSummary');
        const confidenceLevel = document.getElementById('confidenceLevel');
        const detectionCount = document.getElementById('detectionCount');

        debugLog('scoreValue:', scoreValue ? 'FOUND' : 'NOT FOUND');
        debugLog('scoreCircle:', scoreCircle ? 'FOUND' : 'NOT FOUND');

        const combinedScore = results.combined.score;
        debugLog('Combined score:', combinedScore);

        // Animate score
        animateScore(scoreValue, combinedScore);

        // Update score circle color
        scoreCircle.className = 'score-circle';
        if (combinedScore >= 70) {
            scoreCircle.classList.add('score-very-high');
        } else if (combinedScore >= 50) {
            scoreCircle.classList.add('score-high');
        } else if (combinedScore >= 30) {
            scoreCircle.classList.add('score-medium');
        } else {
            scoreCircle.classList.add('score-low');
        }

        scoreSummary.textContent = `${results.combined.assessment}. ${results.combined.agreement}`;

        // Update metadata
        confidenceLevel.textContent = `Combined Confidence: ${results.combined.confidence}`;
        detectionCount.textContent = `${results.imageInfo.dimensions.width}×${results.imageInfo.dimensions.height} · ${(results.imageInfo.fileSize / 1024).toFixed(1)} KB`;

        debugLog('Overall score display updated');
    } catch (error) {
        debugLog('ERROR in displayImageOverallScore:', error.message);
    }
}

function displayImageDetectionMethods(results) {
    try {
        debugLog('displayImageDetectionMethods: Starting...');
        const container = document.getElementById('detectionMethodsContainer');
        debugLog('detectionMethodsContainer:', container ? 'FOUND' : 'NOT FOUND');

        const pixelResults = results.pixelAnalysis || {};
        const metadataResults = results.metadataAnalysis || {};
        const combinedResults = results.combined || {};

        debugLog('Pixel score:', pixelResults.score);
        debugLog('Metadata score:', metadataResults.score);
        debugLog('Combined score:', combinedResults.score);
        debugLog('Image element:', results.imageElement ? 'EXISTS' : 'MISSING');

        debugLog('Building HTML for detection methods...');

        container.innerHTML = `
        <div class="image-display-container">
            <img src="${results.imageElement.src}" alt="Analyzed Image" class="analyzed-image">
        </div>

        <div class="method-card">
            <div class="method-header">
                <span class="method-icon">🔬</span>
                <h4>Pixel Analysis</h4>
            </div>
            <div class="method-score-display">
                <div class="method-score">${pixelResults.score || 0}</div>
                <div class="method-score-label">/100</div>
            </div>
            <p class="method-confidence">Confidence: ${pixelResults.confidence || 'unknown'}</p>
            <p class="method-description">${pixelResults.explanation || 'No explanation available'}</p>
            ${pixelResults.details ? `
                <details class="method-details">
                    <summary>🔍 Technical Details</summary>
                    <div style="font-size: 0.875rem; line-height: 1.6;">
                        ${pixelResults.details.reasons && pixelResults.details.reasons.length > 0 ? `
                            <strong>Detected patterns:</strong>
                            <ul style="margin: 0.5rem 0;">
                                ${pixelResults.details.reasons.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        ` : ''}
                        ${pixelResults.details.frequency && !pixelResults.details.frequency.error ? `
                            <p><strong>Frequency Analysis:</strong></p>
                            <ul style="margin: 0.5rem 0;">
                                <li>High freq ratio: ${(pixelResults.details.frequency.highFreqRatio * 100).toFixed(1)}%</li>
                                <li>RIO std dev: ${pixelResults.details.frequency.rioStdDev.toFixed(4)}</li>
                                <li>AI likelihood: ${pixelResults.details.frequency.aiLikelihood.toFixed(1)}%</li>
                            </ul>
                        ` : ''}
                        ${pixelResults.details.texture ? `
                            <p><strong>Texture Analysis:</strong></p>
                            <ul style="margin: 0.5rem 0;">
                                <li>Entropy: ${pixelResults.details.texture.entropy.toFixed(2)}</li>
                                <li>Contrast: ${pixelResults.details.texture.contrast.toFixed(1)}</li>
                                <li>Homogeneity: ${pixelResults.details.texture.homogeneity.toFixed(3)}</li>
                            </ul>
                        ` : ''}
                        ${pixelResults.details.noise ? `
                            <p><strong>Noise Analysis:</strong></p>
                            <ul style="margin: 0.5rem 0;">
                                <li>Avg noise: ${pixelResults.details.noise.avgNoise.toFixed(2)}</li>
                            </ul>
                        ` : ''}
                    </div>
                </details>
            ` : ''}
        </div>

        <div class="method-card">
            <div class="method-header">
                <span class="method-icon">📋</span>
                <h4>Metadata Analysis</h4>
            </div>
            <div class="method-score-display">
                <div class="method-score">${metadataResults.score || 0}</div>
                <div class="method-score-label">/100</div>
            </div>
            <p class="method-confidence">Confidence: ${metadataResults.confidence || 'unknown'}</p>
            <p class="method-description">${metadataResults.explanation || 'No explanation available'}</p>
            ${metadataResults.details ? `
                <details class="method-details">
                    <summary>🔍 Metadata Details</summary>
                    <div style="font-size: 0.875rem; line-height: 1.6;">
                        <ul style="margin: 0.5rem 0;">
                            <li><strong>File type:</strong> ${metadataResults.details.fileType}</li>
                            <li><strong>Has EXIF:</strong> ${metadataResults.details.hasEXIF ? 'Yes' : 'No'}</li>
                            <li><strong>Has text chunks:</strong> ${metadataResults.details.hasTextChunks ? 'Yes' : 'No'}</li>
                            ${metadataResults.details.software ? `<li><strong>Software:</strong> ${metadataResults.details.software}</li>` : ''}
                            ${metadataResults.details.make ? `<li><strong>Camera make:</strong> ${metadataResults.details.make}</li>` : ''}
                            ${metadataResults.details.model ? `<li><strong>Camera model:</strong> ${metadataResults.details.model}</li>` : ''}
                        </ul>
                        ${metadataResults.details.aiMarkers && metadataResults.details.aiMarkers.length > 0 ? `
                            <p style="margin-top: 1rem;"><strong>🚨 AI Generator Markers Found:</strong></p>
                            <ul style="margin: 0.5rem 0; color: var(--danger-color);">
                                ${metadataResults.details.aiMarkers.map(m => `<li>${m}</li>`).join('')}
                            </ul>
                        ` : ''}
                        ${metadataResults.details.reasons && metadataResults.details.reasons.length > 0 ? `
                            <p style="margin-top: 1rem;"><strong>Analysis findings:</strong></p>
                            <ul style="margin: 0.5rem 0;">
                                ${metadataResults.details.reasons.map(r => `<li>${r}</li>`).join('')}
                            </ul>
                        ` : ''}
                    </div>
                </details>
            ` : ''}
        </div>

        <div class="method-card method-card-combined">
            <div class="method-header">
                <span class="method-icon">⚖️</span>
                <h4>Combined Score</h4>
            </div>
            <div class="method-score-display">
                <div class="method-score method-score-combined">${combinedResults.score}</div>
                <div class="method-score-label">/100</div>
            </div>
            <p class="method-confidence">Overall: ${combinedResults.confidence}</p>
            <p class="method-agreement">${combinedResults.agreement}</p>
            <p class="method-description">Weighted average: 60% pixel analysis, 40% metadata analysis.</p>
            <details class="method-details">
                <summary>🔍 Score Breakdown</summary>
                <div style="font-size: 0.875rem; line-height: 1.6;">
                    <ul style="margin: 0.5rem 0;">
                        <li>Pixel analysis score: ${combinedResults.breakdown.pixelScore}</li>
                        <li>Metadata score: ${combinedResults.breakdown.metadataScore}</li>
                        <li>Score difference: ${combinedResults.scoreDifference}</li>
                    </ul>
                </div>
            </details>
        </div>
    `;

        debugLog('HTML set for detection methods container');
        debugLog('Container innerHTML length:', container.innerHTML.length + ' characters');
    } catch (error) {
        debugLog('ERROR in displayImageDetectionMethods:', error.message);
        debugLog('Error stack:', error.stack);
    }
}

// Utility function for legend toggle (called from HTML)
window.toggleLegend = toggleLegend;
