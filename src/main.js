const fs = require('fs');
// puppeteer-extra is a wrapper around puppeteer,
// it augments the installed puppeteer with plugin functionality
const puppeteer = require('puppeteer-extra');

// add stealth plugin and use defaults (all evasion techniques)
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

const puppeteerAfp = require('puppeteer-afp');

puppeteer.use(StealthPlugin());

const c = 'KR1P';
const start = 499754;


const url = 'https://ekw.ms.gov.pl/eukw_ogol/menu.do'

function numAsStr(n) {
    let s = n.toString();
    while (s.length < 8) {
        s = '0' + s;
    }
    return s;
}

const letterValues = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'X',
    'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
    'K', 'L', 'M', 'N', 'O', 'P', 'R', 'S', 'T', 'U',
    'W', 'Y', 'Z'];

function getLetterValue(letter)
{
    return letterValues.indexOf(letter);
}

function checksum(c, n) {
    const kw = `${c.toUpperCase()}${n}`;
    let sum = 0;
    let i = 0;
    while (i < 12) {
        if (i % 3 === 0) {
            sum += getLetterValue(kw[i])
        }
        if (i % 3 === 1) {
            sum += 3 * getLetterValue(kw[i])
        }
        if (i % 3 === 2) {
            sum += 7 * getLetterValue(kw[i])
        }

        i++;
    }

    return sum % 10;
}

async function run (c, num, page) {
    const n = numAsStr(num);
    const cs = checksum(c, n).toString();
    const d = `${c}/${n}`;

    try {
        await page.goto(url);
        await page.waitForSelector('#menu > div:nth-child(2) > div:nth-child(1) > ul > li:nth-child(1) > span:nth-child(1) > a');
        await page.click('#menu > div:nth-child(2) > div:nth-child(1) > ul > li:nth-child(1) > span:nth-child(1) > a');
        await page.waitForSelector('#kodWydzialuInput');
        await page.type('#kodWydzialuInput', c);
        await page.type('#numerKsiegiWieczystej', n);
        await page.type('#cyfraKontrolna', cs);
        await page.click('#wyszukaj');

        const foundPromise = page.waitForSelector('#przyciskWydrukZwykly').then(() => true);
        const notFoundPromise = page.waitForSelector('#content-wrapper > div > div:nth-child(2) > div > p > span').then(() => false);

        const found = await Promise.race([foundPromise, notFoundPromise]);
        if (!found) {
            fs.writeFileSync(d + '.txt', 'not found');
            return;
        }

        await page.click('#przyciskWydrukZwykly');
        await page.waitForSelector('#nawigacja > tbody > tr > td:nth-child(1) > form > input[type=submit]:nth-child(7)');

        fs.mkdirSync(d, { recursive: true })
        let bodyHTML;

        await page.click('#nawigacja > tbody > tr > td:nth-child(1) > form > input[type=submit]:nth-child(7)');
        await page.waitForSelector('#contentDzialu');
        bodyHTML = await page.evaluate(() =>  document.documentElement.outerHTML);
        fs.writeFileSync(d + '/1-o.html', bodyHTML); // need to be in an async function

        await page.click('#nawigacja > tbody > tr > td:nth-child(2) > form > input[type=submit]:nth-child(7)');
        await page.waitForSelector('#contentDzialu');
        bodyHTML = await page.evaluate(() =>  document.documentElement.outerHTML);
        fs.writeFileSync(d + '/1-sp.html', bodyHTML); // need to be in an async function

        await page.click('#nawigacja > tbody > tr > td:nth-child(3) > form > input[type=submit]:nth-child(7)');
        await page.waitForSelector('#contentDzialu');
        bodyHTML = await page.evaluate(() =>  document.documentElement.outerHTML);
        fs.writeFileSync(d + '/2.html', bodyHTML); // need to be in an async function

        await page.click('#nawigacja > tbody > tr > td:nth-child(4) > form > input[type=submit]:nth-child(7)');
        await page.waitForSelector('#contentDzialu');
        bodyHTML = await page.evaluate(() =>  document.documentElement.outerHTML);
        fs.writeFileSync(d + '/3.html', bodyHTML); // need to be in an async function

        await page.click('#nawigacja > tbody > tr > td:nth-child(5) > form > input[type=submit]:nth-child(7)');
        await page.waitForSelector('#contentDzialu');
        bodyHTML = await page.evaluate(() =>  document.documentElement.outerHTML);
        fs.writeFileSync(d + '/4.html', bodyHTML); // need to be in an async function
    } catch (e) {
        fs.writeFileSync(d + '.txt', 'retry');
    }
}

async function main() {
    let browser;
    let page;

    for (let i=0; i < 100; i++) {
        console.log(i);

        if (i % 10 === 0) {
            browser = await puppeteer.launch({ headless: false });
            page = puppeteerAfp((await browser.pages())[0]);
            page.setDefaultNavigationTimeout(3000);
        }

        await run(c, start + i, page);

        if (i % 10 === 9) {
            await browser.close()
        }
    }
}

main();