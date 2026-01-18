// Compression-Based AI Detection
// Inspired by ZipPy (thinkst/zippy)
// Uses compression ratios as a proxy for text perplexity

class CompressionDetector {
    constructor() {
        this.aiCorpus = this.getAICorpus();
    }

    // Sample AI-generated corpus for seeding compression
    getAICorpus() {
        return `In today's modern world, it's important to note that artificial intelligence serves as a testament to human innovation. Moreover, the integration of advanced technologies plays a vital role in shaping our future. Furthermore, it's crucial to understand that these developments are not just about automation—they're about revolutionizing entire industries.

The benefits of AI are breathtaking and stunning in their scope. Studies have shown that industry reports suggest significant improvements across various sectors. Experts say that the impact will be transformative, ensuring that organizations can leverage these capabilities while highlighting the importance of ethical considerations.

It's worth noting that the implementation of AI technologies showcases innovation in every aspect. Additionally, the system demonstrates efficiency through optimization and automation. Consequently, this technology stands as a powerful reminder of our capacity for progress, underscoring the importance of continued development.

Throughout history, technological advancements have been pivotal. As we can see, it is clear that modern solutions provide numerous benefits. In conclusion, one must note that these innovations represent a quintessential example of human achievement, making it clear that the future holds tremendous potential.`;
    }

    /**
     * Simple LZ77-inspired compression ratio calculator
     * Returns a number between 0-1 indicating compression efficiency
     */
    calculateCompressionRatio(text) {
        if (!text || text.length === 0) return 0;

        // Simple run-length encoding + dictionary-based compression simulation
        const compressed = this.simpleCompress(text);
        const ratio = compressed.length / text.length;

        return ratio;
    }

    /**
     * Simple compression using repeated substring detection
     */
    simpleCompress(text) {
        try {
            let result = '';
            let dict = new Map();
            let dictIndex = 0;

            // Build a simple dictionary of repeated substrings
            for (let len = 10; len >= 3; len--) {
                for (let i = 0; i <= text.length - len; i++) {
                    const substr = text.substring(i, i + len);
                    if (!dict.has(substr)) {
                        try {
                            const escapedSubstr = this.escapeRegex(substr);
                            const regex = new RegExp(escapedSubstr, 'g');
                            const matches = text.match(regex);
                            const count = matches ? matches.length : 0;
                            if (count > 1) {
                                dict.set(substr, `~${dictIndex}~`);
                                dictIndex++;
                            }
                        } catch (e) {
                            // Skip if regex fails
                            continue;
                        }
                    }
                }
            }

            // Replace substrings with dictionary references
            result = text;
            dict.forEach((ref, substr) => {
                try {
                    result = result.split(substr).join(ref);
                } catch (e) {
                    // Skip if replacement fails
                }
            });

            return result;
        } catch (error) {
            // If compression fails, return original text
            return text;
        }
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * Main detection method: compares compression of text with AI corpus vs alone
     * Returns score 0-100 where higher = more likely AI-generated
     */
    async analyze(text) {
        if (!text || text.trim().length < 50) {
            return {
                method: 'Compression-Based',
                score: 0,
                confidence: 'low',
                explanation: 'Text too short for compression analysis',
                metrics: {
                    textAloneRatio: 0,
                    withAICorpusRatio: 0,
                    difference: 0
                }
            };
        }

        // Measure compression of text alone
        const textAloneRatio = this.calculateCompressionRatio(text);

        // Measure compression of text + AI corpus (seeded)
        const seededText = this.aiCorpus + '\n\n' + text;
        const seededRatio = this.calculateCompressionRatio(seededText);

        // Calculate how much better it compresses with AI corpus
        // AI text will compress better when seeded with AI corpus
        const corpusOnlyRatio = this.calculateCompressionRatio(this.aiCorpus);

        // Normalized difference - positive means text is similar to AI corpus
        const expectedRatio = (corpusOnlyRatio * this.aiCorpus.length + textAloneRatio * text.length) / (this.aiCorpus.length + text.length);
        const difference = expectedRatio - seededRatio;

        // Convert to 0-100 score
        // Larger positive difference = more AI-like (compresses better with AI corpus)
        const rawScore = Math.max(0, Math.min(100, (difference / 0.1) * 100));

        // Determine confidence based on text length and score magnitude
        let confidence = 'low';
        if (text.length > 500 && Math.abs(rawScore - 50) > 20) {
            confidence = 'high';
        } else if (text.length > 200 && Math.abs(rawScore - 50) > 10) {
            confidence = 'medium';
        }

        return {
            method: 'Compression-Based',
            score: Math.round(rawScore),
            confidence: confidence,
            explanation: this.generateExplanation(rawScore),
            metrics: {
                textAloneRatio: textAloneRatio.toFixed(4),
                withAICorpusRatio: seededRatio.toFixed(4),
                difference: difference.toFixed(4),
                textLength: text.length
            }
        };
    }

    generateExplanation(score) {
        if (score >= 70) {
            return 'Text compresses significantly better when combined with AI-generated content, suggesting high similarity to AI writing patterns.';
        } else if (score >= 50) {
            return 'Text shows moderate compression similarity to AI-generated content, indicating some AI-like patterns.';
        } else if (score >= 30) {
            return 'Text shows slight compression similarity to AI content, but may be human-written with some formal patterns.';
        } else {
            return 'Text compresses differently than AI-generated content, suggesting human authorship.';
        }
    }
}

// Export for browser
if (typeof window !== 'undefined') {
    window.CompressionDetector = CompressionDetector;
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CompressionDetector;
}
