# good-splunk-http

Http(s) Splunk broadcasting for Good process monitor

[![Build Status](https://travis-ci.org/yoitsro/good-splunk-http.svg?branch=master)](https://travis-ci.org/yoitsro/good-splunk-http)
[![Current Version](https://img.shields.io/npm/v/good-splunk-http.svg)](https://www.npmjs.com/package/good-splunk-http)

## Usage

`good-splunk-http` is a write stream use to send event to remote Splunk endpoints in batches. It makes a "POST" request with a JSON payload to the supplied `endpoint`. It will make a final "POST" request to the endpoint to flush the rest of the data on "finish". It conforms to the Splunk batch HTTP events format: http://dev.splunk.com/view/event-collector/SP-CAAAE6P.

## Good Splunk Http
### GoodSplunkHttp (endpoint, config)

Creates a new GoodSplunkHttp object where:

- `endpoint` - full path to remote server to transmit logs.
- `config` - configuration object
  - `[threshold]` - number of events to hold before transmission. Defaults to `20`. Set to `0` to have every event start transmission instantly. It is strongly suggested to have a set threshold to make data transmission more efficient.
  - `[errorThreshold]` - number of consecutive failed transmissions allowed (`ECONNRESET`, `ECONNREFUSED`, etc). Defaults to `0`. Failed events will be included in the next transmission until they are successfully logged or the threshold is reached (whichever comes first) at which point they will be cleared. Set to `null` to ignore all errors and always clear events.
  - `[wreck]` - configuration object to pass into [`wreck`](https://github.com/hapijs/wreck#advanced). Defaults to `{ timeout: 60000, headers: {} }`. `content-type` is always "application/json".
  - `[hecToken]` - [Splunk HEC token](http://dev.splunk.com/view/event-collector/SP-CAAAE6P#auth).


### Schema

Each POST will match the following schema. The payload that is POSTed to the `endpoint` has the following schema:

```json
{
  "host": "servername.home",
  "event": {
    "eventType": "log",
    "tags": ["request"],
    "data": {
      ...
    },
    "pid": 25685
  },
  "time": 1413464014739,
  ...
}

{
  "host": "servername.home",
  "event": {
    "eventType": "log",
    "tags": ["response"],
    "data": {
      ...
    },
    "pid": 25685
  },
  "time": 1414221317758,
  ...
}

{
  "host": "servername.home",
  "event": {
    "eventType": "log",
    "tags": ["request"],
    "data": {
      ...
    },
    "pid": 25685
  },
  "time": 1415088216608,
  ...
}
```
