// AI Model-based detection using Transformers.js
// Optimized for reliability and performance
// Version: Production-Ready v2024

class AIModelDetector {
    constructor() {
        console.log('🤖 [AI Model v2024] Initializing AI Model Detector...');
        window.AI_MODEL_VERSION = 'v2024-PRODUCTION';

        // Simple, reliable single model approach
        this.model = null;
        this.modelLoaded = false;
        this.modelName = 'Xenova/vit-base-patch16-224';
        this.loadingPromise = null;
        this.debugLogs = [];

        this.addDebugLog('✅ AIModelDetector initialized');
        this.addDebugLog(`📋 Using model: ${this.modelName}`);
    }

    addDebugLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        const logMessage = `[${timestamp}] ${message}`;
        this.debugLogs.push(logMessage);
        console.log('🤖 [AI Model]', message);

        // Keep only last 50 logs
        if (this.debugLogs.length > 50) {
            this.debugLogs.shift();
        }
    }

    getDebugLogs() {
        return this.debugLogs.join('\n');
    }

    async loadModel() {
        if (this.modelLoaded && this.model) {
            this.addDebugLog('✓ Model already loaded');
            return true;
        }

        if (this.loadingPromise) {
            this.addDebugLog('⏳ Model already loading, waiting...');
            return this.loadingPromise;
        }

        this.loadingPromise = (async () => {
            try {
                this.addDebugLog('🔄 Starting model load sequence...');

                // Wait for Transformers.js to be ready
                let pipeline = window.pipeline;

                // Try to get pipeline from various sources
                if (!pipeline) {
                    this.addDebugLog('🔍 Pipeline not immediately available, checking sources...');

                    // Check if transformersReady promise exists
                    if (window.transformersReady) {
                        this.addDebugLog('⏳ Waiting for transformersReady promise...');
                        try {
                            const transformers = await Promise.race([
                                window.transformersReady,
                                new Promise((_, reject) =>
                                    setTimeout(() => reject(new Error('Timeout')), 10000)
                                )
                            ]);
                            pipeline = transformers.pipeline;
                            this.addDebugLog('✓ Got pipeline from transformersReady promise');
                        } catch (e) {
                            this.addDebugLog(`⚠️ transformersReady failed: ${e.message}`);
                        }
                    }

                    // If still no pipeline, wait for event
                    if (!pipeline) {
                        this.addDebugLog('⏳ Waiting for transformers-ready event...');
                        try {
                            pipeline = await new Promise((resolve, reject) => {
                                const timeout = setTimeout(() => {
                                    reject(new Error('Transformers.js event timeout'));
                                }, 10000);

                                window.addEventListener('transformers-ready', (e) => {
                                    clearTimeout(timeout);
                                    this.addDebugLog('✓ Received transformers-ready event');
                                    resolve(e.detail.pipeline);
                                }, { once: true });

                                // Check if already available
                                if (window.pipeline) {
                                    clearTimeout(timeout);
                                    resolve(window.pipeline);
                                }
                            });
                        } catch (e) {
                            this.addDebugLog(`⚠️ Event wait failed: ${e.message}`);
                        }
                    }
                }

                if (!pipeline) {
                    this.addDebugLog('❌ Transformers.js pipeline not available');
                    return false;
                }

                this.addDebugLog('✓ Pipeline available, loading model...');
                this.addDebugLog(`📦 Model: ${this.modelName}`);

                // Load the model with progress tracking
                this.model = await pipeline('image-classification', this.modelName, {
                    quantized: true,
                    progress_callback: (progress) => {
                        if (progress.status === 'progress' && progress.progress) {
                            const pct = Math.round(progress.progress);
                            if (pct % 20 === 0) {  // Log every 20%
                                this.addDebugLog(`📥 Downloading: ${pct}%`);
                            }
                        } else if (progress.status === 'done' && progress.file) {
                            this.addDebugLog(`✅ Loaded: ${progress.file}`);
                        }
                    }
                });

                this.modelLoaded = true;
                this.addDebugLog('🎉 Model loaded successfully and ready!');
                return true;

            } catch (error) {
                this.addDebugLog(`❌ Model load failed: ${error.message}`);
                console.error('❌ [AI Model] Load error:', error);
                return false;
            }
        })();

        return this.loadingPromise;
    }

    async analyze(imageElement, file) {
        try {
            this.addDebugLog('🔬 === Starting AI model analysis ===');

            // Try to load model
            const loaded = await this.loadModel();

            if (!loaded || !this.model) {
                this.addDebugLog('❌ Model not available, returning fallback result');
                return {
                    method: 'AI Model Detection',
                    score: 0,
                    confidence: 'unavailable',
                    explanation: 'AI model unavailable - Transformers.js not loaded. This is normal on first load.',
                    details: {
                        available: false,
                        reason: 'Model loading failed or Transformers.js unavailable',
                        debugLogs: this.getDebugLogs(),
                        fallbackUsed: true
                    }
                };
            }

            this.addDebugLog('✓ Model ready, preparing input...');

            // Determine best input format
            let input = null;
            let inputType = 'unknown';

            // Priority: File > src URL > HTMLImageElement
            if (file && file instanceof Blob) {
                input = file;
                inputType = `File (${file.type})`;
            } else if (imageElement && imageElement.src && typeof imageElement.src === 'string') {
                input = imageElement.src;
                inputType = 'Image URL';
            } else if (imageElement instanceof HTMLImageElement) {
                input = imageElement;
                inputType = 'HTMLImageElement';
            }

            this.addDebugLog(`📸 Input type: ${inputType}`);

            if (!input) {
                throw new Error('No valid input provided');
            }

            // Run inference
            this.addDebugLog('🚀 Running inference...');
            const predictions = await this.model(input, { topk: 5 });

            this.addDebugLog(`✓ Got ${predictions.length} predictions`);
            this.addDebugLog(`📊 Top: ${predictions[0].label} (${(predictions[0].score * 100).toFixed(1)}%)`);

            // Analyze predictions for AI indicators
            const analysis = this.analyzePredictions(predictions);

            this.addDebugLog(`🎯 Final score: ${analysis.score}/100 (${analysis.confidence})`);

            return {
                method: 'AI Model Detection',
                score: analysis.score,
                confidence: analysis.confidence,
                explanation: analysis.explanation,
                details: {
                    available: true,
                    modelName: this.modelName,
                    predictions: predictions.slice(0, 5),
                    topClass: predictions[0],
                    aiIndicators: analysis.indicators,
                    reasoning: analysis.reasoning,
                    debugLogs: this.getDebugLogs()
                }
            };

        } catch (error) {
            this.addDebugLog(`❌ Analysis error: ${error.message}`);
            console.error('❌ [AI Model] Analysis error:', error);
            return {
                method: 'AI Model Detection',
                score: 0,
                confidence: 'error',
                explanation: `Analysis failed: ${error.message}`,
                details: {
                    available: false,
                    error: error.message,
                    debugLogs: this.getDebugLogs()
                }
            };
        }
    }

    analyzePredictions(predictions) {
        // Analyze ImageNet predictions for AI generation indicators
        let score = 0;
        let indicators = [];
        let reasoning = [];

        const topConfidence = predictions[0].score;
        const confidenceSpread = predictions.length >= 2 ?
            predictions[0].score - predictions[1].score : topConfidence;

        // AI-generated images often show these patterns:
        // 1. Lower confidence (model is uncertain)
        if (topConfidence < 0.15) {
            score += 45;
            indicators.push('Very low classification confidence');
            reasoning.push(`Very uncertain (${(topConfidence * 100).toFixed(1)}%)`);
        } else if (topConfidence < 0.30) {
            score += 30;
            indicators.push('Low confidence classification');
            reasoning.push(`Low confidence (${(topConfidence * 100).toFixed(1)}%)`);
        } else if (topConfidence < 0.50) {
            score += 15;
            indicators.push('Moderate confidence');
            reasoning.push(`Moderate confidence (${(topConfidence * 100).toFixed(1)}%)`);
        }

        // 2. Uniform probability distribution across top predictions
        if (confidenceSpread < 0.08) {
            score += 35;
            indicators.push('Uniform probability distribution');
            reasoning.push('Multiple classes equally probable (AI artifact)');
        } else if (confidenceSpread < 0.15) {
            score += 20;
            indicators.push('Low confidence spread');
            reasoning.push('Competing predictions');
        }

        // 3. Abstract/synthetic classifications
        const syntheticTerms = [
            'abstract', 'pattern', 'texture', 'art', 'digital', 'generated',
            'synthetic', 'graphic', 'design', 'illustration', 'render', 'screen',
            'monitor', 'web', 'website', 'jigsaw', 'maze', 'comic', 'cartoon',
            'grille', 'fountain', 'shower', 'beacon', 'dam', 'stage', 'gown',
            'jersey', 'mask', 'tile', 'toilet', 'umbrella'
        ];

        const hasSyntheticTerms = predictions.some(pred =>
            syntheticTerms.some(term => pred.label.toLowerCase().includes(term))
        );

        if (hasSyntheticTerms) {
            score += 20;
            const matchedTerm = predictions.find(pred =>
                syntheticTerms.some(term => pred.label.toLowerCase().includes(term))
            );
            indicators.push('Synthetic/abstract classification');
            reasoning.push(`Classified as: ${matchedTerm.label}`);
        }

        // Determine final assessment
        let confidence = 'low';
        if (score >= 60) confidence = 'high';
        else if (score >= 35) confidence = 'medium';

        let explanation = '';
        if (score >= 70) {
            explanation = 'Strong AI generation indicators detected';
        } else if (score >= 50) {
            explanation = 'Moderate signs of AI generation';
        } else if (score >= 30) {
            explanation = 'Some AI-like characteristics present';
        } else {
            explanation = 'Likely authentic photograph';
        }

        return {
            score: Math.min(100, Math.round(score)),
            confidence,
            explanation,
            indicators,
            reasoning
        };
    }

    static isAvailable() {
        return typeof window.pipeline !== 'undefined';
    }

    getStatus() {
        return {
            available: AIModelDetector.isAvailable(),
            loaded: this.modelLoaded,
            modelName: this.modelName,
            version: window.AI_MODEL_VERSION
        };
    }
}
