import puppeteer from 'puppeteer-core';

interface ScrapeResult {
    name: string;
    rating?: string;
    reviews?: string;
    address?: string;
    phone?: string;
    website?: string;
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const randomDelay = (min = 1000, max = 3000) => delay(Math.floor(Math.random() * (max - min + 1) + min));

export async function* scrapeGoogleMaps(location: string, criteria: string, limit: number = 5) {
    let browser;
    try {
        // Connect to existing Chrome instance
        browser = await puppeteer.connect({
            browserURL: 'http://127.0.0.1:9222',
            defaultViewport: null,
        });

        const page = await browser.newPage();
        await page.goto('https://www.google.com/maps', { waitUntil: 'networkidle2' });
        await randomDelay();

        // Search
        const query = `${criteria} in ${location}`;
        const searchInput = await page.$('#searchboxinput');
        if (searchInput) {
            await searchInput.click();
            for (const char of query) {
                await page.keyboard.type(char, { delay: Math.random() * 100 + 50 });
            }
            await page.keyboard.press('Enter');
        } else {
            throw new Error('Search box not found');
        }

        await page.waitForSelector('div.Nv2PK', { timeout: 10000 });
        await randomDelay(2000, 4000);

        // Scroll loop to load results
        const resultsPanel = 'div[role="feed"]';
        try {
            await page.waitForSelector(resultsPanel, { timeout: 5000 });

            // Scroll until we have enough items or hit a safety limit
            let previousHeight = 0;
            let noChangeCount = 0;

            while (true) {
                const itemCount = await page.$$eval('div.Nv2PK', els => els.length);
                console.log(`Loaded ${itemCount} items so far...`);

                if (itemCount >= limit) break;

                await page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    if (el) el.scrollBy(0, 1000);
                }, resultsPanel);

                await randomDelay(1000, 2000);

                // Check if we are stuck
                const newHeight = await page.evaluate((selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.scrollHeight : 0;
                }, resultsPanel);

                if (newHeight === previousHeight) {
                    noChangeCount++;
                    if (noChangeCount > 3) break; // Stop if no new items load after 3 tries
                } else {
                    noChangeCount = 0;
                }
                previousHeight = newHeight;
            }

        } catch (e) {
            console.log("Could not find results panel to scroll, might be a short list.");
        }

        const listItems = await page.$$('div.Nv2PK');
        console.log(`Found total ${listItems.length} items, will scrape ${Math.min(limit, listItems.length)}`);

        for (let i = 0; i < Math.min(limit, listItems.length); i++) {
            // Re-query items to avoid stale elements
            const items = await page.$$('div.Nv2PK');
            if (!items[i]) break;

            const item = items[i];
            const link = await item.$('a.hfpxzc');

            if (link) {
                // Scroll into view
                await link.evaluate(el => el.scrollIntoView());
                await randomDelay(500, 1000);

                // Click
                await link.click();
                await randomDelay(2000, 4000); // Wait for details to load

                // Extract details
                const details: ScrapeResult = { name: '' };

                try {
                    details.name = await page.$eval('h1.DUwDvf', el => el.textContent || '').catch(() => '');
                    details.rating = await page.$eval('div.F7nice > span[aria-hidden="true"]', el => el.textContent || '').catch(() => '');
                    details.address = await page.$eval('button[data-item-id="address"]', el => el.getAttribute('aria-label') || '').catch(() => '');
                    details.phone = await page.$eval('button[data-item-id*="phone"]', el => el.getAttribute('aria-label') || '').catch(() => '');
                    details.website = await page.$eval('a[data-item-id="authority"]', el => el.getAttribute('href') || '').catch(() => '');

                    // Clean up address/phone (remove "Address: " prefix)
                    if (details.address) details.address = details.address.replace(/^Address: /, '').trim();
                    if (details.phone) details.phone = details.phone.replace(/^Phone: /, '').trim();

                } catch (err) {
                    console.error("Error extracting details", err);
                }

                yield details;
            }
        }

        // await page.close(); 

    } catch (error) {
        console.error('Scraping failed:', error);
        throw error;
    } finally {
        if (browser) {
            browser.disconnect();
        }
    }
}
