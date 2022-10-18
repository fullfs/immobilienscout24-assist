process.setMaxListeners(100)

//#region Imports
// Library ----------------------------------------------------------------------------------
const Vue = require('vue/dist/vue.common.js');
const { Logger } = require('./lib/logger');
const { FilePaths } = require('./lib/file-paths.js');
const { PuppeteerWrapper } = require('./lib/puppeteer-wrapper');
const getUserAgent = require('./lib/get-user-agent');
const getResolution = require('./lib/get-resolution');
const { ipcRenderer } = require('electron');
const axios = require('axios')

let puppeteerWrapper

const app = new Vue({
    el: '#app',
    data: {
        chapters: [],
        contents: '',
        logs: [],
        logsInterator: 0,
        base: localStorage.getItem('base') || '',
        book: localStorage.getItem('book') || '',
        minutesFrom: 0.5,
        minutesTo: 0.7,
        softStart: false,
        randomChanptersLimit: false,
        activated: false,
        logsVisible: true,
        logsScrollDown: true,

        failsCounter: 0,
        knownLastItems: [],
        lastReload: '',
        push: {
            token: localStorage.getItem('push-token') || '',
            user: localStorage.getItem('push-user') || ''
        }
        // knownLastItems: JSON.parse(localStorage.getItem('knownLastItems') || '[]')
    },

    mounted() {
        this.$el.style.display = ''
    },

    methods: {
        addToLogs (obj) {
            obj.id = this.logsInterator
            this.logsInterator++

            const date = new Date()

            const hours = date.getHours().toString().padStart(2, '0')
            const minutes = date.getMinutes().toString().padStart(2, '0')
            const seconds = date.getSeconds().toString().padStart(2, '0')
            
            this.logs.push(
                Object.assign(obj, { timestamp: `${hours}:${minutes}:${seconds}` })
            )
            if (this.logs.length > 1000) {
                this.logs = this.logs.slice(-801, -1)
            }
            if (this.logsScrollDown && this.$refs.logger) {
                this.$refs.logger.scrollTop = this.$refs.logger.scrollHeight + 100;
            }
        },

        async sendNotification (message) {
            if (!this.push.token || !this.push.user) {
                return
            }
            try {
                await axios.post('https://api.pushover.net/1/messages.json', {
                    token: this.push.token,
                    user: this.push.user,
                    // token: 'azhjqjnqs6n2adsj6cbvcqng349132',
                    // user: 'uofw1snojrxsrv281pvqjdh7bfr4jg',
                    message
                })
            } catch (e) {
                const message = `Error sending notifiction: ${e}`
                this.addToLogs({ message, type: 'error' })
            }

        },

        async handleRun () {
            this.activated = true
            await this.run()
            this.activated = false
        },

        async handleStop () {
            await puppeteerWrapper.cleanup()
            this.activated = false
        },

        async run() {
            const logger = new Logger({ onMessage: this.addToLogs });
            const filePaths = new FilePaths(logger, "puppeteer-electron-quickstart");
            const { width, height } = getResolution();
            puppeteerWrapper = new PuppeteerWrapper(
                logger,
                filePaths,
                {
                    width,
                    height,
                    headless: false,
                },
                () => {
                    this.addToLogs({ message: 'Page closed' })
                }
            );
        
            try {
                const chromeSet = await puppeteerWrapper.setup();
                if (!chromeSet || !this.activated) {
                    return;
                }
                await this.initPage({ puppeteerWrapper, logger });
            } catch (e) {
                if (!puppeteerWrapper.isClosed()) {
                    const message = `Page error: ${e}`
                    this.addToLogs({ message, type: 'error' })
                    // ipcRenderer.send('notification', { 
                    //     title: message, 
                    //     body: ''
                    // })
                    // this.sendNotification(message)
                }
            }

            if (!puppeteerWrapper.isClosed()) {
                await puppeteerWrapper.cleanup();
            }

            if (this.activated) {
                await this.run()
            }
        },

        async initPage({ puppeteerWrapper, logger }) {
            // const userAgent = getUserAgent();
            const userAgent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:104.0) Gecko/20100101 Firefox/104.0'
            const page = await puppeteerWrapper.newPage({ userAgent });
            page.setDefaultNavigationTimeout(60 * 1000)

            await page.goto(`${this.base}`);

            this.addToLogs({ message: 'Starting' })
            
            this.failsCounter = 0

            while (true) {
                await page.waitFor(5000);
                const $item = await page.$('.result-list__listing')
                if ($item) {
                    this.failsCounter = 0

                    if (this.failsCounter >= 3) {
                        const message = 'Problem resolved'
                        ipcRenderer.send('notification', { 
                            title: message, 
                            body: ''
                        })
                        this.addToLogs({ message })
                    }
                    const id = await page.evaluate(el => el.getAttribute('data-id'), $item);

                    const $address = await page.$('.result-list-entry__map-link')
                    const address = await page.evaluate(el => el.innerText, $address);
    
                    const $criterions = await $item.$$('.result-list-entry__primary-criterion');
                    const texts = []
                    for( const $criterion of $criterions ) {
                        const $dd = await $criterion.$('dd')
                        const text = await page.evaluate(el => el.innerText, $dd);
                        texts.push(text)
                    }
    
                    if (!this.knownLastItems.includes(id)) {
                        const message = `${texts.join(' / ')}, ${address}`
                        ipcRenderer.send('notification', { 
                            title: address, 
                            body: texts.join(' / ')
                        })
                        this.addToLogs({ message, size: 2 })
                        this.sendNotification(message)
                        this.knownLastItems.push(id)
                        localStorage.setItem('knownLastItems', JSON.stringify(this.knownLastItems))
                    }
    
                    await page.waitFor(20000);
                } else {
                    if (
                        this.failsCounter === 3 ||
                        this.failsCounter === 63
                    ) {
                        const message = 'Captcha has appeared'
                        ipcRenderer.send('notification', { 
                            title: message, 
                            body: ''
                        })
                        this.addToLogs({ message, type: 'error' })
                        this.sendNotification(message)
                    }
                    this.failsCounter++
                    continue
                }

                await new Promise((resolve, reject) => {
                    const timeout = setTimeout(() => {
                        reject(new Error('reload timeout'))
                    }, 30 * 1000)
                    page.evaluate(() => {
                        location.reload(true)
                    }).then(() => {
                        clearTimeout(timeout)
                        resolve()
                    })
                })

                const date = new Date()
                const hours = date.getHours().toString().padStart(2, '0')
                const minutes = date.getMinutes().toString().padStart(2, '0')
                const seconds = date.getSeconds().toString().padStart(2, '0')
                this.lastReload = `${hours}:${minutes}:${seconds}`
            }

        },

        setBook(value) {
            this.book = value
            localStorage.setItem('book', value)
            this.chapters.length = 0
        },

        setBase(value) {
            this.base = value
            localStorage.setItem('base', value)
        },

        setPushToken(value) {
            this.push.token = value
            localStorage.setItem('push-token', value)
        },

        setPushUser(value) {
            this.push.user = value
            localStorage.setItem('push-user', value)
        },
    }
})


ipcRenderer.on('cleanup', async function () {
    ipcRenderer.send('cleanupdone')
})