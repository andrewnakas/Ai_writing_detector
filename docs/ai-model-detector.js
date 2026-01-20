// AI Model-based detection using Transformers.js
// Runs pre-trained AI image detection models directly in the browser

class AIModelDetector {
    constructor() {
        console.log('🤖 [AI Model] AIModelDetector constructor called');
        this.model = null;
        this.modelLoaded = false;
        this.modelName = 'Xenova/vit-base-patch16-224'; // We'll use a general ViT model
        this.loadingPromise = null;
        console.log('🤖 [AI Model] Constructor complete - model name:', this.modelName);
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
                console.log('🤖 [AI Model] Starting to load AI model for image detection...');

                // Wait for Transformers.js to be ready
                let pipeline = window.pipeline;

                if (!pipeline && window.transformersReady) {
                    console.log('🤖 [AI Model] Waiting for Transformers.js to finish loading...');
                    try {
                        const transformers = await window.transformersReady;
                        pipeline = transformers.pipeline;
                        console.log('🤖 [AI Model] Transformers.js ready!');
                    } catch (e) {
                        console.error('🤖 [AI Model] Failed to get transformers from promise:', e);
                    }
                }

                // If still not available, try waiting for event
                if (!pipeline) {
                    console.log('🤖 [AI Model] Pipeline not available yet, waiting for transformers-ready event...');
                    pipeline = await new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('Timeout waiting for Transformers.js'));
                        }, 10000); // 10 second timeout

                        window.addEventListener('transformers-ready', (e) => {
                            clearTimeout(timeout);
                            console.log('🤖 [AI Model] Received transformers-ready event');
                            resolve(e.detail.pipeline);
                        }, { once: true });

                        // Check if it's already available
                        if (window.pipeline) {
                            clearTimeout(timeout);
                            resolve(window.pipeline);
                        }
                    });
                }

                if (!pipeline) {
                    console.error('🤖 [AI Model] Transformers.js pipeline not available after waiting');
                    return false;
                }

                console.log('🤖 [AI Model] Pipeline function available, initializing model...');
                console.log('🤖 [AI Model] Model name:', this.modelName);

                // Load image classification pipeline
                // Using a lightweight model that can detect AI-generated patterns
                this.model = await pipeline('image-classification', this.modelName, {
                    quantized: true, // Use quantized model for faster inference
                    progress_callback: (progress) => {
                        if (progress.status === 'downloading') {
                            console.log(`🤖 [AI Model] Downloading model: ${progress.file} - ${Math.round(progress.progress || 0)}%`);
                        } else if (progress.status === 'done') {
                            console.log(`🤖 [AI Model] Loaded: ${progress.file}`);
                        }
                    }
                });

                this.modelLoaded = true;
                console.log('✅ [AI Model] Model loaded successfully and ready for inference!');
                return true;

            } catch (error) {
                console.error('❌ [AI Model] Failed to load AI model:', error);
                console.error('❌ [AI Model] Error details:', error.message);
                if (error.stack) console.error('❌ [AI Model] Stack:', error.stack);
                return false;
            }
        })();

        return this.loadingPromise;
    }

    async analyze(imageElement, file) {
        try {
            console.log('🤖 [AI Model] Starting analysis...');

            // Try to load model if not already loaded
            const loaded = await this.loadModel();

            if (!loaded || !this.model) {
                console.warn('🤖 [AI Model] Model not available, returning unavailable status');
                return {
                    method: 'AI Model Detection',
                    score: 0,
                    confidence: 'unavailable',
                    explanation: 'AI model detection unavailable - Transformers.js failed to load',
                    details: {
                        available: false,
                        reason: 'Model failed to load or Transformers.js not available'
                    }
                };
            }

            console.log('🤖 [AI Model] Model loaded, running inference...');
            console.log('🤖 [AI Model] Image src type:', typeof imageElement.src);
            console.log('🤖 [AI Model] File type:', file ? file.type : 'no file');

            // Run inference - try multiple input methods
            // Transformers.js v3 accepts: URL strings, File/Blob objects, HTMLImageElement, Canvas, or RawImage
            let predictions;
            let lastError = null;

            // Method 1: Try with the file blob (most reliable)
            if (file) {
                try {
                    console.log('🤖 [AI Model] Trying inference with File blob...');
                    predictions = await this.model(file, { topk: 5 });
                    console.log('✅ [AI Model] Inference successful with File blob!');
                } catch (e) {
                    console.warn('⚠️ [AI Model] Failed with file blob:', e.message);
                    lastError = e;
                }
            }

            // Method 2: Try with image src URL
            if (!predictions && imageElement.src) {
                try {
                    console.log('🤖 [AI Model] Trying inference with image.src URL...');
                    predictions = await this.model(imageElement.src, { topk: 5 });
                    console.log('✅ [AI Model] Inference successful with src URL!');
                } catch (e) {
                    console.warn('⚠️ [AI Model] Failed with image src:', e.message);
                    lastError = e;
                }
            }

            // Method 3: Try with the image element itself
            if (!predictions) {
                try {
                    console.log('🤖 [AI Model] Trying inference with HTMLImageElement...');
                    predictions = await this.model(imageElement, { topk: 5 });
                    console.log('✅ [AI Model] Inference successful with image element!');
                } catch (e) {
                    console.warn('⚠️ [AI Model] Failed with image element:', e.message);
                    lastError = e;
                }
            }

            if (!predictions) {
                throw lastError || new Error('All inference methods failed');
            }

            console.log('🤖 [AI Model] Predictions received:', predictions.length, 'results');
            console.log('🤖 [AI Model] Top prediction:', predictions[0]?.label, '-', (predictions[0]?.score * 100).toFixed(1) + '%');

            // Analyze predictions for AI-generation indicators
            const analysis = this.analyzePredictions(predictions);

            console.log('🤖 [AI Model] Analysis complete - Score:', analysis.score);

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
            console.error('❌ [AI Model] Analysis error:', error);
            console.error('❌ [AI Model] Error details:', error.message);
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
