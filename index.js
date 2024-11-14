const puppeteer = require('puppeteer');
const { readFileSync, existsSync, mkdirSync } = require("fs");
const path = require('path');
const { exit } = require('process');
const {setTimeout} = require("node:timers/promises");

process.setMaxListeners(200);

const { CHROME_BIN } = process.env;

let system_inputs = null
function getOptions () {
    if (system_inputs === null) {
        let inputs = {}
        args = process.argv.slice(2)
        while (args.length) {
            let k = args.shift()
            if (k.slice(0, 2) == '--') {
                if (args.length > 0 && args[0].slice(0, 2) !== '--') {
                    inputs[k.slice(2)] = args.shift()
                } else {
                    inputs[k.slice(2)] = true
                }
            }
        }
        system_inputs = inputs
    }
    return system_inputs
}

async function getUrls() {
    let urls = [];
    const textContent = await readFileSync(path.join(getOptions().directory, 'urls.csv'), "utf8")
    for (let row of textContent.split("\n")) {
        const rs = row.split(",") 
        // Skip entries that are not text/html for Screaming Frog Inputs
        if (rs[4] && !rs[4].includes('text/html')) continue
        const r = rs[0].toString().replaceAll('"', '')
        if (r.slice(0, 4) === 'http') urls.push(r);
    }
    if (getOptions().max_urls) {
        urls = urls.slice(0, Number(getOptions().max_urls))
    }
    console.log(`Total URLs ${urls.length} (option: --max_urls [number])`)
    return urls
}

async function autoScroll(page){
    await page.evaluate(async () => {
        await new Promise((resolve, reject) => {
            var totalHeight = 0;
            var distance = 100;
            var timer = setInterval(() => {
                var scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;

                if(totalHeight >= scrollHeight - window.innerHeight){
                    clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    });
}

async function shotgunCapture(urlsPromise) {
    const dir = path.join(getOptions().directory, 'snapshots')
    if (!existsSync(dir)) mkdirSync(dir)

    // gets throttled etc
    // const urls = await urlsPromise
    // return Promise.all(urls.map(async url => {
    //     const browser = await puppeteer.launch({
    //         headless: true,
    //         timeout: 2000,
    //     });
    //     const page = await browser.newPage();
    //     await page.goto(url, {
    //         waitUntil: 'networkidle2'
    //     });
    //     await page.waitForTimeout(200)

    //     const p = url
    //         .replace('https', 'http')
    //         .replace('http://', '')
    //         .replace('/', '-')
    //         .replaceAll('.', '-')
    //         .replaceAll('/', '-')
    //         .replace(/-$/, '')
    //     const writePath = path.join(dir, p + '.png')
    //     await page.screenshot({ path: writePath, fullPage: true });
    //     browser.close();
    //     console.log(`Captured: ${url} -> Saved To: ${writePath}`)
    // }))

    const urls = await urlsPromise
    for (const url of urls) {
        // const browser = await puppeteer.launch({
        //     headless: true,
        //     timeout: 2000
        // });
        const browser = await puppeteer.launch(Object.assign({}, {
            headless: true,
            timeout: 2000
        }, { executablePath: CHROME_BIN }));

        const page = await browser.newPage();
        page.setViewport({
            width: 1920,
            height: 1080,
            deviceScaleFactor: 1,
          })
        await page.goto(url, {
            waitUntil: 'networkidle2'
        });

        await setTimeout(200);
        await autoScroll(page)
        const p = url
            .replace('https', 'http')
            .replace('http://', '')
            .replace('/', '-')
            .replaceAll('.', '-')
            .replaceAll('/', '-')
            .replace(/-$/, '')
        const writePath = path.join(dir, p + '.png')
        await page.screenshot({ path: writePath, fullPage: true });
        browser.close();
        console.log(`Captured: ${url} -> Saved To: ${writePath}`)
    }
}

function main() {
    urlsPromise = getUrls()
    shotgunCapture(urlsPromise).then(() => {
        console.log('Capture Complete')
    }).catch(err => {
        console.error(err)
        exit(1)
    })
}


if (!getOptions().directory) {
    console.log('Please provide --directory [DIRECTORY]')
    exit(0)
}
main()
