// Network inspector to find where puzzle data (including solutions) comes from
const puppeteer = require('puppeteer');

async function inspectNetworkAndSources() {
    const browser = await puppeteer.launch({ 
        headless: false, // Run visible so we can see what happens
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    const requests = [];
    const responses = [];
    
    // Intercept all network traffic
    page.on('request', request => {
        requests.push({
            url: request.url(),
            method: request.method(),
            resourceType: request.resourceType()
        });
        console.log(`→ ${request.method()} ${request.resourceType()}: ${request.url()}`);
    });
    
    page.on('response', async response => {
        const url = response.url();
        const contentType = response.headers()['content-type'] || '';
        
        console.log(`← ${response.status()} ${contentType}: ${url}`);
        
        // Capture JSON responses
        if (contentType.includes('application/json')) {
            try {
                const json = await response.json();
                console.log('\n=== JSON RESPONSE ===');
                console.log(url);
                console.log(JSON.stringify(json, null, 2).substring(0, 2000));
                console.log('=== END JSON ===\n');
                
                responses.push({
                    url,
                    contentType,
                    data: json
                });
            } catch (e) {
                // Not valid JSON
            }
        }
        
        // Capture JavaScript files
        if (contentType.includes('javascript') || url.endsWith('.js')) {
            try {
                const text = await response.text();
                
                // Look for puzzle data patterns in JS
                if (text.includes('solution') || text.includes('ladder') || text.includes('puzzle')) {
                    console.log(`\n⚠️  JS file contains puzzle keywords: ${url}`);
                    console.log(`   File size: ${text.length} bytes`);
                    
                    // Search for solution arrays
                    const solutionMatches = text.match(/solution["\s:]+\[(.*?)\]/g);
                    if (solutionMatches) {
                        console.log(`   Found ${solutionMatches.length} solution patterns`);
                        console.log(`   Examples:`, solutionMatches.slice(0, 3));
                    }
                }
                
                responses.push({
                    url,
                    contentType,
                    size: text.length,
                    hasPuzzleData: text.includes('solution') || text.includes('ladder')
                });
            } catch (e) {
                console.error(`Error reading JS: ${e.message}`);
            }
        }
    });
    
    console.log('\n🌐 Loading raddle.quest...\n');
    await page.goto('https://raddle.quest', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
    });
    
    console.log('\n⏳ Waiting for page to fully render...\n');
    await page.waitForTimeout(5000);
    
    // Try to find and click the reveal button
    console.log('\n🔍 Looking for reveal button...\n');
    const buttonClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const revealButton = buttons.find(b => 
            b.textContent.includes('Show full ladder') || 
            b.textContent.includes('reveal') ||
            b.textContent.includes('Reveal')
        );
        
        if (revealButton) {
            console.log('Found button:', revealButton.textContent);
            revealButton.click();
            return true;
        }
        return false;
    });
    
    if (buttonClicked) {
        console.log('✅ Clicked reveal button, waiting for network activity...\n');
        await page.waitForTimeout(5000);
    } else {
        console.log('❌ No reveal button found\n');
    }
    
    // Extract all script tags and their sources
    console.log('\n📜 Examining script tags...\n');
    const scripts = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('script')).map(script => ({
            src: script.src,
            hasContent: script.textContent.length > 0,
            contentLength: script.textContent.length,
            contentPreview: script.textContent.substring(0, 500)
        }));
    });
    
    scripts.forEach(script => {
        if (script.src) {
            console.log(`Script src: ${script.src}`);
        } else if (script.hasContent) {
            console.log(`Inline script (${script.contentLength} bytes):`);
            console.log(script.contentPreview);
            console.log('...\n');
        }
    });
    
    // Check localStorage and sessionStorage
    console.log('\n💾 Checking browser storage...\n');
    const storage = await page.evaluate(() => ({
        localStorage: Object.keys(localStorage).map(key => ({
            key,
            value: localStorage.getItem(key)
        })),
        sessionStorage: Object.keys(sessionStorage).map(key => ({
            key,
            value: sessionStorage.getItem(key)
        }))
    }));
    
    console.log('localStorage:', JSON.stringify(storage.localStorage, null, 2));
    console.log('sessionStorage:', JSON.stringify(storage.sessionStorage, null, 2));
    
    // Check window object for puzzle data
    console.log('\n🪟 Checking window object for puzzle data...\n');
    const windowData = await page.evaluate(() => {
        const keys = Object.keys(window).filter(key => 
            key.toLowerCase().includes('puzzle') || 
            key.toLowerCase().includes('solution') ||
            key.toLowerCase().includes('ladder') ||
            key.toLowerCase().includes('data')
        );
        
        return keys.map(key => {
            const value = window[key];
            return {
                key,
                type: typeof value,
                value: typeof value === 'object' ? JSON.stringify(value) : String(value)
            };
        });
    });
    
    windowData.forEach(item => {
        console.log(`window.${item.key} (${item.type}):`, item.value.substring(0, 200));
    });
    
    console.log('\n\n=== SUMMARY ===');
    console.log(`Total requests: ${requests.length}`);
    console.log(`Total responses captured: ${responses.length}`);
    console.log(`JSON responses: ${responses.filter(r => r.contentType?.includes('json')).length}`);
    console.log(`JS files with puzzle data: ${responses.filter(r => r.hasPuzzleData).length}`);
    
    // Keep browser open for manual inspection
    console.log('\n⚠️  Browser window left open for manual inspection. Press Ctrl+C to close.\n');
}

inspectNetworkAndSources().catch(console.error);
