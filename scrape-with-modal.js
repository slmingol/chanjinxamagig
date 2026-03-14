const puppeteer = require('puppeteer');
const fs = require('fs');

async function scrapeSingleWithModalDismiss(dateStr) {
    try {
        const browser = await puppeteer.launch({ 
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });
        
        const url = `https://raddle.quest/${dateStr}`;
        console.log(`\nScraping ${url}...`);
        
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
        await new Promise(r => setTimeout(r, 3000));
        
        // Try to dismiss any modals/overlays by clicking "Skip" button
        try {
            const skipButton = await page.$('button:contains("Skip"), button[class*="skip"]');
            if (skipButton) {
                console.log('  Clicking skip button...');
                await skipButton.click();
                await new Promise(r => setTimeout(r, 2000));
            }
        } catch (e) {
            // Try a more generic approach - look for any button with "skip" text
            try {
                await page.evaluate(() => {
                    const buttons = Array.from(document.querySelectorAll('button'));
                    const skipBtn = buttons.find(b => b.textContent.toLowerCase().includes('skip'));
                    if (skipBtn) skipBtn.click();
                });
                console.log('  Dismissed modal');
                await new Promise(r => setTimeout(r, 2000));
            } catch (e2) {
                console.log('  No modal to dismiss');
            }
        }
        
        // Take screenshot after modal dismissal
        await page.screenshot({ path: `post-modal-${dateStr.replace(/\//g, '-')}.png` });
        
        const puzzleData = await page.evaluate(() => {
            const data = {
                start: '',
                end: '',
                clues: [],
                theme: '',
                date: '',
                url: window.location.href,
                bodyLength: document.body.textContent.length
            };
            
            const fullText = document.body.textContent;
            
            // Extract start and end words (allow spaces for multi-word phrases)
            const fromToMatch = fullText.match(/From\s+([A-Z][A-Z\s]+?)\s+to\s+([A-Z][A-Z\s]+?)(?=\s+[^A-Z]|\s*$)/);
            if (fromToMatch) {
                data.start = fromToMatch[1].trim();
                data.end = fromToMatch[2].trim();
            }
            
            // Extract date
            const dateMatch = fullText.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^,]*,\\s*\\w+\\s+\\d+,\\s*\\d{4}/);
            if (dateMatch) data.date = dateMatch[0];
            
            // Extract theme
            const themeMatch = fullText.match(/Raddle #\\d+\\s+([^\\n]+?)(?:\\s+From|$)/);
            if (themeMatch) data.theme = themeMatch[1].trim();
            
            // Extract clues
            const cluesSection = fullText.match(/Clues, out of order\\s+([\\s\\S]*?)(?=About this|Switch to|$)/i);
            if (cluesSection && data.start) {
                const clueText = cluesSection[1];
                const clueLines = clueText.split(/\\s{3,}/)
                    .map(line => line.trim().replace(/\\s+/g, ' '))
                    .filter(line => {
                        return line.length > 20 && 
                               line.includes(data.start) &&
                               !line.match(/^(Switch to|About|Raddle)/i);
                    })
                    .map(line => line.replace(new RegExp(data.start, 'g'), '____'));
                data.clues = clueLines;
            }
            
            return data;
        });
        
        await browser.close();
        
        if (puzzleData.start && puzzleData.end) {
            console.log(`  ✓ ${puzzleData.start} → ${puzzleData.end} (${puzzleData.clues.length} clues)`);
            return puzzleData;
        } else {
            console.log(`  ✗ No start/end found (body: ${puzzleData.bodyLength})`);
            return null;
        }
        
    } catch (error) {
        console.error(`  ✗ Error: ${error.message}`);
        return null;
    }
}

// Main execution
(async () => {
    const dates = process.argv.slice(2);
    if (dates.length === 0) {
        console.log('Usage: node scrape-single.js DATE1 [DATE2 ...]');
        process.exit(1);
    }
    
    const recovered = [];
    
    for (const date of dates) {
        const puzzle = await scrapeSingleWithModalDismiss(date);
        if (puzzle) {
            recovered.push(puzzle);
        }
        await new Promise(r => setTimeout(r, 2000)); // Delay between requests
    }
    
    // Merge into collected-puzzles.json
    if (recovered.length > 0) {
        const existing = JSON.parse(fs.readFileSync('collected-puzzles.json'));
        existing.puzzles.push(...recovered);
        existing.count = existing.puzzles.length;
        existing.collected = new Date().toISOString();
        fs.writeFileSync('collected-puzzles.json', JSON.stringify(existing, null, 2));
        console.log(`\n✓ Added ${recovered.length} puzzles. Total now: ${existing.count}`);
    } else {
        console.log('\n✗ No puzzles recovered');
    }
})();
