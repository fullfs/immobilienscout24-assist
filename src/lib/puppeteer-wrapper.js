const puppeteer = require('puppeteer-core');
const puppeteerFirefox = require('puppeteer-firefox');
const fs = require('fs');


/** 
 * chromePath:  the path of the chrome executable in our pc
 * setup() :    initialize Puppeteer
 * cleanup():   clearnup Puppeteer
 * browser:     global Puppeteer browser instance
 * newPage():   get new page with default user agent and dimensions
 */

/**
 * options: {headless, width, height}
 */
class PuppeteerWrapper {
    constructor(logger, filePaths, options, onCleanup) {
        this._logger = logger;
        this._filePaths = filePaths;
        this._options = options || { headless: true };
        this._isClosed = false;
        this._onCleanup = onCleanup

        // Public
        this.chromePath = undefined;
        this.browser = undefined;
    }

    //#region Public API setup - cleanup

    async setup() {
        const isChromePathSet = await this._setChromePath();
        if (!isChromePathSet) {
            return false;
        }

        const args = [];
        const proxy = this._options.proxy
        // if (this._options.width) {
        //     args.push(`--window-size=${this._options.width},${this._options.height}`);
        // }
        // if (proxy) {
        //     args.push(`--proxy-server=${proxy.protocol}://${proxy.ip}:${proxy.port}`)
        // }

        args.push(...['--width=1100', '--height=1080']);

        this.browser = await puppeteerFirefox.launch({
            headless: this._options.headless,
            // executablePath: this.chromePath,
            // argspuppeteer
        });
        return true;
    }

    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
        await this._onCleanup()
        this._isClosed = true
    }

    async newPage({ userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/63.0.3239.132 Safari/537.36' } = {}) {
        const page = await this.browser.newPage();
        page.setUserAgent(userAgent);

        // if (this._options.width) {
        //     await page._client.send('Emulation.clearDeviceMetricsOverride');
        // }
        return page;
    }

    isClosed() {
        return this._isClosed
    }

    //#endregion

    //#region Helpers

    async _setChromePath() {
        this.chromePath = await this._getSavedPath();
        if (this.chromePath) {
            if (fs.existsSync(this.chromePath)) return true;

            // The saved path does not exists
            this._logger.logError(`Saved Chrome path does not exists: ${this.chromePath}`);
        }

        // Try the default path
        this.chromePath = this._getDefaultOsPath();
        if (!fs.existsSync(this.chromePath)) {
            this._logger.logError(`Default chrome path does not exists: ${this.chromePath}`);
            this._logger.logError(`Try to set chrome path in settings file: ${this._filePaths.settingsPath()}`);
            return false;
        }

        return true;
    }

    _getSavedPath() {
        const settingsPath = this._filePaths.settingsPath();

        return new Promise((resolve, reject) => {
            if (!fs.existsSync(settingsPath)) {
                resolve(undefined);
                return;
            }
            fs.readFile(settingsPath, "utf8", (err, fileContent) => {
                if (err) {
                    this._logger.logError(err);
                    reject();
                    return;
                }

                resolve(fileContent);
            });
        })
    }

    _getDefaultOsPath() {
        return '/usr/bin/firefox'
        // if (process.platform === "win32") {
        //     return 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
        // } else {
        //     return '/usr/bin/google-chrome';
        // }
    }

    //#endregion
}

module.exports = {
    PuppeteerWrapper
}