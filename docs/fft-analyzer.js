// Lightweight FFT implementation for frequency domain analysis
// Based on Cooley-Tukey radix-2 algorithm

class FFTAnalyzer {
    constructor() {
        this.cache = new Map();
    }

    // Compute 1D FFT using Cooley-Tukey algorithm
    fft(input) {
        const n = input.length;

        if (n === 1) return input;

        // Check cache
        const cacheKey = input.join(',');
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Ensure power of 2
        if ((n & (n - 1)) !== 0) {
            throw new Error('FFT size must be power of 2');
        }

        // Split into even and odd
        const even = [];
        const odd = [];
        for (let i = 0; i < n; i++) {
            if (i % 2 === 0) {
                even.push(input[i]);
            } else {
                odd.push(input[i]);
            }
        }

        // Recursive FFT
        const fftEven = this.fft(even);
        const fftOdd = this.fft(odd);

        // Combine
        const result = new Array(n);
        for (let k = 0; k < n / 2; k++) {
            const angle = -2 * Math.PI * k / n;
            const twiddle = {
                re: Math.cos(angle),
                im: Math.sin(angle)
            };

            const oddPart = this.complexMultiply(twiddle, fftOdd[k]);

            result[k] = this.complexAdd(fftEven[k], oddPart);
            result[k + n / 2] = this.complexSubtract(fftEven[k], oddPart);
        }

        this.cache.set(cacheKey, result);
        return result;
    }

    // 2D FFT for images
    fft2D(imageData, width, height) {
        // Pad to power of 2
        const paddedWidth = this.nextPowerOf2(width);
        const paddedHeight = this.nextPowerOf2(height);

        // Convert grayscale and pad
        const matrix = this.prepareMatrix(imageData, width, height, paddedWidth, paddedHeight);

        // FFT rows
        for (let y = 0; y < paddedHeight; y++) {
            matrix[y] = this.fft(matrix[y]);
        }

        // Transpose
        const transposed = this.transpose(matrix, paddedWidth, paddedHeight);

        // FFT columns (now rows)
        for (let x = 0; x < paddedWidth; x++) {
            transposed[x] = this.fft(transposed[x]);
        }

        // Transpose back
        return this.transpose(transposed, paddedHeight, paddedWidth);
    }

    // Compute magnitude spectrum
    getMagnitudeSpectrum(fftResult) {
        return fftResult.map(row =>
            row.map(complex => Math.sqrt(complex.re * complex.re + complex.im * complex.im))
        );
    }

    // Compute Radial Integral Operation (RIO) for UGAD-style detection
    computeRIO(magnitudeSpectrum, numRadii = 20) {
        const height = magnitudeSpectrum.length;
        const width = magnitudeSpectrum[0].length;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(centerX, centerY);

        const rioValues = [];

        for (let r = 1; r <= numRadii; r++) {
            const radius = (r / numRadii) * maxRadius;
            let sum = 0;
            let count = 0;

            // Sample points on circle
            const numSamples = Math.floor(2 * Math.PI * radius);
            for (let i = 0; i < numSamples; i++) {
                const angle = (2 * Math.PI * i) / numSamples;
                const x = Math.floor(centerX + radius * Math.cos(angle));
                const y = Math.floor(centerY + radius * Math.sin(angle));

                if (x >= 0 && x < width && y >= 0 && y < height) {
                    sum += magnitudeSpectrum[y][x];
                    count++;
                }
            }

            rioValues.push(count > 0 ? sum / count : 0);
        }

        return rioValues;
    }

    // Analyze frequency characteristics
    analyzeFrequencyCharacteristics(magnitudeSpectrum) {
        const height = magnitudeSpectrum.length;
        const width = magnitudeSpectrum[0].length;

        // Compute energy in different frequency bands
        const lowFreq = this.getBandEnergy(magnitudeSpectrum, 0, 0.3);
        const midFreq = this.getBandEnergy(magnitudeSpectrum, 0.3, 0.7);
        const highFreq = this.getBandEnergy(magnitudeSpectrum, 0.7, 1.0);

        const total = lowFreq + midFreq + highFreq;

        return {
            lowFreqRatio: lowFreq / total,
            midFreqRatio: midFreq / total,
            highFreqRatio: highFreq / total,
            totalEnergy: total,
            // AI images often have higher high-frequency content
            highFreqScore: (highFreq / total) * 100
        };
    }

    getBandEnergy(magnitudeSpectrum, minRatio, maxRatio) {
        const height = magnitudeSpectrum.length;
        const width = magnitudeSpectrum[0].length;
        const centerX = width / 2;
        const centerY = height / 2;
        const maxRadius = Math.min(centerX, centerY);

        let energy = 0;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const dx = x - centerX;
                const dy = y - centerY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const normalizedDist = distance / maxRadius;

                if (normalizedDist >= minRatio && normalizedDist < maxRatio) {
                    energy += magnitudeSpectrum[y][x];
                }
            }
        }

        return energy;
    }

    // Helper: prepare matrix from image data
    prepareMatrix(imageData, width, height, paddedWidth, paddedHeight) {
        const matrix = [];

        for (let y = 0; y < paddedHeight; y++) {
            const row = [];
            for (let x = 0; x < paddedWidth; x++) {
                if (x < width && y < height) {
                    const idx = (y * width + x) * 4;
                    // Convert to grayscale
                    const gray = (imageData[idx] + imageData[idx + 1] + imageData[idx + 2]) / 3;
                    row.push({ re: gray, im: 0 });
                } else {
                    row.push({ re: 0, im: 0 });
                }
            }
            matrix.push(row);
        }

        return matrix;
    }

    // Helper: transpose matrix
    transpose(matrix, width, height) {
        const result = [];
        for (let x = 0; x < width; x++) {
            const row = [];
            for (let y = 0; y < height; y++) {
                row.push(matrix[y][x]);
            }
            result.push(row);
        }
        return result;
    }

    // Helper: next power of 2
    nextPowerOf2(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }

    // Complex number operations
    complexAdd(a, b) {
        return { re: a.re + b.re, im: a.im + b.im };
    }

    complexSubtract(a, b) {
        return { re: a.re - b.re, im: a.im - b.im };
    }

    complexMultiply(a, b) {
        return {
            re: a.re * b.re - a.im * b.im,
            im: a.re * b.im + a.im * b.re
        };
    }
}
