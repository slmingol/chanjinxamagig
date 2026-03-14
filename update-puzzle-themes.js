const puppeteer = require('puppeteer');
const fs = require('fs');

async function updatePuzzleThemes() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        console.log('Loading raddle.quest/archive...');
        
        await page.goto('https://raddle.quest/archive', {
            waitUntil: 'networkidle0',
            timeout: 60000
        });

        console.log('Waiting for content to load...');
        await new Promise(resolve => setTimeout(resolve, 10000));

        // Take screenshot for debugging
        await page.screenshot({ path: 'archive-screenshot.png' });
        console.log('Screenshot saved to archive-screenshot.png');
        
        // Get page text
        const bodyText = await page.evaluate(() => document.body.innerText);
        fs.writeFileSync('archive-text.txt', bodyText);
        console.log(`Body text saved (${bodyText.length} chars)`);
        console.log('\nFirst 1000 chars:');
        console.log(bodyText.substring(0, 1000));

        // Extract theme-to-date mappings
        const themeMapping = await page.evaluate(() => {
            const mapping = [];
            
            // Known valid categories from archive-script.js
            const validCategories = [
                '2025 Best Picture nominees',
                'Raddle\'s 1st Anniversary',
                'Mystery Theme #6',
                'Winter Olympics',
                'Groundhog Day',
                'Wingspan Birds',
                'Martin Luther King, Jr.',
                'MIT Mystery Hunt',
                'Mystery Theme #5',
                'Guest Recommendations',
                'Raddle 300',
                'Hanukkah',
                'Board Game Gift Guide',
                'Mystery Theme #4',
                'Thanksgiving 2025',
                'X to Y',
                '7x7',
                'Block Party',
                'Halloween Whodunit',
                'Crime Fiction',
                'Settlers of Catan',
                'Make Some Noise',
                'Midwest Crossword Tournament',
                'Mystery Theme #2',
                'Fall',
                'Chicago',
                'Mystery Theme #1',
                'Horror Movie Villains',
                'Rolling Stones',
                'Ice Cream',
                'Shakespearean Phrases',
                'Dog Days of Summer',
                'Emmy Nominations 2025',
                'Severance',
                'Superman',
                'Tour de France',
                '250-Year-Old Creations',
                'Summer Produce',
                'Juneteenth',
                'Daddle',
                'Pride Month',
                'Eurovision',
                'Memorial Day',
                'Blood on the Clocktower',
                'Tony Nominations',
                'Mother\'s Day',
                'Habemus Papam',
                'Paul Ruddle',
                'Flowers',
                'Blue Prince',
                'Passover',
                'Some of My Favorite Bands',
                'Big Ears 2025',
                'Enigmarch 2025',
                'My First Raddles',
                'Best Picture nominees'
            ];
            
            // Get all text content and parse it
            const bodyText = document.body.innerText;
            const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);
            
            let currentTheme = null;
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                
                // Check if line matches any known category
                if (validCategories.includes(line)) {
                    currentTheme = line;
                } else {
                    // Check if line is a short date like "Mar 14"
                    const shortDateMatch = line.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})$/);
                    
                    if (shortDateMatch && currentTheme) {
                        mapping.push({ 
                            theme: currentTheme, 
                            month: shortDateMatch[1],
                            day: parseInt(shortDateMatch[2])
                        });
                    }
                }
            }
            
            return mapping;
        });

        await browser.close();

        console.log(`\nFound ${themeMapping.length} date-to-theme mappings`);
        
        // Month name to abbreviation mapping
        const monthMap = {
            'January': 'Jan', 'February': 'Feb', 'March': 'Mar', 'April': 'Apr',
            'May': 'May', 'June': 'Jun', 'July': 'Jul', 'August': 'Aug',
            'September': 'Sep', 'October': 'Oct', 'November': 'Nov', 'December': 'Dec'
        };
        
        // Load our puzzles
        const collectionPath = 'collected-puzzles.json';
        const collection = JSON.parse(fs.readFileSync(collectionPath, 'utf8'));
        
        let updated = 0;
        
        // Update themes based on date matching
        collection.puzzles.forEach(puzzle => {
            // Parse our puzzle date format: "Tue, February 25, 2025"
            const dateMatch = puzzle.date.match(/,\s*(\w+)\s+(\d+),\s*\d{4}/);
            if (dateMatch) {
                const monthName = dateMatch[1];
                const day = parseInt(dateMatch[2]);
                const monthAbbr = monthMap[monthName];
                
                // Find matching theme from archive
                const match = themeMapping.find(tm => 
                    tm.month === monthAbbr && tm.day === day
                );
                
                if (match) {
                    const oldTheme = puzzle.theme;
                    puzzle.theme = match.theme;
                    if (!oldTheme || oldTheme === '') {
                        updated++;
                    }
                }
            }
        });
        
        // Save updated collection
        fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
        
        console.log(`✓ Updated ${updated} puzzles with themes from archive`);
        console.log(`Total puzzles: ${collection.puzzles.length}`);
        
        // Show theme distribution
        const themeCounts = {};
        collection.puzzles.forEach(p => {
            const theme = p.theme || 'Uncategorized';
            themeCounts[theme] = (themeCounts[theme] || 0) + 1;
        });
        
        console.log('\nTheme distribution:');
        Object.entries(themeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20)
            .forEach(([theme, count]) => {
                console.log(`  ${theme}: ${count}`);
            });
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

updatePuzzleThemes();
