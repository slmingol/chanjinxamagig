// Quick script to check Raddle numbers for different dates
const puppeteer = require('puppeteer');

async function getRaddleNumber(dateStr) {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    try {
        const url = `https://raddle.quest/${dateStr}`;
        await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForFunction(() => document.body.textContent.length > 1000, { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const data = await page.evaluate(() => {
            const text = document.body.textContent;
            const match = text.match(/Raddle #(\d+)/);
            const dateMatch = text.match(/(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)[^,]*,\s*\w+\s+\d+,\s*\d{4}/);
            return {
                number: match ? match[1] : null,
                date: dateMatch ? dateMatch[0] : null
            };
        });
        
        await browser.close();
        return data;
    } catch (error) {
        await browser.close();
        return { number: null, date: null, error: error.message };
    }
}

(async () => {
    console.log('\n=== Checking Raddle Numbers ===\n');
    
    const datesToCheck = [
        '2026/03/13',  // Today
        '2026/03/01',  // Start of month
        '2026/01/01',  // Start of year
        '2025/12/31',  // End of last year
        '2025/01/01',  // Start of last year
        '2024/01/01',  // Start of 2024
    ];
    
    for (const date of datesToCheck) {
        const result = await getRaddleNumber(date);
        if (result.number) {
            console.log(`${date} → Raddle #${result.number} (${result.date})`);
        } else {
            console.log(`${date} → No puzzle found or error: ${result.error || 'N/A'}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n=== Done ===\n');
})();
