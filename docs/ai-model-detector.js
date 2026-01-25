// AI Model-based detection using Transformers.js
// Simplified version with extensive debugging
// Will use ViT first, then add more models once working

class AIModelDetector {
    constructor() {
        // Log to both console AND create visible debug flag
        console.log('🤖🤖🤖 [NEW CODE v1769147060] AIModelDetector constructor called');
        window.AI_MODEL_VERSION = 'v1769147060-MULTI-MODEL';

        this.models = {
            vit: null,            // ViT for pattern analysis (STARTING WITH THIS)
            clip: null,           // CLIP for zero-shot detection (will add after ViT works)
            resnet: null          // ResNet for artifact detection (will add after ViT works)
        };

        this.modelLoaded = {
            vit: false,
            clip: false,
            resnet: false
        };

        // Model configurations - Multi-model ensemble for robust AI detection
        this.modelConfigs = {
            vit: {
                name: 'Xenova/vit-base-patch16-224',
                task: 'image-classification',
                weight: 0.40,  // Pattern analysis via ImageNet classification
                quantized: true,
                enabled: true
            },
            clip: {
                name: 'Xenova/clip-vit-base-patch32',
                task: 'zero-shot-image-classification',
                weight: 0.45,  // Direct AI detection (most reliable)
                quantized: true,
                enabled: true  // Enabled for multi-model ensemble
            },
            resnet: {
                name: 'Xenova/resnet-50',
                task: 'image-classification',
                weight: 0.15,  // Additional artifact detection
                quantized: true,
                enabled: true  // Enabled for multi-model ensemble
            }
        };

        this.loadingPromises = {};
        this.debugLogs = [];  // Store debug logs to show on page

        this.addDebugLog('✅ Constructor complete - Multi-model ensemble system initialized');
        this.addDebugLog(`📋 Enabled models: ${Object.entries(this.modelConfigs).filter(([k,v]) => v.enabled).map(([k,v]) => k).join(', ')}`);

        console.log('🤖 [AI Model] Models configured:', Object.keys(this.modelConfigs));
    }

    addDebugLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.debugLogs.push(`[${timestamp}] ${message}`);
        console.log('🤖 [DEBUG]', message);

