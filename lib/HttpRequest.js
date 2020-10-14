/*
 * (c) Artur Doruch <arturdoruch@interia.pl>
 */

import $ from 'jquery';

export default class HttpRequest {
    /**
     * @param {string} method The form method. One of "GET" or "POST".
     * @param {string} action The form action.
     * @param {{}} data The form serialized data.
     */
    constructor(method, action, data = {}) {
        this._method = method.toUpperCase();
        this._url = action;
        this._data = data;
        this._queryString = $.param(data);

        if (this._method === 'GET' && this._queryString) {
            this._url += (/\?/.test(this._url) ? '&' : '?') + this._queryString;
        }
    }

    /**
     * @return {string}
     */
    getMethod() {
        return this._method;
    }

    /**
     * @return {string}
     */
    getUrl() {
        return this._url;
    }

    /**
     * @return {{}}
     */
    getData() {
        return this._data;
    }

    /**
     * @return {string}
     */
    getQueryString() {
        return this._queryString;
    }
}