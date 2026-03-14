// Scraper that fetches puzzle data directly from raddle.quest YAML files
const https = require('https');
const fs = require('fs');

// Parse raddle.quest YAML format
function parseYAML(yamlText) {
    const data = {
        start: '',
        end: '',
        clues: [],
        solution: [],
        theme: '',
        date: ''
    };
    
    const lines = yamlText.split('\n');
    let currentSection = null;
    let currentWord = null;
    let currentClue = null;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const trimmed = line.trim();
        
        // Detect sections
        if (trimmed === 'meta:') {
            currentSection = 'meta';
            continue;
        } else if (trimmed === 'ladder:') {
            currentSection = 'ladder';
            continue;
        }
        
        // Parse meta section
        if (currentSection === 'meta') {
            if (trimmed.startsWith('theme:')) {
                data.theme = trimmed.replace('theme:', '').trim();
            }
        }
        
        // Parse ladder section
        if (currentSection === 'ladder') {
            if (trimmed.startsWith('- word:')) {
                currentWord = trimmed.replace('- word:', '').trim();
                currentClue = null;
            } else if (trimmed.startsWith('word:')) {
                currentWord = trimmed.replace('word:', '').trim();
                currentClue = null;
            } else if (trimmed.startsWith('clue:')) {
                currentClue = trimmed.replace('clue:', '').trim().replace(/^['"]|['"]$/g, '');
                
                // Save the word and clue
                if (currentWord) {
                    data.solution.push(currentWord);
                    if (currentClue) {
                        data.clues.push(currentClue);
                    }
                }
            }
        }
    }
    
    // Set start/end from solution array
    if (data.solution.length > 0) {
        data.start = data.solution[0];
        data.end = data.solution[data.solution.length - 1];
    }
    
    return data;
}

function httpsGet(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    resolve({ data, contentType: res.headers['content-type'] });
                } else {
                    reject(new Error(`HTTP ${res.statusCode}: ${url}`));
                }
            });
        }).on('error', reject);
    });
}

async function scrapeAllPuzzles() {
    console.log('📥 Fetching puzzle manifest...\n');
    
    const manifestUrl = 'https://raddle.quest/data/manifest.json';
    const manifestResponse = await httpsGet(manifestUrl);
    const manifest = JSON.parse(manifestResponse.data);
    
    console.log(`Found ${manifest.count} puzzles\n`);
    console.log(`Last updated: ${manifest.lastUpdated}\n`);
    
    const allPuzzles = [];
    const errors = [];
    
    for (let i = 0; i < manifest.puzzles.length; i++) {
        const puzzleMeta = manifest.puzzles[i];
        // Format: month="2026-03" needs to become "2026/03" for URL
        const monthPath = puzzleMeta.month.replace('-', '/');
        const yamlUrl = `https://raddle.quest/data/puzzles/${monthPath}/${puzzleMeta.slug}.yaml`;
        
        console.log(`[${i+1}/${manifest.puzzles.length}] ${puzzleMeta.title}...`);
        
        try {
            const yamlResponse = await httpsGet(yamlUrl);
            const puzzleData = parseYAML(yamlResponse.data);
            
            // Merge metadata from manifest
            puzzleData.theme = puzzleMeta.theme || puzzleData.theme;
            puzzleData.source = 'scraped';
            puzzleData.scrapedDate = new Date().toISOString();
            
            console.log(`  ✓ ${puzzleData.start} → ${puzzleData.end}`);
            console.log(`    ${puzzleData.clues.length} clues, ${puzzleData.solution.length} solution steps`);
            
            if (puzzleData.solution.length === 0) {
                console.log(`    ⚠️  No solution found!`);
            }
            
            allPuzzles.push(puzzleData);
            
            // Small delay to be respectful
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.log(`  ✗ Error: ${error.message}`);
            errors.push({ puzzle: puzzleMeta.title, error: error.message });
        }
    }
    
    console.log(`\n\n=== SCRAPING COMPLETE ===`);
    console.log(`Total puzzles: ${allPuzzles.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Puzzles with solutions: ${allPuzzles.filter(p => p.solution.length > 0).length}`);
    console.log(`Puzzles without solutions: ${allPuzzles.filter(p => p.solution.length === 0).length}`);
    
    // Save to file
    const outputPath = './data/collected-puzzles.json';
    const output = {
        count: allPuzzles.length,
        collected: new Date().toISOString(),
        puzzles: allPuzzles
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n✅ Saved ${allPuzzles.length} puzzles to ${outputPath}`);
    
    if (errors.length > 0) {
        console.log(`\n⚠️  Errors encountered:`);
        errors.forEach(e => console.log(`  - ${e.puzzle}: ${e.error}`));
    }
    
    // Show a sample puzzle with solution
    const puzzleWithSolution = allPuzzles.find(p => p.solution.length > 0);
    if (puzzleWithSolution) {
        console.log(`\n\n=== SAMPLE PUZZLE (with solution) ===`);
        console.log(JSON.stringify(puzzleWithSolution, null, 2));
    }
}

scrapeAllPuzzles().catch(console.error);
