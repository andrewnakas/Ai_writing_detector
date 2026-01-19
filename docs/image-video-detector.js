// Main orchestrator for AI-generated image and video detection
// Combines multiple detection methods for comprehensive analysis

class ImageVideoDetector {
    constructor() {
        this.pixelAnalyzer = new PixelAnalysisDetector();
        this.metadataAnalyzer = new MetadataDetector();
        this.aiModelDetector = new AIModelDetector();
        this.supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        this.maxFileSize = 50 * 1024 * 1024; // 50MB
    }

    async analyzeImage(file) {
        try {
            // Validate file
            const validation = this.validateFile(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }

            // Load image
            const imageElement = await this.loadImage(file);

            // Run analyses in parallel
            console.log('Starting multi-method image analysis...');

            const [pixelResults, metadataResults, aiModelResults] = await Promise.all([
                this.pixelAnalyzer.analyze(imageElement, file).catch(err => {
                    console.warn('Pixel analysis failed:', err);
                    return {
                        method: 'Pixel Analysis',
                        score: 0,
                        confidence: 'error',
                        explanation: 'Pixel analysis failed: ' + err.message,
                        details: { error: err.message }
                    };
                }),
                this.metadataAnalyzer.analyze(file).catch(err => {
                    console.warn('Metadata analysis failed:', err);
                    return {
                        method: 'Metadata Analysis',
                        score: 0,
                        confidence: 'error',
                        explanation: 'Metadata analysis failed: ' + err.message,
                        details: { error: err.message }
                    };
                }),
                this.aiModelDetector.analyze(imageElement, file).catch(err => {
                    console.warn('AI model analysis failed:', err);
                    return {
                        method: 'AI Model Detection',
                        score: 0,
                        confidence: 'unavailable',
                        explanation: 'AI model analysis failed: ' + err.message,
                        details: { error: err.message, available: false }
                    };
                })
            ]);

            // Calculate combined score
            const combinedResults = this.calculateCombinedScore(pixelResults, metadataResults, aiModelResults);

            return {
                pixelAnalysis: pixelResults,
                metadataAnalysis: metadataResults,
                aiModelAnalysis: aiModelResults,
                combined: combinedResults,
                imageInfo: {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    dimensions: {
                        width: imageElement.naturalWidth,
                        height: imageElement.naturalHeight
                    }
                },
                imageElement: imageElement // For display
            };

        } catch (error) {
            console.error('Image analysis error:', error);
            throw error;
        }
    }

    async analyzeVideo(file) {
        try {
            // Video analysis is more complex - for now, return placeholder
            // Future: Extract frames, analyze temporal consistency, motion artifacts
            return {
                error: 'Video analysis not yet implemented',
                message: 'Video detection coming soon! Will analyze frame consistency, motion artifacts, and temporal patterns.'
            };
        } catch (error) {
            console.error('Video analysis error:', error);
            throw error;
        }
    }

    validateFile(file) {
        if (!file) {
            return { valid: false, error: 'No file provided' };
        }

        if (file.size > this.maxFileSize) {
            return {
                valid: false,
                error: `File too large. Maximum size is ${this.maxFileSize / (1024 * 1024)}MB`
            };
        }

        // Check if it's a supported image format
        const isImage = this.supportedFormats.includes(file.type);
        const isVideo = file.type.startsWith('video/');

        if (!isImage && !isVideo) {
            return {
                valid: false,
                error: `Unsupported file type: ${file.type}. Supported formats: JPEG, PNG, WebP`
            };
        }

        return {
            valid: true,
            isImage: isImage,
            isVideo: isVideo
        };
    }

    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(file);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load image'));
            };

            img.src = url;
        });
    }

    calculateCombinedScore(pixelResults, metadataResults, aiModelResults) {
        // Weight: 45% pixel analysis, 30% metadata, 25% AI model
        // If AI model is unavailable, redistribute weights: 60% pixel, 40% metadata
        const aiModelAvailable = aiModelResults && aiModelResults.details && aiModelResults.details.available;

        let pixelWeight, metadataWeight, aiModelWeight;

        if (aiModelAvailable) {
            pixelWeight = 0.45;
            metadataWeight = 0.30;
            aiModelWeight = 0.25;
        } else {
            pixelWeight = 0.60;
            metadataWeight = 0.40;
            aiModelWeight = 0.00;
        }

        const pixelScore = pixelResults.score || 0;
        const metadataScore = metadataResults.score || 0;
        const aiModelScore = aiModelAvailable ? (aiModelResults.score || 0) : 0;

        const combinedScore = Math.round(
            pixelScore * pixelWeight +
            metadataScore * metadataWeight +
            aiModelScore * aiModelWeight
        );

        // Determine combined confidence
        let confidence = 'low';

        // If metadata has strong AI markers, high confidence
        if (metadataResults.confidence === 'very-high' || metadataResults.confidence === 'high') {
            confidence = 'high';
        } else if (pixelResults.confidence === 'high' && (metadataResults.score > 20 || aiModelScore > 40)) {
            confidence = 'high';
        } else if (aiModelAvailable && aiModelResults.confidence === 'high' && pixelScore > 40) {
            confidence = 'high';
        } else if (pixelResults.confidence === 'medium' || metadataResults.confidence === 'medium') {
            confidence = 'medium';
        } else if (combinedScore > 50) {
            confidence = 'medium';
        }

        // Agreement analysis (considering all available methods)
        const scores = [pixelScore, metadataScore];
        if (aiModelAvailable) scores.push(aiModelScore);

        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        const maxDifference = Math.max(...scores.map(s => Math.abs(s - avgScore)));

        let agreement = '';
        if (maxDifference < 15) {
            agreement = `✓ All ${scores.length} methods strongly agree`;
        } else if (maxDifference < 30) {
            agreement = `~ Methods moderately agree (max diff: ${Math.round(maxDifference)})`;
        } else {
            agreement = `⚠ Methods show varying assessments (max diff: ${Math.round(maxDifference)})`;
        }

        // Generate overall assessment
        let assessment = '';
        if (combinedScore >= 70) {
            assessment = 'Very high likelihood of AI generation';
        } else if (combinedScore >= 50) {
            assessment = 'High likelihood of AI generation';
        } else if (combinedScore >= 30) {
            assessment = 'Moderate likelihood of AI generation';
        } else if (combinedScore >= 15) {
            assessment = 'Low likelihood of AI generation';
        } else {
            assessment = 'Likely authentic image';
        }

        return {
            score: combinedScore,
            confidence: confidence,
            agreement: agreement,
            assessment: assessment,
            maxDifference: maxDifference,
            methodsUsed: aiModelAvailable ? 3 : 2,
            breakdown: {
                pixelScore: pixelScore,
                metadataScore: metadataScore,
                aiModelScore: aiModelScore,
                pixelWeight: pixelWeight,
                metadataWeight: metadataWeight,
                aiModelWeight: aiModelWeight,
                aiModelAvailable: aiModelAvailable
            }
        };
    }

    getSupportedFormatsString() {
        return 'JPEG, PNG, WebP';
    }

    getMaxFileSizeMB() {
        return this.maxFileSize / (1024 * 1024);
    }
}
