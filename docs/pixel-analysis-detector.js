// Pixel-level analysis detector for AI-generated images
// Uses frequency domain analysis, texture features, and noise patterns

class PixelAnalysisDetector {
    constructor() {
        this.fftAnalyzer = new FFTAnalyzer();
    }

    async analyze(imageElement, file) {
        try {
            // Create canvas and get image data
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            canvas.width = imageElement.naturalWidth;
            canvas.height = imageElement.naturalHeight;
            ctx.drawImage(imageElement, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            // Downsample for performance (max 512x512)
            const maxSize = 512;
            let analysisWidth = canvas.width;
            let analysisHeight = canvas.height;

            if (canvas.width > maxSize || canvas.height > maxSize) {
                const scale = maxSize / Math.max(canvas.width, canvas.height);
                analysisWidth = Math.floor(canvas.width * scale);
                analysisHeight = Math.floor(canvas.height * scale);

                const smallCanvas = document.createElement('canvas');
                const smallCtx = smallCanvas.getContext('2d');
                smallCanvas.width = analysisWidth;
                smallCanvas.height = analysisHeight;
                smallCtx.drawImage(imageElement, 0, 0, analysisWidth, analysisHeight);

                const smallImageData = smallCtx.getImageData(0, 0, analysisWidth, analysisHeight);
                return this.performAnalysis(smallImageData.data, analysisWidth, analysisHeight, file);
            }

            return this.performAnalysis(imageData.data, analysisWidth, analysisHeight, file);

        } catch (error) {
            console.error('Pixel analysis error:', error);
            return {
                method: 'Pixel Analysis',
                score: 0,
                confidence: 'low',
                explanation: 'Unable to perform pixel analysis: ' + error.message,
                details: {}
            };
        }
    }

    performAnalysis(pixelData, width, height, file) {
        const features = {};

        // 1. Frequency domain analysis (FFT) - Most important for AI detection
        console.log('Computing FFT and checking for upsampling artifacts...');
        features.frequency = this.analyzeFrequencyDomain(pixelData, width, height);

        // 2. Upsampling artifact detection (very common in AI images)
        console.log('Detecting upsampling artifacts...');
        features.upsampling = this.detectUpsamplingArtifacts(pixelData, width, height);

        // 3. Texture analysis (GLCM-inspired) on patches
        console.log('Analyzing texture patterns...');
        features.texture = this.analyzeTexture(pixelData, width, height);

        // 4. Checkerboard pattern detection (GAN artifact)
        console.log('Checking for checkerboard patterns...');
        features.checkerboard = this.detectCheckerboard(pixelData, width, height);

        // 5. Noise pattern analysis
        console.log('Analyzing noise characteristics...');
        features.noise = this.analyzeNoise(pixelData, width, height);

        // 6. Color distribution analysis
        console.log('Analyzing color distribution...');
        features.color = this.analyzeColorDistribution(pixelData, width, height);

        // Calculate combined score
        return this.calculateScore(features, file);
    }

    analyzeFrequencyDomain(pixelData, width, height) {
        try {
            // Perform 2D FFT
            const fftResult = this.fftAnalyzer.fft2D(pixelData, width, height);
            const magnitudeSpectrum = this.fftAnalyzer.getMagnitudeSpectrum(fftResult);

            // Compute RIO (Radial Integral Operation)
            const rioValues = this.fftAnalyzer.computeRIO(magnitudeSpectrum);

            // Compute variance of RIO values
            // AI images tend to have constant RIO, real images have fluctuations
            const rioMean = rioValues.reduce((a, b) => a + b, 0) / rioValues.length;
            const rioVariance = rioValues.reduce((sum, val) => sum + Math.pow(val - rioMean, 2), 0) / rioValues.length;
            const rioStdDev = Math.sqrt(rioVariance);

            // Get frequency characteristics
            const freqCharacteristics = this.fftAnalyzer.analyzeFrequencyCharacteristics(magnitudeSpectrum);

            // AI images often have:
            // - Low RIO variance (constant spectral signature)
            // - Higher high-frequency content
            // - Distinct periodic patterns

            return {
                rioVariance: rioVariance,
                rioStdDev: rioStdDev,
                rioValues: rioValues,
                highFreqRatio: freqCharacteristics.highFreqRatio,
                midFreqRatio: freqCharacteristics.midFreqRatio,
                lowFreqRatio: freqCharacteristics.lowFreqRatio,
                // Low variance suggests AI (more constant)
                // Reduced multiplier from 500 to 200 for more sensitive detection
                aiLikelihood: Math.max(0, 100 - (rioStdDev / rioMean) * 200)
            };

        } catch (error) {
            console.warn('FFT analysis failed:', error);
            return {
                rioVariance: 0,
                rioStdDev: 0,
                highFreqRatio: 0,
                aiLikelihood: 0,
                error: error.message
            };
        }
    }

    // Detect upsampling artifacts - AI generators often upsample images leaving fingerprints
    detectUpsamplingArtifacts(pixelData, width, height) {
        let periodicPatternScore = 0;
        let duplicatePixelScore = 0;
        const checkSize = Math.min(width, height, 128); // Check a sample region

        // Check for periodic duplicate pixels (upsampling signature)
        for (let y = 0; y < checkSize - 2; y += 2) {
            for (let x = 0; x < checkSize - 2; x += 2) {
                const idx1 = (y * width + x) * 4;
                const idx2 = (y * width + (x + 1)) * 4;
                const idx3 = ((y + 1) * width + x) * 4;

                // Check if pixels are suspiciously similar (cloned by upsampling)
                const diff1 = Math.abs(pixelData[idx1] - pixelData[idx2]) +
                             Math.abs(pixelData[idx1 + 1] - pixelData[idx2 + 1]) +
                             Math.abs(pixelData[idx1 + 2] - pixelData[idx2 + 2]);

                const diff2 = Math.abs(pixelData[idx1] - pixelData[idx3]) +
                             Math.abs(pixelData[idx1 + 1] - pixelData[idx3 + 1]) +
                             Math.abs(pixelData[idx1 + 2] - pixelData[idx3 + 2]);

                if (diff1 < 3) duplicatePixelScore++;
                if (diff2 < 3) duplicatePixelScore++;
            }
        }

        const totalChecked = (checkSize / 2) * (checkSize / 2) * 2;
        const duplicateRatio = duplicatePixelScore / totalChecked;

        // AI images with upsampling typically have 15-40% duplicate/near-duplicate pixels
        let aiLikelihood = 0;
        if (duplicateRatio > 0.25) {
            aiLikelihood = 85; // Very likely upsampled
        } else if (duplicateRatio > 0.15) {
            aiLikelihood = 70; // Likely upsampled
        } else if (duplicateRatio > 0.08) {
            aiLikelihood = 50; // Possibly upsampled
        } else {
            aiLikelihood = Math.min(40, duplicateRatio * 300); // Some similarity is normal
        }

        return {
            duplicateRatio: duplicateRatio,
            aiLikelihood: aiLikelihood
        };
    }

    // Detect checkerboard patterns (common GAN artifact)
    detectCheckerboard(pixelData, width, height) {
        let checkerboardScore = 0;
        const sampleSize = Math.min(width, height, 64);
        let sampleCount = 0;

        // Look for alternating brightness patterns
        for (let y = 0; y < sampleSize - 1; y++) {
            for (let x = 0; x < sampleSize - 1; x++) {
                const idx1 = (y * width + x) * 4;
                const idx2 = (y * width + (x + 1)) * 4;
                const idx3 = ((y + 1) * width + x) * 4;
                const idx4 = ((y + 1) * width + (x + 1)) * 4;

                const brightness1 = (pixelData[idx1] + pixelData[idx1 + 1] + pixelData[idx1 + 2]) / 3;
                const brightness2 = (pixelData[idx2] + pixelData[idx2 + 1] + pixelData[idx2 + 2]) / 3;
                const brightness3 = (pixelData[idx3] + pixelData[idx3 + 1] + pixelData[idx3 + 2]) / 3;
                const brightness4 = (pixelData[idx4] + pixelData[idx4 + 1] + pixelData[idx4 + 2]) / 3;

                // Check for checkerboard pattern: diagonal pixels similar, adjacent pixels different
                const diagDiff = Math.abs(brightness1 - brightness4) + Math.abs(brightness2 - brightness3);
                const adjDiff = Math.abs(brightness1 - brightness2) + Math.abs(brightness1 - brightness3);

                if (diagDiff < 10 && adjDiff > 20) {
                    checkerboardScore++;
                }

                sampleCount++;
            }
        }

        const checkerboardRatio = checkerboardScore / sampleCount;

        let aiLikelihood = 0;
        if (checkerboardRatio > 0.1) {
            aiLikelihood = 80; // Strong checkerboard pattern
        } else if (checkerboardRatio > 0.05) {
            aiLikelihood = 60; // Moderate checkerboard
        } else if (checkerboardRatio > 0.02) {
            aiLikelihood = 40; // Slight checkerboard
        } else {
            aiLikelihood = checkerboardRatio * 1000; // Minimal
        }

        return {
            checkerboardRatio: checkerboardRatio,
            aiLikelihood: aiLikelihood
        };
    }

    analyzeTexture(pixelData, width, height) {
        // Simplified GLCM-inspired texture analysis
        let contrast = 0;
        let energy = 0;
        let homogeneity = 0;
        let entropy = 0;

        const histogram = new Array(256).fill(0);

        // Sample pixels (not full GLCM for performance)
        const sampleRate = 4; // Sample every 4th pixel
        let sampleCount = 0;

        for (let y = 0; y < height - 1; y += sampleRate) {
            for (let x = 0; x < width - 1; x += sampleRate) {
                const idx = (y * width + x) * 4;
                const gray1 = Math.floor((pixelData[idx] + pixelData[idx + 1] + pixelData[idx + 2]) / 3);

                const idx2 = (y * width + (x + 1)) * 4;
                const gray2 = Math.floor((pixelData[idx2] + pixelData[idx2 + 1] + pixelData[idx2 + 2]) / 3);

                const diff = Math.abs(gray1 - gray2);

                contrast += diff * diff;
                energy += gray1 * gray1;
                homogeneity += 1 / (1 + diff);

                histogram[gray1]++;
                sampleCount++;
            }
        }

        // Normalize
        contrast /= sampleCount;
        energy /= sampleCount;
        homogeneity /= sampleCount;

        // Calculate entropy
        for (let i = 0; i < 256; i++) {
            if (histogram[i] > 0) {
                const p = histogram[i] / sampleCount;
                entropy -= p * Math.log2(p);
            }
        }

        // AI images often have:
        // - Lower entropy (more uniform)
        // - Higher energy (smoother gradients)
        // - Lower contrast (less texture variation)

        return {
            contrast: contrast,
            energy: energy,
            homogeneity: homogeneity,
            entropy: entropy,
            // Lower entropy suggests AI
            // Increased divisor from 8 to 10 for more sensitive detection
            aiLikelihood: Math.max(0, 100 - (entropy / 10) * 100)
        };
    }

    analyzeNoise(pixelData, width, height) {
        // Analyze noise patterns - AI images have different noise characteristics
        let noiseSum = 0;
        let noiseCount = 0;

        const sampleRate = 3;

        for (let y = 1; y < height - 1; y += sampleRate) {
            for (let x = 1; x < width - 1; x += sampleRate) {
                const idx = (y * width + x) * 4;

                // Get center pixel
                const centerR = pixelData[idx];
                const centerG = pixelData[idx + 1];
                const centerB = pixelData[idx + 2];

                // Get neighbor average
                let neighborSum = 0;
                let neighborCount = 0;

                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;

                        const nIdx = ((y + dy) * width + (x + dx)) * 4;
                        neighborSum += pixelData[nIdx] + pixelData[nIdx + 1] + pixelData[nIdx + 2];
                        neighborCount += 3;
                    }
                }

                const neighborAvg = neighborSum / neighborCount;
                const centerAvg = (centerR + centerG + centerB) / 3;

                // Calculate local variance (noise indicator)
                noiseSum += Math.abs(centerAvg - neighborAvg);
                noiseCount++;
            }
        }

