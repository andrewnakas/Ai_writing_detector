// AI Writing Detector
// Analyzes text against Wikipedia's Signs of AI Writing

class AIWritingDetector {
    constructor() {
        this.wikiData = null;
        this.analysisResults = null;
    }

    async initialize() {
        try {
            // Add cache-busting parameter to force reload of data
            const cacheBuster = new Date().getTime();
            console.log('🔍 DETECTOR INITIALIZATION STARTED');
            console.log(`⏰ Cache buster: ${cacheBuster}`);

            const response = await fetch(`wiki-data.json?v=${cacheBuster}`, {
                cache: 'no-cache'
            });

            console.log(`📡 Fetch response status: ${response.status}`);

            this.wikiData = await response.json();

            console.log('===== DATA LOADED =====');
            console.log('📊 Statistics:', JSON.stringify(this.wikiData.statistics, null, 2));
            console.log(`📝 Total signs: ${this.wikiData.signs.length}`);
            console.log(`📋 Total categories: ${this.wikiData.categories.length}`);
            console.log(`🎯 Total detection rules: ${this.wikiData.detectionRules.length}`);

            // Critical diagnostic: Check if rules have patterns
            const rulesWithPatterns = this.wikiData.detectionRules.filter(r =>
                r.patterns && r.patterns.length > 0
            );
            const rulesWithKeywords = this.wikiData.detectionRules.filter(r =>
                r.keywords && r.keywords.length > 0
            );

            console.log(`✨ Rules with patterns: ${rulesWithPatterns.length}`);
            console.log(`🔑 Rules with keywords: ${rulesWithKeywords.length}`);

            if (rulesWithPatterns.length === 0 && rulesWithKeywords.length === 0) {
                console.error('❌❌❌ CRITICAL ERROR ❌❌❌');
                console.error('ALL DETECTION RULES ARE EMPTY!');
                console.error('The detector CANNOT find any AI writing signs.');
                console.error('The data file needs to be fixed.');
                console.error('This is why you see 0 detections.');
            } else {
                console.log('✅ Detection rules contain patterns - detector should work!');
            }

            // Show first 5 rules for verification
            console.log('===== SAMPLE DETECTION RULES =====');
            this.wikiData.detectionRules.slice(0, 5).forEach((rule, i) => {
                console.log(`Rule ${i + 1} (${rule.signId}):`);
                console.log(`  - Patterns: ${rule.patterns.length} (${rule.patterns.slice(0, 2).join(', ') || 'NONE'})`);
                console.log(`  - Keywords: ${rule.keywords.length} (${rule.keywords.slice(0, 2).join(', ') || 'NONE'})`);
                console.log(`  - Weight: ${rule.weight}`);
            });

            // Show sign details
            console.log('===== SAMPLE SIGNS =====');
            this.wikiData.signs.slice(0, 5).forEach((sign, i) => {
                console.log(`Sign ${i + 1}:`);
                console.log(`  - ID: ${sign.id}`);
                console.log(`  - Name: ${sign.name || '❌ EMPTY'}`);
                console.log(`  - Category: ${sign.category || '❌ EMPTY'}`);
                console.log(`  - Description: ${sign.description ? 'Has description' : '❌ NO DESCRIPTION'}`);
                console.log(`  - Examples: ${sign.examples.length}`);
            });

            console.log('===== COPY EVERYTHING ABOVE THIS LINE =====');

            return true;
        } catch (error) {
            console.error('❌ FAILED TO LOAD DATA:', error);
            throw new Error('Failed to initialize detector. Please ensure wiki-data.json is available.');
        }
    }

    analyzeText(text) {
        if (!this.wikiData) {
            throw new Error('Detector not initialized. Call initialize() first.');
        }

        if (!text || text.trim().length === 0) {
            throw new Error('No text provided for analysis.');
        }

        const results = {
            text: text,
            textLength: text.length,
            wordCount: this.countWords(text),
            detections: [],
            categoryScores: {},
            overallScore: 0,
            confidence: 'low',
            summary: ''
        };

        // Analyze against each sign
        this.wikiData.signs.forEach(sign => {
            const detection = this.detectSign(text, sign);
            if (detection.matches.length > 0) {
                results.detections.push(detection);
            }
        });

        // Calculate category scores
        this.wikiData.categories.forEach(category => {
            const categoryDetections = results.detections.filter(d => d.category === category.name);
            const score = this.calculateCategoryScore(categoryDetections, category);
            results.categoryScores[category.name] = score;
        });

        // Calculate overall score
        results.overallScore = this.calculateOverallScore(results);
        results.confidence = this.determineConfidence(results);
        results.summary = this.generateSummary(results);

        this.analysisResults = results;
        return results;
    }