        // Keep only last 20 logs
        if (this.debugLogs.length > 20) {
            this.debugLogs.shift();
        }
    }

    getDebugLogs() {
        return this.debugLogs.join('\n');
    }

    async loadModel(modelKey) {
        if (!this.modelConfigs[modelKey].enabled) {
            this.addDebugLog(`⏭️ ${modelKey} is disabled, skipping`);
            return false;
        }

        if (this.modelLoaded[modelKey]) {
            this.addDebugLog(`✓ ${modelKey} already loaded`);
            return true;
        }

        if (this.loadingPromises[modelKey]) {
            this.addDebugLog(`⏳ ${modelKey} already loading, waiting...`);
            return this.loadingPromises[modelKey];
        }

        this.loadingPromises[modelKey] = (async () => {
            try {
                const config = this.modelConfigs[modelKey];
                this.addDebugLog(`🔄 Loading ${modelKey} (${config.name})...`);

                // Wait for Transformers.js to be ready - check multiple sources
                let pipeline = null;

                // Method 1: Check if pipeline is already available
                if (window.pipeline) {
                    this.addDebugLog('✓ Found window.pipeline directly');
                    pipeline = window.pipeline;
                }

                // Method 2: Try the promise if available
                if (!pipeline && window.transformersReady) {
                    this.addDebugLog('⏳ Waiting for Transformers.js promise...');
                    try {
                        const transformers = await Promise.race([
                            window.transformersReady,
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Promise timeout')), 5000))
                        ]);
                        pipeline = transformers.pipeline;
                        this.addDebugLog('✓ Transformers.js promise resolved');
                    } catch (e) {
                        this.addDebugLog(`⚠️ Promise failed: ${e.message}, trying alternative methods...`);
                    }
                }

                // Method 3: Import directly as fallback
                if (!pipeline) {
                    this.addDebugLog('⏳ Attempting direct import of Transformers.js...');
                    try {
                        const { pipeline: importedPipeline } = await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.1.2');
                        pipeline = importedPipeline;
                        window.pipeline = pipeline; // Cache it for next time
                        this.addDebugLog('✓ Direct import successful');
                    } catch (e) {
                        this.addDebugLog(`❌ Direct import failed: ${e.message}`);
                    }
                }

                if (!pipeline) {
                    this.addDebugLog(`❌ Pipeline not available for ${modelKey} after all attempts`);
                    this.addDebugLog(`Debug: window.pipeline=${typeof window.pipeline}, window.transformersReady=${typeof window.transformersReady}`);
                    return false;
                }

                this.addDebugLog(`🚀 Initializing ${modelKey} pipeline (task: ${config.task})...`);

                // Load the model pipeline
                this.models[modelKey] = await pipeline(config.task, config.name, {
                    quantized: config.quantized,
                    progress_callback: (progress) => {
                        if (progress.status === 'downloading') {
                            const pct = Math.round(progress.progress || 0);
                            if (pct % 25 === 0) {  // Log every 25%
                                this.addDebugLog(`📥 [${modelKey}] Downloading ${progress.file}: ${pct}%`);
                            }
                        } else if (progress.status === 'done') {
                            this.addDebugLog(`✅ [${modelKey}] Loaded: ${progress.file}`);
                        }
                    }
                });

                this.modelLoaded[modelKey] = true;
                this.addDebugLog(`🎉 ${modelKey} loaded successfully!`);
                return true;

            } catch (error) {
                this.addDebugLog(`❌ Failed to load ${modelKey}: ${error.message}`);
                console.error(`❌ [AI Model] ${modelKey} error:`, error);
                return false;
            }
        })();

        return this.loadingPromises[modelKey];
    }

    async loadAllModels() {
        this.addDebugLog('🔄 Loading all enabled models in parallel...');

        // Get enabled models
        const enabledModels = Object.entries(this.modelConfigs)
            .filter(([key, config]) => config.enabled)
            .map(([key]) => key);

        this.addDebugLog(`📋 Will load: ${enabledModels.join(', ')}`);

        // Load all enabled models in parallel
        const results = await Promise.allSettled(
            enabledModels.map(key => this.loadModel(key))
        );

        const loaded = {};
        enabledModels.forEach((key, index) => {
            loaded[key] = results[index].status === 'fulfilled' && results[index].value;
        });

        this.addDebugLog(`✅ Models loaded: ${JSON.stringify(loaded)}`);

        const anyLoaded = Object.values(loaded).some(v => v);
        this.addDebugLog(anyLoaded ? '🎉 At least one model loaded!' : '❌ No models loaded');

        return anyLoaded;
    }

    async analyze(imageElement, file) {
        try {
            this.addDebugLog('🔬 === Starting multi-model analysis ===');

            // Try to load all models (they load in parallel)
            const anyLoaded = await this.loadAllModels();

            if (!anyLoaded) {
                this.addDebugLog('❌ No models available for analysis');
                return {
                    method: 'AI Model Detection',
                    score: 0,
                    confidence: 'unavailable',
                    explanation: 'AI model detection unavailable - Models failed to load',
                    details: {
                        available: false,
                        reason: 'All models failed to load',
                        debugLogs: this.getDebugLogs()
                    }
                };
            }

            this.addDebugLog('🖼️ Determining best input format...');

            // Determine best input method - try each one and log what we have
            this.addDebugLog(`  - file: ${file ? file.type : 'none'}`);
            this.addDebugLog(`  - imageElement.src: ${imageElement.src ? 'yes ('+imageElement.src.substring(0,50)+'...)' : 'none'}`);
            this.addDebugLog(`  - imageElement type: ${imageElement.constructor.name}`);

            // Transformers.js requires URL strings or canvas elements, NOT File/Blob objects
            // Priority: imageElement.src (URL string) > blob URL from file > imageElement itself
            let inputImage;
            let inputType;

            if (imageElement.src) {
                // Best option: use the already-loaded image URL (blob URL or data URL)
                inputImage = imageElement.src;
                inputType = 'Image URL (from element.src)';
            } else if (file) {
                // Create blob URL from file if imageElement.src not available
                inputImage = URL.createObjectURL(file);
                inputType = 'Blob URL (from file)';
                this.addDebugLog(`⚠️ Created temporary blob URL for file: ${file.name}`);
            } else {
                // Fallback to element itself (may not work with all models)
                inputImage = imageElement;
                inputType = 'HTMLImageElement (fallback)';
            }

            this.addDebugLog(`✓ Using input type: ${inputType}`);

            // Run all available models in parallel
            this.addDebugLog('🚀 Running inference on all loaded models...');

            // Track if we created a temporary blob URL for cleanup
            const createdBlobUrl = inputType.includes('Blob URL');

            const analyses = await Promise.allSettled([
                this.runViTDetection(inputImage),
                this.runCLIPDetection(inputImage),
                this.runResNetDetection(inputImage)
            ]);

            // Clean up temporary blob URL if we created one
            if (createdBlobUrl && inputImage.startsWith('blob:')) {
                URL.revokeObjectURL(inputImage);
                this.addDebugLog('✓ Cleaned up temporary blob URL');
            }

            // Collect successful results
            const results = [];

            if (analyses[0].status === 'fulfilled' && analyses[0].value) {
                results.push({ model: 'vit', ...analyses[0].value });
                this.addDebugLog(`✅ ViT analysis complete: ${analyses[0].value.score}/100`);
            } else if (analyses[0].status === 'rejected') {
                this.addDebugLog(`❌ ViT failed: ${analyses[0].reason?.message || 'unknown'}`);
            }

            if (analyses[1].status === 'fulfilled' && analyses[1].value) {
                results.push({ model: 'clip', ...analyses[1].value });
                this.addDebugLog(`✅ CLIP analysis complete: ${analyses[1].value.score}/100`);
            } else if (analyses[1].status === 'rejected') {
                this.addDebugLog(`❌ CLIP failed: ${analyses[1].reason?.message || 'unknown'}`);
            }

            if (analyses[2].status === 'fulfilled' && analyses[2].value) {
                results.push({ model: 'resnet', ...analyses[2].value });
                this.addDebugLog(`✅ ResNet analysis complete: ${analyses[2].value.score}/100`);
            } else if (analyses[2].status === 'rejected') {
                this.addDebugLog(`❌ ResNet failed: ${analyses[2].reason?.message || 'unknown'}`);
            }

            if (results.length === 0) {
                this.addDebugLog('❌ All model inferences failed');
                return {
                    method: 'AI Model Detection',
                    score: 0,
                    confidence: 'error',
                    explanation: 'All model inferences failed - see debug logs',
                    details: {
                        available: false,
                        error: 'All model inferences failed',
                        debugLogs: this.getDebugLogs()
                    }
                };
            }

            this.addDebugLog(`✅ Got ${results.length} successful analyses`);

            // Combine results using weighted ensemble
            const combinedAnalysis = this.combineResults(results);

            this.addDebugLog(`🎯 Final ensemble score: ${combinedAnalysis.score}/100`);

            return {
                method: 'AI Model Detection',
                score: combinedAnalysis.score,
                confidence: combinedAnalysis.confidence,
                explanation: combinedAnalysis.explanation,
                details: {
                    available: true,
                    modelsUsed: results.map(r => r.model),
                    modelResults: results,
                    ensembleReasoning: combinedAnalysis.reasoning,
                    debugLogs: this.getDebugLogs()
                }
            };

        } catch (error) {
            this.addDebugLog(`❌ CRITICAL ERROR: ${error.message}`);
            console.error('❌ [AI Model] Analysis error:', error);
            return {
                method: 'AI Model Detection',
                score: 0,
                confidence: 'error',
                explanation: 'AI model analysis failed: ' + error.message,
                details: {
                    available: false,
                    error: error.message,
                    stack: error.stack,
                    debugLogs: this.getDebugLogs()
                }
            };
        }
    }

    async runViTDetection(input) {
        if (!this.modelLoaded.vit) {
            this.addDebugLog('⏭️ ViT not loaded, skipping');
            return null;
        }

        try {
            this.addDebugLog('🔬 [ViT] Running classification...');

            const predictions = await this.models.vit(input, { topk: 5 });

            this.addDebugLog(`📊 [ViT] Top: ${predictions[0]?.label} (${(predictions[0]?.score * 100).toFixed(1)}%)`);

            // Analyze predictions for AI indicators
            const analysis = this.analyzeImageNetPredictions(predictions);

            this.addDebugLog(`✅ [ViT] Analysis score: ${analysis.score}/100`);

            return {
                score: analysis.score,
                predictions: predictions,
                indicators: analysis.indicators,
                reasoning: `ViT: ${analysis.reasoning}`
            };

        } catch (error) {
            this.addDebugLog(`❌ [ViT] Error during inference: ${error.message}`);
            console.error('❌ [ViT] Error:', error);
            throw error;  // Re-throw so Promise.allSettled catches it
        }
    }

    async runCLIPDetection(input) {
        if (!this.modelLoaded.clip) {
            this.addDebugLog('⏭️ CLIP not loaded, skipping');
            return null;
        }

        try {
            this.addDebugLog('🔬 [CLIP] Running zero-shot classification...');

            const candidateLabels = [
                'a real photograph taken with a camera',
                'an AI-generated image',
                'a computer-generated image',
                'a synthetic artificial image',
                'an authentic real photo',
                'a deepfake or AI-created picture'
            ];

            const result = await this.models.clip(input, candidateLabels);

            this.addDebugLog(`📊 [CLIP] Results: ${result.slice(0,2).map(r => `${r.label}: ${(r.score * 100).toFixed(1)}%`).join(', ')}`);

            // Calculate AI probability from results
            let aiScore = 0;
            let realScore = 0;

            result.forEach(pred => {
                const label = pred.label.toLowerCase();
                if (label.includes('ai-generated') || label.includes('computer-generated') ||
                    label.includes('synthetic') || label.includes('artificial') || label.includes('deepfake')) {
                    aiScore += pred.score;
                } else if (label.includes('real') || label.includes('authentic') || label.includes('camera')) {
                    realScore += pred.score;
                }
            });

            const totalScore = aiScore + realScore;
            const aiProbability = totalScore > 0 ? aiScore / totalScore : 0.5;
            const score = Math.round(aiProbability * 100);

            this.addDebugLog(`✅ [CLIP] AI probability: ${(aiProbability * 100).toFixed(1)}%, Score: ${score}/100`);

            return {
                score: score,
                predictions: result,
                aiProbability: aiProbability,
                reasoning: `CLIP zero-shot: ${(aiProbability * 100).toFixed(1)}% AI-generated`
            };

        } catch (error) {
            this.addDebugLog(`❌ [CLIP] Error during inference: ${error.message}`);
            console.error('❌ [CLIP] Error:', error);
            throw error;
        }
    }

    async runResNetDetection(input) {
        if (!this.modelLoaded.resnet) {
            this.addDebugLog('⏭️ ResNet not loaded, skipping');
            return null;
        }

        try {
            this.addDebugLog('🔬 [ResNet] Running classification...');

            const predictions = await this.models.resnet(input, { topk: 5 });

            this.addDebugLog(`📊 [ResNet] Top: ${predictions[0]?.label} (${(predictions[0]?.score * 100).toFixed(1)}%)`);

            const analysis = this.analyzeImageNetPredictions(predictions);

            this.addDebugLog(`✅ [ResNet] Analysis score: ${analysis.score}/100`);

            return {
                score: analysis.score,
                predictions: predictions,
                indicators: analysis.indicators,
                reasoning: `ResNet: ${analysis.reasoning}`
            };

        } catch (error) {
            this.addDebugLog(`❌ [ResNet] Error during inference: ${error.message}`);
            console.error('❌ [ResNet] Error:', error);
            throw error;
        }
    }

    analyzeImageNetPredictions(predictions) {
        let score = 0;
        let indicators = [];
        let reasoning = [];

        const topConfidence = predictions[0].score;
        const confidenceSpread = predictions.length >= 2 ?
            predictions[0].score - predictions[1].score : topConfidence;

        // Low confidence indicates AI artifacts
        if (topConfidence < 0.2) {
            score += 40;
            indicators.push('Very low classification confidence');
            reasoning.push(`Low conf (${(topConfidence * 100).toFixed(1)}%)`);
        } else if (topConfidence < 0.4) {
            score += 25;
            indicators.push('Low confidence');
            reasoning.push(`Mod conf (${(topConfidence * 100).toFixed(1)}%)`);
        } else if (topConfidence < 0.6) {
            score += 10;
            reasoning.push(`Fair conf (${(topConfidence * 100).toFixed(1)}%)`);
        }

        // Uniform distribution suggests AI generation
        if (confidenceSpread < 0.10) {
            score += 30;
            indicators.push('Uniform probability distribution');
            reasoning.push('Equal probabilities');
        } else if (confidenceSpread < 0.20) {
            score += 15;
            reasoning.push('Moderate spread');
        }

        // Check for abstract/synthetic terms
        const syntheticTerms = [
            'abstract', 'pattern', 'texture', 'art', 'digital', 'generated',
            'synthetic', 'graphic', 'design', 'illustration', 'render',
            'screen', 'monitor', 'web', 'website', 'jigsaw', 'maze',
            'comic', 'cartoon', 'grille', 'fountain'
        ];

        const hasSyntheticTerms = predictions.some(pred =>
            syntheticTerms.some(term => pred.label.toLowerCase().includes(term))
        );

        if (hasSyntheticTerms) {
            score += 20;
            indicators.push('Synthetic/abstract classification');
            reasoning.push('Synthetic labels');
        }

        const reasoningText = reasoning.join(', ');
        return {
            score: Math.min(100, score),
            indicators: indicators,
            reasoning: reasoningText
        };
    }

    combineResults(results) {
        let totalWeightedScore = 0;
        let totalWeight = 0;
        const allReasoning = [];

        results.forEach(result => {
            const config = this.modelConfigs[result.model];
            if (config && config.enabled) {
                totalWeightedScore += result.score * config.weight;
                totalWeight += config.weight;
                allReasoning.push(result.reasoning);
            }
        });

        const finalScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0;

        let confidence = 'low';
        if (finalScore >= 60) confidence = 'high';
        else if (finalScore >= 35) confidence = 'medium';

        let explanation = '';
        if (finalScore >= 70) {
            explanation = `${results.length} AI model(s) show strong evidence of AI generation`;
        } else if (finalScore >= 50) {
            explanation = `${results.length} AI model(s) detect moderate signs of AI generation`;
        } else if (finalScore >= 30) {
            explanation = `${results.length} AI model(s) find some AI-generation indicators`;
        } else {
            explanation = `${results.length} AI model(s) suggest likely real photograph`;
        }

        return {
            score: finalScore,
            confidence: confidence,
            explanation: explanation,
            reasoning: allReasoning
        };
    }

    static isAvailable() {
        return typeof window.pipeline !== 'undefined';
    }

    getStatus() {
        return {
            available: AIModelDetector.isAvailable(),
            loaded: this.modelLoaded,
            models: Object.keys(this.modelConfigs),
            version: window.AI_MODEL_VERSION
        };
    }
}
