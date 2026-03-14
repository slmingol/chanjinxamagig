#!/usr/bin/env node
/**
 * Merge custom and scraped puzzles - keeping BOTH for duplicate dates
 * When a date has both scraped and custom puzzles, both are included
 * Scraped puzzles appear first, followed by custom variants
 */

const fs = require('fs');

function loadJSON(file) {
    if (!fs.existsSync(file)) {
        return { puzzles: [] };
    }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function normalizeDate(dateStr) {
    // Convert to YYYY-MM-DD for easier comparison
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
        return dateStr;
    }
    return date.toISOString().split('T')[0];
}

function main() {
    const scrapedData = loadJSON('collected-puzzles.json');
    const customData = loadJSON('custom-puzzles.json');
    
    console.log(`Loaded ${scrapedData.puzzles?.length || 0} scraped puzzles`);
    console.log(`Loaded ${customData.puzzles?.length || 0} custom puzzles`);
    
    // Combine all puzzles - keep both scraped and custom for same dates
    const allPuzzles = [];
    
    // Add custom puzzles with source tag
    if (customData.puzzles) {
        customData.puzzles.forEach(puzzle => {
            allPuzzles.push({
                ...puzzle,
                source: 'custom'
            });
        });
    }
    
    // Add scraped puzzles with source tag
    if (scrapedData.puzzles) {
        scrapedData.puzzles.forEach(puzzle => {
            // Normalize old source values
            let source = puzzle.source || 'scraped';
            if (source === 'upstream') source = 'scraped';
            if (source === 'local') source = 'custom';
            
            allPuzzles.push({
                ...puzzle,
                source: source
            });
        });
    }
    
    // Sort by date, then by source (scraped first, then custom)
    allPuzzles.sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        const dateDiff = dateA - dateB;
        
        // If same date, put scraped before custom
        if (dateDiff === 0) {
            if (a.source === 'scraped' && b.source === 'custom') return -1;
            if (a.source === 'custom' && b.source === 'scraped') return 1;
        }
        
        return dateDiff;
    });
    
    const result = {
        count: allPuzzles.length,
        collected: new Date().toISOString(),
        puzzles: allPuzzles
    };
    
    fs.writeFileSync('collected-puzzles.json', JSON.stringify(result, null, 2));
    
    const scrapedCount = allPuzzles.filter(p => p.source === 'scraped' || !p.source).length;
    const customCount = allPuzzles.filter(p => p.source === 'custom').length;
    
    // Count duplicates (same date, different sources)
    const dateCount = new Map();
    allPuzzles.forEach(p => {
        const norm = normalizeDate(p.date);
        dateCount.set(norm, (dateCount.get(norm) || 0) + 1);
    });
    const duplicates = Array.from(dateCount.values()).filter(count => count > 1).length;
    
    console.log(`\nMerge complete:`);
    console.log(`  Total puzzles: ${result.count}`);
    console.log(`  Scraped (raddle.quest): ${scrapedCount}`);
    console.log(`  Custom: ${customCount}`);
    console.log(`  Dates with both variants: ${duplicates}`);
    console.log(`  Saved to collected-puzzles.json`);
}

main();