    detectSign(text, sign) {
        const detection = {
            signId: sign.id,
            signName: sign.name,
            category: sign.category,
            severity: sign.severity,
            matches: [],
            score: 0,
            description: sign.description,
            wikiSection: `${sign.category} → ${sign.name}`
        };

        // Get detection rule for this sign
        const rule = this.wikiData.detectionRules.find(r => r.signId === sign.id);
        if (!rule) {
            return detection;
        }

        // Check patterns (regex)
        rule.patterns.forEach(pattern => {
            try {
                const regex = new RegExp(pattern, 'gi');
                let match;
                while ((match = regex.exec(text)) !== null) {
                    detection.matches.push({
                        type: 'pattern',
                        value: match[0],
                        position: match.index,
                        context: this.getContext(text, match.index, match[0].length)
                    });
                }
            } catch (e) {
                // Invalid regex, skip
                console.warn(`Invalid regex pattern for ${sign.id}:`, pattern);
            }
        });

        // Check keywords (with context)
        rule.keywords.forEach(keyword => {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            let match;
            while ((match = regex.exec(text)) !== null) {
                // Check if this match is already captured by a pattern
                const alreadyCaptured = detection.matches.some(m =>
                    Math.abs(m.position - match.index) < 50
                );

                if (!alreadyCaptured) {
                    detection.matches.push({
                        type: 'keyword',
                        value: match[0],
                        position: match.index,
                        context: this.getContext(text, match.index, keyword.length)
                    });
                }
            }
        });

        // Calculate score for this sign
        if (detection.matches.length > 0) {
            detection.score = this.calculateSignScore(detection, rule.weight);
        }

        return detection;
    }

    calculateSignScore(detection, weight) {
        // Base score on number of matches, weighted by severity
        const matchCount = detection.matches.length;
        const severityMultiplier = {
            'high': 3,
            'medium': 2,
            'low': 1
        }[detection.severity] || 1;

        // Logarithmic scaling to prevent single signs from dominating
        const baseScore = Math.min(100, Math.log(matchCount + 1) * 20 * severityMultiplier * weight);

        return Math.round(baseScore);
    }

    calculateCategoryScore(categoryDetections, category) {
        if (categoryDetections.length === 0) {
            return 0;
        }

        // Average of all detection scores in category
        const totalScore = categoryDetections.reduce((sum, d) => sum + d.score, 0);
        const avgScore = totalScore / categoryDetections.length;

        // Weight by how many signs in the category were detected
        const detectedSigns = categoryDetections.length;
        const totalSigns = category.signs.length;
        const coverageRatio = detectedSigns / totalSigns;

        return Math.round(avgScore * (0.7 + coverageRatio * 0.3));
    }

    calculateOverallScore(results) {
        if (results.detections.length === 0) {
            return 0;
        }

        const categoryScores = Object.values(results.categoryScores);
        if (categoryScores.length === 0) {
            return 0;
        }

        // Weighted average of category scores
        const avgScore = categoryScores.reduce((a, b) => a + b, 0) / categoryScores.length;

        // Adjust based on text length (very short texts are less reliable)
        const lengthFactor = Math.min(1, results.wordCount / 100);

        // Adjust based on number of different signs detected
        const diversityFactor = Math.min(1, results.detections.length / 10);

        const finalScore = avgScore * (0.7 + lengthFactor * 0.15 + diversityFactor * 0.15);

        return Math.round(Math.min(100, finalScore));
    }

    determineConfidence(results) {
        const score = results.overallScore;
        const detectionCount = results.detections.length;
        const wordCount = results.wordCount;

        // Low confidence if text is too short
        if (wordCount < 50) {
            return 'low';
        }

        // High confidence if many signs detected
        if (detectionCount >= 8 && score >= 60) {
            return 'high';
        }

        // Medium-high confidence
        if (detectionCount >= 5 && score >= 40) {
            return 'medium-high';
        }

        // Medium confidence
        if (detectionCount >= 3 && score >= 25) {
            return 'medium';
        }

        return 'low';
    }

    generateSummary(results) {
        const score = results.overallScore;
        const detectionCount = results.detections.length;

        let likelihood = '';
        if (score >= 70) {
            likelihood = 'very high likelihood';
        } else if (score >= 50) {
            likelihood = 'high likelihood';
        } else if (score >= 30) {
            likelihood = 'moderate likelihood';
        } else if (score >= 15) {
            likelihood = 'some indicators';
        } else {
            likelihood = 'few indicators';
        }

        const topCategory = Object.entries(results.categoryScores)
            .sort((a, b) => b[1] - a[1])[0];

        let summary = `This text shows ${likelihood} of being AI-generated (score: ${score}/100). `;

        if (detectionCount > 0) {
            summary += `Detected ${detectionCount} sign${detectionCount !== 1 ? 's' : ''} of AI writing. `;

            if (topCategory && topCategory[1] > 0) {
                summary += `Most prevalent category: ${topCategory[0]} (${topCategory[1]}/100).`;
            }
        } else {
            summary += 'No significant AI writing patterns detected.';
        }

        return summary;
    }

