'use strict';
// Load modules

const Stream = require('stream');
const Os = require('os');

const Stringify = require('fast-safe-stringify');
const Wreck = require('wreck');

// Declare internals

const internals = {
    defaults: {
        threshold: 20,
        sendDelay: 1000, // 1 second
        errorThreshold: 0,
        schema: 'good-splunk-http',
        wreck: {
            timeout: 60000,
            headers: {}
        }
    },
    host: Os.hostname()
};

class GoodSplunkHttp extends Stream.Writable {
    constructor(endpoint, config) {

        config = config || {};
        const headers = {
            Authorization: `Splunk ${config.hecToken}`
        };

        const settings = Object.assign({}, internals.defaults, config);
        settings.wreck.headers = Object.assign({}, settings.wreck.headers, headers);

        if (settings.errorThreshold === null) {
            settings.errorThreshold = -Infinity;
        }

        super({ objectMode: true, decodeStrings: false });
        this._settings = settings;
        this._endpoint = endpoint;
        this._data = [];
        this._failureCount = 0;

        // Standard users
        this.once('finish', () => {

            this._sendMessages();
        });
    }
    _write(data, encoding, callback) {

        const event = Object.assign({}, {
            host: internals.host,
            time: Date.now(),
            source: this._settings.source,
            event: data
        });

        this._data.push(event);
        if (this._data.length >= this._settings.threshold) {
            this._sendMessages(callback);
        }
        else {
            if (!this._timeout) {
                this._timeout = setTimeout(this._sendMessages.bind(this), this._settings.sendDelay);
            }
            setImmediate(callback);
        }
    }
    _sendMessages(callback) {

        if (this._timeout) {
            clearTimeout(this._timeout);
            this._timeout = 0;
        }

        const data = this._data;
        this._data = [];

        const envelope = data.map((d) => Stringify(d)).join('\n\n');

        const wreckOptions = Object.assign({}, this._settings.wreck, {
            payload: envelope
        });

        // Prevent this from user tampering
        wreckOptions.headers['content-type'] = 'application/json';
        Wreck.request('post', this._endpoint, wreckOptions, (err) => {

            if (err && this._failureCount < this._settings.errorThreshold) {
                this._failureCount++;
                this._data = this._data.concat(data);
                return callback && callback();
            }

            this._failureCount = 0;

            return callback && callback(this._settings.errorThreshold !== -Infinity && err);
        });
    }
}


module.exports = GoodSplunkHttp;