        const avgNoise = noiseSum / noiseCount;

        // AI images often have:
        // - Very low noise (too smooth)
        // - Or artificial noise patterns

        let aiLikelihood = 0;
        if (avgNoise < 2) {
            // Too smooth - likely AI
            aiLikelihood = 75;
        } else if (avgNoise < 5) {
            // Slightly smooth - possibly AI with added noise
            aiLikelihood = 50;
        } else if (avgNoise > 15) {
            // Too noisy - might be added artificial noise
            aiLikelihood = 45;
        } else {
            // Natural noise range (but modern AI can fake this)
            aiLikelihood = 30;
        }

        return {
            avgNoise: avgNoise,
            aiLikelihood: aiLikelihood
        };
    }

    analyzeColorDistribution(pixelData, width, height) {
        const rHist = new Array(256).fill(0);
        const gHist = new Array(256).fill(0);
        const bHist = new Array(256).fill(0);

        let pixelCount = 0;

        for (let i = 0; i < pixelData.length; i += 4) {
            rHist[pixelData[i]]++;
            gHist[pixelData[i + 1]]++;
            bHist[pixelData[i + 2]]++;
            pixelCount++;
        }

        // Calculate histogram smoothness
        const rSmoothness = this.calculateHistogramSmoothness(rHist);
        const gSmoothness = this.calculateHistogramSmoothness(gHist);
        const bSmoothness = this.calculateHistogramSmoothness(bHist);

        const avgSmoothness = (rSmoothness + gSmoothness + bSmoothness) / 3;

        // AI images often have smoother, more uniform color distributions
        const aiLikelihood = Math.min(100, avgSmoothness * 80);

        return {
            rSmoothness: rSmoothness,
            gSmoothness: gSmoothness,
            bSmoothness: bSmoothness,
            avgSmoothness: avgSmoothness,
            aiLikelihood: aiLikelihood
        };
    }

    calculateHistogramSmoothness(histogram) {
        let smoothness = 0;
        let count = 0;

        for (let i = 1; i < histogram.length; i++) {
            const diff = Math.abs(histogram[i] - histogram[i - 1]);
            smoothness += 1 / (1 + diff);
            count++;
        }

        return smoothness / count;
    }

    calculateScore(features, file) {
        // Reweighted based on research - upsampling and frequency domain are most reliable
        const weights = {
            upsampling: 0.30,     // Most reliable AI indicator
            frequency: 0.25,      // Second most reliable
            checkerboard: 0.15,   // GAN-specific artifact
            texture: 0.15,        // Supplementary
            noise: 0.10,          // Supplementary
            color: 0.05           // Least reliable alone
        };

        let weightedScore = 0;
        let confidence = 'low';
        let reasons = [];

        // Upsampling artifacts (MOST IMPORTANT - present in ~80% of AI images)
        if (features.upsampling) {
            const upsampleScore = features.upsampling.aiLikelihood;
            weightedScore += upsampleScore * weights.upsampling;

            if (features.upsampling.duplicateRatio > 0.15) {
                reasons.push(`Upsampling artifacts detected (${(features.upsampling.duplicateRatio * 100).toFixed(1)}% duplicate pixels)`);
            }
        }

        // Frequency domain analysis
        if (features.frequency && !features.frequency.error) {
            const freqScore = features.frequency.aiLikelihood;
            weightedScore += freqScore * weights.frequency;

            if (features.frequency.rioStdDev < features.frequency.rioValues[0] * 0.15) {
                reasons.push('Constant frequency spectrum (AI generator fingerprint)');
            }

            if (features.frequency.highFreqRatio > 0.25) {
                reasons.push('Elevated high-frequency content (GAN/diffusion artifact)');
            }
        }

        // Checkerboard patterns (GAN artifact)
        if (features.checkerboard) {
            const checkerScore = features.checkerboard.aiLikelihood;
            weightedScore += checkerScore * weights.checkerboard;

            if (features.checkerboard.checkerboardRatio > 0.05) {
                reasons.push(`Checkerboard pattern detected (${(features.checkerboard.checkerboardRatio * 100).toFixed(1)}% of pixels)`);
            }
        }

        // Texture analysis
        if (features.texture) {
            const textureScore = features.texture.aiLikelihood;
            weightedScore += textureScore * weights.texture;

            if (features.texture.entropy < 7.0) {
                reasons.push(`Low texture entropy ${features.texture.entropy.toFixed(2)} (unnaturally uniform)`);
            }
        }

        // Noise analysis
        if (features.noise) {
            const noiseScore = features.noise.aiLikelihood;
            weightedScore += noiseScore * weights.noise;

            if (features.noise.avgNoise < 2) {
                reasons.push(`Very low noise ${features.noise.avgNoise.toFixed(2)} (over-smoothed)`);
            } else if (features.noise.avgNoise < 5) {
                reasons.push(`Low noise ${features.noise.avgNoise.toFixed(2)} (possibly AI with added noise)`);
            }
        }

        // Color distribution
        if (features.color) {
            const colorScore = features.color.aiLikelihood;
            weightedScore += colorScore * weights.color;

            if (features.color.avgSmoothness > 0.88) {
                reasons.push('Highly uniform color distribution');
            }
        }

        const finalScore = Math.round(Math.min(100, Math.max(0, weightedScore)));

        // More aggressive confidence thresholds based on research showing 96-99% accuracy possible
        if (finalScore >= 60) confidence = 'high';
        else if (finalScore >= 40) confidence = 'medium';
        else if (finalScore >= 25) confidence = 'low';
        else confidence = 'very-low';

        return {
            method: 'Pixel Analysis',
            score: finalScore,
            confidence: confidence,
            explanation: this.generateExplanation(finalScore),
            details: {
                upsampling: features.upsampling,
                frequency: features.frequency,
                checkerboard: features.checkerboard,
                texture: features.texture,
                noise: features.noise,
                color: features.color,
                reasons: reasons
            }
        };
    }

    generateExplanation(score) {
        if (score >= 70) {
            return 'Pixel-level analysis shows strong AI generation signatures in frequency and texture patterns';
        } else if (score >= 50) {
            return 'Moderate AI-like characteristics detected in pixel analysis';
        } else if (score >= 30) {
            return 'Some AI-consistent patterns found, but results are mixed';
        } else {
            return 'Pixel analysis suggests authentic image characteristics';
        }
    }
}
