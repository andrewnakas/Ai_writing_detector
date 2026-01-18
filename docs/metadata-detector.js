// Metadata and EXIF detector for AI-generated image identification

class MetadataDetector {
    constructor() {
        this.aiGeneratorMarkers = [
            'midjourney', 'dall-e', 'dalle', 'stable diffusion', 'stablediffusion',
            'firefly', 'adobe firefly', 'flux', 'imagen', 'party', 'leonardo',
            'playground', 'craiyon', 'dreamstudio', 'nightcafe', 'artbreeder',
            'deepai', 'pixray', 'wombo', 'starryai'
        ];

        this.aiSoftwareMarkers = [
            'automatic1111', 'invokeai', 'nmkd', 'comfyui', 'fooocus',
            'stable-diffusion-webui', 'sd.next'
        ];

        this.suspiciousPatterns = [
            'prompt:', 'negative prompt:', 'steps:', 'sampler:', 'cfg scale:',
            'seed:', 'size:', 'model:', 'clip skip:', 'hires'
        ];
    }

    async analyze(file) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);

            const fileType = this.detectFileType(uint8Array);
            const fileSize = file.size;

            let metadata = {
                fileName: file.name,
                fileType: fileType,
                fileSize: fileSize,
                aiMarkers: [],
                suspiciousFlags: [],
                confidence: 'low'
            };

            // Extract metadata based on file type
            if (fileType === 'JPEG') {
                metadata = { ...metadata, ...this.analyzeJPEG(uint8Array) };
            } else if (fileType === 'PNG') {
                metadata = { ...metadata, ...this.analyzePNG(uint8Array) };
            } else if (fileType === 'WEBP') {
                metadata = { ...metadata, ...this.analyzeWEBP(uint8Array) };
            }

            // Calculate score
            return this.calculateScore(metadata);

        } catch (error) {
            console.error('Metadata analysis error:', error);
            return {
                method: 'Metadata Analysis',
                score: 0,
                confidence: 'low',
                explanation: 'Unable to extract metadata: ' + error.message,
                details: {}
            };
        }
    }

    detectFileType(bytes) {
        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
            return 'JPEG';
        }
        // PNG: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
            return 'PNG';
        }
        // WEBP: RIFF....WEBP
        if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
            if (bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
                return 'WEBP';
            }
        }
        return 'Unknown';
    }

    analyzePNG(bytes) {
        const result = {
            hasEXIF: false,
            hasTextChunks: false,
            textChunks: [],
            aiMarkers: [],
            suspiciousFlags: []
        };

        // Parse PNG chunks
        let offset = 8; // Skip PNG signature

        while (offset < bytes.length - 8) {
            const length = this.readUInt32BE(bytes, offset);
            const type = String.fromCharCode(bytes[offset + 4], bytes[offset + 5], bytes[offset + 6], bytes[offset + 7]);

            if (type === 'tEXt' || type === 'iTXt' || type === 'zTXt') {
                result.hasTextChunks = true;
                const text = this.extractPNGText(bytes, offset + 8, length);
                result.textChunks.push({ type, text });

                // Check for AI markers
                const lowerText = text.toLowerCase();
                this.aiGeneratorMarkers.forEach(marker => {
                    if (lowerText.includes(marker)) {
                        result.aiMarkers.push(marker);
                    }
                });

                this.suspiciousPatterns.forEach(pattern => {
                    if (lowerText.includes(pattern)) {
                        result.suspiciousFlags.push(pattern);
                    }
                });
            }

            if (type === 'eXIf') {
                result.hasEXIF = true;
            }

            offset += 12 + length; // length + type(4) + data + CRC(4)
        }

        return result;
    }

    analyzeJPEG(bytes) {
        const result = {
            hasEXIF: false,
            hasJFIF: false,
            hasAdobeDQT: false,
            software: null,
            make: null,
            model: null,
            aiMarkers: [],
            suspiciousFlags: []
        };

        let offset = 2; // Skip SOI marker

        while (offset < bytes.length - 1) {
            if (bytes[offset] !== 0xFF) break;

            const marker = bytes[offset + 1];
            offset += 2;

            // Skip RST markers
            if (marker >= 0xD0 && marker <= 0xD7) continue;

            const length = this.readUInt16BE(bytes, offset);

            // APP1 (EXIF)
            if (marker === 0xE1) {
                const app1Data = String.fromCharCode(...Array.from(bytes.slice(offset + 2, offset + 6)));
                if (app1Data.startsWith('Exif')) {
                    result.hasEXIF = true;
                    const exifData = this.parseSimpleEXIF(bytes, offset + 8, length - 8);
                    result.software = exifData.software;
                    result.make = exifData.make;
                    result.model = exifData.model;

                    // Check for AI markers in software
                    if (exifData.software) {
                        const lowerSoftware = exifData.software.toLowerCase();
                        this.aiSoftwareMarkers.forEach(marker => {
                            if (lowerSoftware.includes(marker)) {
                                result.aiMarkers.push(marker);
                            }
                        });
                    }

                    // Missing camera make/model is suspicious
                    if (!exifData.make && !exifData.model) {
                        result.suspiciousFlags.push('no-camera-info');
                    }
                }
            }

            // APP0 (JFIF)
            if (marker === 0xE0) {
                const jfifData = String.fromCharCode(...Array.from(bytes.slice(offset + 2, offset + 7)));
                if (jfifData.startsWith('JFIF')) {
                    result.hasJFIF = true;
                }
            }

            offset += length;
        }

        return result;
    }

    analyzeWEBP(bytes) {
        const result = {
            hasEXIF: false,
            hasXMP: false,
            aiMarkers: [],
            suspiciousFlags: []
        };

        // WEBP chunk parsing would go here
        // For now, basic detection
        result.suspiciousFlags.push('webp-format'); // AI tools often export as WebP

        return result;
    }

    parseSimpleEXIF(bytes, offset, length) {
        const result = {
            software: null,
            make: null,
            model: null
        };

        try {
            // Very simplified EXIF parsing - just look for strings
            const exifString = new TextDecoder('utf-8', { fatal: false }).decode(
                bytes.slice(offset, offset + Math.min(length, 2000))
            );

            // Look for software tag (often contains AI generator info)
            const softwareMatch = exifString.match(/Software[^\x00]*\x00([^\x00]+)\x00/);
            if (softwareMatch) result.software = softwareMatch[1];

            const makeMatch = exifString.match(/Make[^\x00]*\x00([^\x00]+)\x00/);
            if (makeMatch) result.make = makeMatch[1];

            const modelMatch = exifString.match(/Model[^\x00]*\x00([^\x00]+)\x00/);
            if (modelMatch) result.model = modelMatch[1];

        } catch (e) {
            // Silent fail for parsing errors
        }

        return result;
    }

    extractPNGText(bytes, offset, length) {
        try {
            // Extract text from PNG text chunk
            const textBytes = bytes.slice(offset, offset + length);
            return new TextDecoder('utf-8', { fatal: false }).decode(textBytes);
        } catch (e) {
            return '';
        }
    }

    calculateScore(metadata) {
        let score = 0;
        let confidence = 'low';
        let reasons = [];

        // Strong indicators of AI generation
        if (metadata.aiMarkers && metadata.aiMarkers.length > 0) {
            score += 60;
            confidence = 'very-high';
            reasons.push(`Detected AI generator markers: ${metadata.aiMarkers.join(', ')}`);
        }

        // Suspicious patterns (prompt, seed, etc.)
        if (metadata.suspiciousFlags && metadata.suspiciousFlags.length > 0) {
            const promptFlags = metadata.suspiciousFlags.filter(f =>
                f.includes('prompt') || f.includes('seed') || f.includes('sampler')
            );
            if (promptFlags.length > 0) {
                score += 30;
                confidence = confidence === 'low' ? 'high' : confidence;
                reasons.push(`Found AI generation parameters in metadata`);
            }

            // Missing camera info
            if (metadata.suspiciousFlags.includes('no-camera-info') && metadata.hasEXIF) {
                score += 15;
                reasons.push('EXIF present but missing camera make/model');
            }
        }

        // PNG text chunks are common in AI images
        if (metadata.hasTextChunks && metadata.textChunks && metadata.textChunks.length > 0) {
            score += 10;
            reasons.push('Contains PNG text chunks (common in AI generators)');
        }

        // WebP format (many AI tools export as WebP)
        if (metadata.fileType === 'WEBP') {
            score += 5;
            reasons.push('WebP format (commonly used by AI generators)');
        }

        // No metadata at all is also suspicious
        if (!metadata.hasEXIF && !metadata.hasTextChunks && metadata.fileType !== 'Unknown') {
            score += 10;
            reasons.push('No metadata found (typical of AI generators that strip metadata)');
        }

        score = Math.min(100, score);

        // Adjust confidence based on score
        if (score >= 60) confidence = 'high';
        else if (score >= 30) confidence = 'medium';
        else if (score > 0) confidence = 'low';

        return {
            method: 'Metadata Analysis',
            score: Math.round(score),
            confidence: confidence,
            explanation: this.generateExplanation(score, metadata),
            details: {
                fileType: metadata.fileType,
                fileSize: metadata.fileSize,
                hasEXIF: metadata.hasEXIF,
                hasTextChunks: metadata.hasTextChunks,
                aiMarkers: metadata.aiMarkers || [],
                suspiciousFlags: metadata.suspiciousFlags || [],
                software: metadata.software,
                make: metadata.make,
                model: metadata.model,
                reasons: reasons
            }
        };
    }

    generateExplanation(score, metadata) {
        if (score >= 60) {
            return 'Strong evidence of AI generation found in metadata';
        } else if (score >= 30) {
            return 'Metadata contains suspicious patterns consistent with AI generation';
        } else if (score >= 10) {
            return 'Some metadata characteristics suggest possible AI generation';
        } else {
            return 'Metadata analysis inconclusive or suggests authentic image';
        }
    }

    // Helper methods
    readUInt32BE(bytes, offset) {
        return (bytes[offset] << 24) | (bytes[offset + 1] << 16) |
               (bytes[offset + 2] << 8) | bytes[offset + 3];
    }

    readUInt16BE(bytes, offset) {
        return (bytes[offset] << 8) | bytes[offset + 1];
    }
}
