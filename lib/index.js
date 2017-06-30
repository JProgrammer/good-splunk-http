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
            event: data
        });

        this._data.push(event);
        if (this._data.length >= this._settings.threshold) {
            this._sendMessages((err) => {

                if (err && this._failureCount < this._settings.errorThreshold) {
                    this._failureCount++;
                    return callback();
                }

                this._data = [];
                this._failureCount = 0;

                return callback(this._settings.errorThreshold !== -Infinity && err);
            });
        }
        else {
            setImmediate(callback);
        }
    }
    _sendMessages(callback) {

        const envelope = this._data.map((data) => Stringify(data)).join('\n\n');

        const wreckOptions = Object.assign({}, this._settings.wreck, {
            payload: envelope
        });

        // Prevent this from user tampering
        wreckOptions.headers['content-type'] = 'application/json';
        Wreck.request('post', this._endpoint, wreckOptions, callback);
    }
}


module.exports = GoodSplunkHttp;