    getContext(text, position, length, contextSize = 80) {
        const start = Math.max(0, position - contextSize);
        const end = Math.min(text.length, position + length + contextSize);

        let context = text.substring(start, end);

        // Add ellipses if truncated
        if (start > 0) context = '...' + context;
        if (end < text.length) context = context + '...';

        return {
            text: context,
            highlightStart: position - start + (start > 0 ? 3 : 0),
            highlightLength: length
        };
    }

    countWords(text) {
        return text.trim().split(/\s+/).filter(word => word.length > 0).length;
    }

    highlightMatches(text, detections) {
        // Create an array of all match positions
        const highlights = [];
        detections.forEach(detection => {
            detection.matches.forEach(match => {
                highlights.push({
                    start: match.position,
                    end: match.position + match.value.length,
                    signId: detection.signId,
                    signName: detection.signName,
                    severity: detection.severity,
                    value: match.value
                });
            });
        });

        // Sort by position
        highlights.sort((a, b) => a.start - b.start);

        // Merge overlapping highlights
        const merged = [];
        highlights.forEach(h => {
            if (merged.length === 0 || merged[merged.length - 1].end < h.start) {
                merged.push(h);
            } else {
                // Extend the previous highlight if overlapping
                const prev = merged[merged.length - 1];
                if (h.end > prev.end) {
                    prev.end = h.end;
                    prev.signName += `, ${h.signName}`;
                }
            }
        });

        // Build highlighted HTML
        let result = '';
        let lastPos = 0;

        merged.forEach(h => {
            // Add text before highlight
            result += this.escapeHtml(text.substring(lastPos, h.start));

            // Add highlighted text
            const severityClass = `highlight-${h.severity}`;
            const title = `${h.signName} (${h.severity} severity)`;
            result += `<mark class="${severityClass}" data-sign="${h.signId}" title="${title}">`;
            result += this.escapeHtml(text.substring(h.start, h.end));
            result += '</mark>';

            lastPos = h.end;
        });

        // Add remaining text
        result += this.escapeHtml(text.substring(lastPos));

        return result;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async analyzeUrl(url) {
        try {
            // For security reasons, we can't directly fetch from arbitrary URLs due to CORS
            // This would need a backend proxy or browser extension
            // For now, we'll provide instructions
            throw new Error('Direct URL fetching requires a backend proxy due to CORS restrictions. Please copy the text manually or use the browser extension version.');
        } catch (error) {
            throw error;
        }
    }

    exportResults(format = 'json') {
        if (!this.analysisResults) {
            throw new Error('No analysis results available. Run analyzeText() first.');
        }

        if (format === 'json') {
            return JSON.stringify(this.analysisResults, null, 2);
        } else if (format === 'text') {
            return this.formatResultsAsText(this.analysisResults);
        } else if (format === 'html') {
            return this.formatResultsAsHtml(this.analysisResults);
        }

        throw new Error(`Unsupported export format: ${format}`);
    }

    formatResultsAsText(results) {
        let output = `AI Writing Detection Report\n`;
        output += `${'='.repeat(50)}\n\n`;
        output += `Overall Score: ${results.overallScore}/100\n`;
        output += `Confidence: ${results.confidence}\n`;
        output += `Word Count: ${results.wordCount}\n`;
        output += `Signs Detected: ${results.detections.length}\n\n`;
        output += `Summary:\n${results.summary}\n\n`;

        if (results.detections.length > 0) {
            output += `Category Scores:\n`;
            output += `${'-'.repeat(50)}\n`;
            Object.entries(results.categoryScores).forEach(([category, score]) => {
                output += `${category}: ${score}/100\n`;
            });
            output += `\n`;

            output += `Detected Signs:\n`;
            output += `${'-'.repeat(50)}\n`;
            results.detections.forEach((detection, i) => {
                output += `\n${i + 1}. ${detection.signName}\n`;
                output += `   Category: ${detection.category}\n`;
                output += `   Severity: ${detection.severity}\n`;
                output += `   Score: ${detection.score}/100\n`;
                output += `   Matches: ${detection.matches.length}\n`;
                output += `   Wikipedia Section: ${detection.wikiSection}\n`;

                if (detection.matches.length > 0) {
                    output += `   Examples:\n`;
                    detection.matches.slice(0, 3).forEach(match => {
                        output += `     - "${match.value}"\n`;
                    });
                }
            });
        }

        return output;
    }

    formatResultsAsHtml(results) {
        const highlightedText = this.highlightMatches(results.text, results.detections);

        let html = `<div class="results-report">`;
        html += `<h2>AI Writing Detection Report</h2>`;
        html += `<div class="score-summary">`;
        html += `<div class="score-circle score-${Math.floor(results.overallScore / 20)}">${results.overallScore}</div>`;
        html += `<p>${results.summary}</p>`;
        html += `</div>`;

        html += `<div class="highlighted-text">`;
        html += `<h3>Analyzed Text (with highlights)</h3>`;
        html += `<div class="text-content">${highlightedText}</div>`;
        html += `</div>`;

        html += `</div>`;

        return html;
    }
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.AIWritingDetector = AIWritingDetector;
}

// Export for Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AIWritingDetector;
}
