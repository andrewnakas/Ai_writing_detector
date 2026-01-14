const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const WIKI_API_URL = 'https://en.wikipedia.org/w/api.php';
const WIKI_ARTICLE = 'Wikipedia:Signs_of_AI_writing';

async function fetchWikipediaArticle() {
    try {
        console.log('Fetching Wikipedia article:', WIKI_ARTICLE);

        // Use Wikipedia API to get the article content
        const response = await axios.get(WIKI_API_URL, {
            params: {
                action: 'parse',
                page: WIKI_ARTICLE,
                format: 'json',
                prop: 'text|sections|revid',
                disableeditsection: true
            }
        });

        if (response.data.error) {
            throw new Error(`Wikipedia API error: ${response.data.error.info}`);
        }

        const pageData = response.data.parse;
        const html = pageData.text['*'];
        const $ = cheerio.load(html);

        // Extract metadata
        const metadata = {
            title: pageData.title,
            revisionId: pageData.revid,
            lastUpdated: new Date().toISOString(),
            sourceUrl: `https://en.wikipedia.org/wiki/${WIKI_ARTICLE}`
        };

        // Parse the article structure
        const signs = [];
        const categories = [];

        // Extract all sections and their content
        let currentCategory = null;
        let signCounter = 0;

        // Process headings and content
        $('h2, h3, h4').each((i, elem) => {
            const $elem = $(elem);
            const headingText = $elem.find('.mw-headline').text().trim();

            // Skip certain sections
            if (headingText.includes('References') ||
                headingText.includes('See also') ||
                headingText.includes('External links') ||
                headingText.includes('Notes')) {
                return;
            }

            if (elem.name === 'h2') {
                currentCategory = {
                    name: headingText,
                    description: '',
                    signs: []
                };

                // Get description (next p tag)
                const $nextP = $elem.nextUntil('h2, h3, h4', 'p').first();
                if ($nextP.length) {
                    currentCategory.description = $nextP.text().trim();
                }

                categories.push(currentCategory);
            } else if ((elem.name === 'h3' || elem.name === 'h4') && currentCategory) {
                signCounter++;

                // Extract the sign details
                const $content = $elem.nextUntil('h2, h3, h4');
                const description = [];
                const examples = [];
                const patterns = [];

                $content.each((j, el) => {
                    const $el = $(el);

                    if (el.name === 'p') {
                        const text = $el.text().trim();
                        if (text) {
                            description.push(text);

                            // Extract quoted examples
                            $el.find('i, em, q, code').each((k, quote) => {
                                const example = $(quote).text().trim();
                                if (example && example.length > 5) {
                                    examples.push(example);
                                }
                            });
                        }
                    } else if (el.name === 'ul' || el.name === 'ol') {
                        $el.find('li').each((k, li) => {
                            const text = $(li).text().trim();
                            if (text) {
                                patterns.push(text);

                                // Extract examples from list items
                                $(li).find('i, em, q, code').each((m, quote) => {
                                    const example = $(quote).text().trim();
                                    if (example && example.length > 5) {
                                        examples.push(example);
                                    }
                                });
                            }
                        });
                    }
                });

                const sign = {
                    id: `sign-${signCounter}`,
                    name: headingText,
                    category: currentCategory.name,
                    description: description.join('\n\n'),
                    examples: [...new Set(examples)], // Remove duplicates
                    patterns: patterns,
                    severity: determineSeverity(headingText, description.join(' ')),
                    detectability: 'medium'
                };

                signs.push(sign);
                currentCategory.signs.push(sign.id);
            }
        });

        // Build the complete data structure
        const data = {
            metadata,
            categories: categories.filter(c => c.signs.length > 0),
            signs,
            detectionRules: generateDetectionRules(signs),
            statistics: {
                totalSigns: signs.length,
                totalCategories: categories.filter(c => c.signs.length > 0).length,
                lastScraped: new Date().toISOString()
            }
        };

        // Save to file
        const outputPath = path.join(__dirname, '../docs/wiki-data.json');
        fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));

        console.log(`✓ Successfully scraped ${signs.length} signs across ${categories.length} categories`);
        console.log(`✓ Data saved to: ${outputPath}`);
        console.log(`✓ Revision ID: ${metadata.revisionId}`);

        return data;
    } catch (error) {
        console.error('Error fetching Wikipedia article:', error.message);
        throw error;
    }
}

function determineSeverity(name, description) {
    const text = (name + ' ' + description).toLowerCase();

    if (text.includes('obvious') || text.includes('clear sign') || text.includes('hallucination')) {
        return 'high';
    } else if (text.includes('common') || text.includes('frequent') || text.includes('typical')) {
        return 'medium';
    } else {
        return 'low';
    }
}

function generateDetectionRules(signs) {
    // Generate regex patterns and detection rules for each sign
    const rules = [];

    signs.forEach(sign => {
        const rule = {
            signId: sign.id,
            patterns: [],
            keywords: [],
            weight: sign.severity === 'high' ? 3 : sign.severity === 'medium' ? 2 : 1
        };

        // Extract patterns from examples
        sign.examples.forEach(example => {
            if (example.length < 100) { // Only use shorter examples as patterns
                // Escape special regex characters
                const escaped = example.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                rule.patterns.push(escaped);

                // Extract keywords (words longer than 4 chars)
                const words = example.toLowerCase().match(/\b\w{5,}\b/g);
                if (words) {
                    rule.keywords.push(...words);
                }
            }
        });

        // Extract keywords from patterns
        sign.patterns.forEach(pattern => {
            const words = pattern.toLowerCase().match(/\b\w{5,}\b/g);
            if (words) {
                rule.keywords.push(...words);
            }
        });

        // Remove duplicates
        rule.keywords = [...new Set(rule.keywords)];
        rule.patterns = [...new Set(rule.patterns)];

        rules.push(rule);
    });

    return rules;
}

// Run the scraper
fetchWikipediaArticle()
    .then(() => {
        console.log('✓ Scraping complete!');
        process.exit(0);
    })
    .catch(error => {
        console.error('✗ Scraping failed:', error);
        process.exit(1);
    });
