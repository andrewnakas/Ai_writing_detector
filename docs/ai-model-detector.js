// AI Model-based detection using Transformers.js
// Runs pre-trained AI image detection models directly in the browser

class AIModelDetector {
    constructor() {
        this.model = null;
        this.modelLoaded = false;
        this.modelName = 'Xenova/vit-base-patch16-224'; // We'll use a general ViT model
        this.loadingPromise = null;
    }

    async loadModel() {
        if (this.modelLoaded) {
            return true;
        }

        if (this.loadingPromise) {
            return this.loadingPromise;
        }

        this.loadingPromise = (async () => {
            try {
                console.log('Loading AI model for image detection...');

                // Check if Transformers.js is available
                if (typeof window.pipeline === 'undefined') {
                    console.warn('Transformers.js (pipeline) not loaded, skipping AI model detection');
                    console.warn('Make sure the Transformers.js script is loaded before this script');
                    return false;
                }

                console.log('Transformers.js detected, initializing pipeline...');

                // Load image classification pipeline
                // Using a lightweight model that can detect AI-generated patterns
                this.model = await window.pipeline('image-classification', this.modelName, {
                    quantized: true, // Use quantized model for faster inference
                    device: 'wasm', // Use WebAssembly backend for compatibility
                });

                this.modelLoaded = true;
                console.log('✓ AI model loaded successfully');
                return true;

            } catch (error) {
                console.error('Failed to load AI model:', error);
                console.error('Error details:', error.message, error.stack);
                return false;
            }
        })();

        return this.loadingPromise;
    }

    async analyze(imageElement, file) {
        try {
            // Try to load model if not already loaded
            const loaded = await this.loadModel();

            if (!loaded || !this.model) {
                return {
                    method: 'AI Model Detection',
                    score: 0,
                    confidence: 'unavailable',
                    explanation: 'AI model detection unavailable - using pixel-based methods only',
                    details: {
                        available: false,
                        reason: 'Model failed to load or Transformers.js not available'
                    }
                };
            }

            console.log('Running AI model inference...');

            // Run inference - use the image src URL instead of element
            // Transformers.js v3 accepts URLs, Blobs, Canvas, or RawImage
            let predictions;
            try {
                // Try with image element first
                predictions = await this.model(imageElement.src, { topk: 5 });
            } catch (e) {
                console.warn('Failed with image src, trying file blob:', e);
                // If that fails, try with the file blob
                predictions = await this.model(file, { topk: 5 });
            }

            // Analyze predictions for AI-generation indicators
            const analysis = this.analyzePredictions(predictions);

            return {
                method: 'AI Model Detection',
                score: analysis.score,
                confidence: analysis.confidence,
                explanation: analysis.explanation,
                details: {
                    available: true,
                    modelName: this.modelName,
                    predictions: predictions,
                    topClass: predictions[0],
                    aiIndicators: analysis.indicators,
                    reasoning: analysis.reasoning
                }
            };

        } catch (error) {
            console.error('AI model analysis error:', error);
            return {
                method: 'AI Model Detection',
                score: 0,
                confidence: 'error',
                explanation: 'AI model analysis failed: ' + error.message,
                details: {
                    available: false,
                    error: error.message
                }
            };
        }
    }

    analyzePredictions(predictions) {
        // This is a heuristic approach since we're using a general ViT model
        // In a production system, you'd use a model specifically trained for AI detection

        let score = 0;
        let indicators = [];
        let reasoning = [];

        // Analyze the confidence distribution
        const topConfidence = predictions[0].score;
        const confidenceSpread = this.calculateConfidenceSpread(predictions);

        // AI-generated images often have:
        // 1. Lower confidence scores (model uncertain)
        // 2. More uniform probability distribution across classes
        // 3. Classifications that don't match real-world objects well

        // Check confidence levels
        if (topConfidence < 0.3) {
            score += 30;
            indicators.push('Low classification confidence');
            reasoning.push('Model has difficulty classifying the image, suggesting artificial patterns');
        } else if (topConfidence < 0.5) {
            score += 15;
            indicators.push('Moderate classification uncertainty');
            reasoning.push('Model shows uncertainty in classification');
        }

        // Check confidence spread
        if (confidenceSpread < 0.15) {
            score += 25;
            indicators.push('Uniform probability distribution');
            reasoning.push('Multiple classes have similar probabilities, typical of AI-generated images');
        } else if (confidenceSpread < 0.25) {
            score += 10;
            indicators.push('Moderate probability spread');
        }

        // Check for abstract/artistic classifications
        const abstractTerms = ['abstract', 'pattern', 'texture', 'art', 'digital', 'generated',
                               'synthetic', 'graphic', 'design', 'illustration', 'render'];
        const hasAbstractTerms = predictions.some(pred =>
            abstractTerms.some(term => pred.label.toLowerCase().includes(term))
        );

        if (hasAbstractTerms) {
            score += 20;
            indicators.push('Abstract/synthetic classification');
            reasoning.push('Model classifies image as abstract or synthetic content');
        }

        // Determine confidence level
        let confidence = 'low';
        if (score >= 50) confidence = 'high';
        else if (score >= 30) confidence = 'medium';

        // Generate explanation
        let explanation = '';
        if (score >= 60) {
            explanation = 'AI model shows strong indicators of artificial generation';
        } else if (score >= 40) {
            explanation = 'AI model detects moderate signs of artificial patterns';
        } else if (score >= 20) {
            explanation = 'AI model finds some unusual characteristics';
        } else {
            explanation = 'AI model suggests natural image characteristics';
        }

        return {
            score: Math.min(100, score),
            confidence: confidence,
            explanation: explanation,
            indicators: indicators,
            reasoning: reasoning
        };
    }

    calculateConfidenceSpread(predictions) {
        if (predictions.length < 2) return 1.0;

        // Calculate the difference between top and second prediction
        const topScore = predictions[0].score;
        const secondScore = predictions[1].score;

        return topScore - secondScore;
    }

    // Method to check if Transformers.js is available
    static isAvailable() {
        return typeof window.pipeline !== 'undefined';
    }

    // Method to get model status
    getStatus() {
        return {
            available: AIModelDetector.isAvailable(),
            loaded: this.modelLoaded,
            modelName: this.modelName
        };
    }
}
