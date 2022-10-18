const fs = require('fs');
class Logger {
    constructor({ onMessage } = {}) {
        if (process.versions.electron) {
            this._onMessage = onMessage
        }

        this._logs = [];
        this._counters = {}
    }

    logCounter(counter, msg) {
        this._counters[counter] = this._counters[counter] || 0
        this._counters[counter] = this._counters[counter] + 1
        this.log(msg.replace('%n', this._counters[counter]));
    }

    getCounter(counter) {
        return this._counters[counter] || 0
    }

    logInfo(msg) {
        this.log(msg, 'info');
    }

    logError(msg) {
        this.log(msg, 'error')
    }

    log(msg, type) {
        if (!msg) return;

        if (this._onMessage) {
            this._onMessage({ message: msg, type: type })
        } else {
            console.log(msg);
        }

        this._logs.push(msg);
    }

    exportLogs(path) {
        return new Promise((resolve, reject) => {
            fs.writeFile(path, this._logs.join('\n'), (err) => {
                resolve();
            });
        });
    }
}
module.exports = {
    Logger
}