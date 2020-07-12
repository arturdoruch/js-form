/*
 * (c) Artur Doruch <arturdoruch@interia.pl>
 */

import $ from 'jquery';
import eventRegistry from '@arturdoruch/event-registry';

/**
 * @todo Maybe rename "form element" convention name into "form field".
 *
 * HTML form manager.
 */
export default class Form {
    /**
     * @param {HTMLFormElement|jQuery|string} form The form HTMLFormElement or jQuery object, or CSS selector.
     */
    constructor(form) {
        this.$form = $(form);
        this._form = this.$form[0];

        if (!(this._form instanceof HTMLFormElement)) {
            if (typeof form === 'string') {
                throw new TypeError(`The form with selector "${form}" does not exist.`);
            }

            throw new TypeError(`Invalid form element.`);
        }

        this._elements = this._form.elements;
    };

    /**
     * Gets form name.
     *
     * @return {string}
     */
    getName() {
        return this._form.name;
    }

    /**
     * @return {string}
     */
    getAction() {
        return this._form.action;
    }

    /**
     * Gets form request method.
     *
     * @return {string}
     */
    getMethod() {
        return this._form.method;
    }

    /**
     * Gets form element.
     *
     * @param {string} name The form element name.
     *
     * @return {Node|null}
     */
    getElement(name) {
        return this._elements.namedItem(name);
    }

    /**
     * Removes form element from the DOM document.
     *
     * @param {string} name The element name.
     */
    removeElement(name) {
        let element = this._elements.namedItem(name);

        if (element) {
            this._form.removeChild(element);
        }
    }

    submit() {
        this._form.submit();
    }

    /**
     * Registers form element event and adds a listener.
     *
     * @param {string} event The event name.
     * @param {string} name The form element name or CSS selector.
     * @param {function} listener
     * @param {{}}      [options]
     * @param {[]}      [options.arguments] The listener arguments.
     * @param {{}}      [options.context = window] The listener context.
     * @param {boolean} [options.preventDefault = true]
     *
     * @return Form
     */
    addElementListener(event, name, listener, options = {}) {
        eventRegistry.on(event, this.getElement(name) || this.$form.find(name), listener,
            options.arguments, options.context, options.preventDefault
        );

        return this;
    }

    /**
     * Adds a listener to the form submit event.
     * The listener is called when button[type="submit"] is clicked or pressed enter on the input element.
     *
     * @param {function} listener
     * @param {{}}      [options]
     * @param {[]}      [options.arguments] The listener arguments.
     * @param {{}}      [options.context = window] The listener context.
     * @param {boolean} [options.preventDefault = true]
     *
     * @return Form
     */
    addSubmitListener(listener, options = {}) {
        eventRegistry.on('submit', this._form, listener, options.arguments, options.context, options.preventDefault);

        return this;
    }

    /**
     * Creates HTTP request url with form data as query string.
     *
     * @param {boolean} [skipEmptyValue = false]
     * @param {{}} [extraQueryParameters] Adds extra query parameters to the url query.
     *
     * @return {string}
     */
    createRequestUrl(skipEmptyValue, extraQueryParameters = {}) {
        let data = Object.assign({}, this.getData(skipEmptyValue), extraQueryParameters),
            queryString = $.param(data),
            url = this.getAction();

        if (queryString) {
            url += (/\?/.test(url) ? '&' : '?') + queryString;
        }

        return url;
    }

    /**
     * Gets form elements data.
     *
     * @param {boolean} [skipEmptyValues = false]
     *
     * @return {{}}
     */
    getData(skipEmptyValues) {
        let elements = this.$form.serializeArray(),
            name, value,
            data = {},
            pushCounters = {},
            patterns = {
                "validate": /^[a-zA-Z][a-zA-Z0-9_]*(?:\[(?:\d*|[a-zA-Z0-9_]+)\])*$/,
                "key": /[a-zA-Z0-9_]+|(?=\[\])/g,
                "push": /^$/,
                "fixed": /^\d+$/,
                "named": /^[a-zA-Z0-9_]+$/
            };

        const build = function (base, key, value) {
            base[key] = value;

            return base;
        };

        const pushCounter = function (key) {
            if (pushCounters[key] === undefined) {
                pushCounters[key] = 0;
            }

            return pushCounters[key]++;
        };

        for (let element of elements) {
            name = element.name;
            value = element.value;

            // Skip elements with invalid name or empty value.
            if (!patterns.validate.test(name) || skipEmptyValues === true && !value) {
                continue;
            }

            let k,
                keys = name.match(patterns.key),
                merge = value,
                reverseKey = name;

            while ((k = keys.pop()) !== undefined) {
                // Adjust reverse key
                reverseKey = reverseKey.replace(new RegExp("\\[" + k + "\\]$"), '');

                if (k.match(patterns.push)) {
                    merge = build([], pushCounter(reverseKey), merge);
                } else if (k.match(patterns.fixed)) {
                    merge = build([], k, merge);
                } else if (k.match(patterns.named)) {
                    merge = build({}, k, merge);
                }
            }

            // todo Replace with Object.assign() function and test it.
            data = $.extend(true, data, merge);
        }

        return data;
    }

    /**
     * Resets form element values.
     *
     * @param {[]} [preserveElements] The list of element names to not reset.
     * @param {boolean} [resetHiddenElements = true] Whether to reset input hidden elements.
     */
    resetData(preserveElements = [], resetHiddenElements) {
        let type;

        for (let element of this._elements) {
            type = element.type;

            if (preserveElements.indexOf(element.name) !== -1) {
                continue;
            }

            if (element.nodeName === 'SELECT') {
                for (let option of element.options) {
                    option.selected = false;
                }
            } else if (element.nodeName !== 'BUTTON') {
                if (type === 'radio' || type === 'checkbox') {
                    element.checked = false;
                } else if (type === 'hidden' && resetHiddenElements === false) {
                } else {
                    element.value = '';
                }
            }
        }
    }

    /**
     * Sets form element values.
     *
     * @param {{}} data The form data with pairs "name: value".
     */
    setData(data) {
        let value,
            option;

        for (let element of this._elements) {
            value = data[element.name];

            if (value === undefined) {
                continue;
            }

            switch (element.type) {
                case 'submit':
                case 'reset':
                case 'button':
                    break;

                case 'select-one':
                case 'select-multiple':
                    if (typeof value === 'string') {
                        value = [value];
                    }

                    element.selectedIndex = -1;
                    const optionsLength = element.options.length;

                    for (let i = 0; i < optionsLength; i++) {
                        option = element.options[i];

                        for (let val of value) {
                            if (val == option.value) {
                                option.selected = i;
                            }
                        }
                    }

                    break;
                case 'radio':
                case 'checkbox':
                    element.checked = false;

                    if (typeof value === 'string') {
                        value = [value];
                    }

                    for (let val of value) {
                        if (val == element.value) {
                            element.checked = true;
                        }
                    }

                    break;
                default:
                    element.value = value;
            }
        }
    }
}
