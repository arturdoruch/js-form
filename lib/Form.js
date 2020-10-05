/*
 * (c) Artur Doruch <arturdoruch@interia.pl>
 */

import $ from 'jquery';
import eventRegistry from '@arturdoruch/event-registry';

const formElementNames = [
    'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'
];

/**
 * HTML form manager.
 */
export default class Form {
    /**
     * @param {HTMLFormElement|jQuery|string} form The form HTMLFormElement or jQuery object, or CSS selector.
     * param {string} [submitButton] The name of the button element submitting the form.
     * param {string} [resetButton] The name of the button element resetting the form element values.
     */
    constructor(form) {
        this._selector = form;
        this._setForm();

        this._eventData = [];
        this._submitData = [];
    }

    /**
     * Refreshes the form elements. Re-registers event listener to the form element.
     */
    refresh() {
        this._setForm();

        let data = this._eventData;
        this._eventData = [];

        for (let item of data) {
            this.addElementListener(item.event, item.name, item.listener, item.options);
        }

        data = this._submitData;
        this._submitData = [];

        for (let item of data) {
            this.addSubmitListener(item.listener, item.options);
        }
    }

    /**
     * Setup the form and form elements.
     */
    _setForm() {
        this.$form = $(this._selector);
        this._form = this.$form[0];

        if (!(this._form instanceof HTMLFormElement)) {
            if (typeof this._selector === 'string') {
                throw new TypeError(`Form with selector "${this._selector}" does not exist.`);
            }

            throw new TypeError(`Invalid form element.`);
        }

        this._elements = this._form.elements;
    }

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
     * @param {string} name The form element name.
     *
     * @return {boolean}
     */
    hasElement(name) {
        return this._elements.namedItem(name) !== null;
    }

    /**
     * Gets form elements with name or CSS selector.
     *
     * @param {string} name The form element name or CSS selector.
     *
     * @return {Node[]|NodeList}
     */
    getElements(name) {
        try {
            const element = this.getElement(name);

            if (element instanceof NodeList) {
                return element;
            }

            return [element];
        } catch (error) {
        }

        const found = this._form.querySelectorAll(name);
        const elements = [];

        for (const element of found) {
            if (formElementNames.indexOf(element.nodeName) !== -1) {
                elements.push(element);
            }
        }

        return elements;
    }

    /**
     * Gets form element with name.
     *
     * @param {string} name The form element name.
     *
     * @return {Node|NodeList}
     * @throws TypeError when form not contain element with specified name.
     */
    getElement(name) {
        const element = this._elements.namedItem(name);

        if (!element) {
            throw new TypeError(`The form does not contain an element with name "${name}".`);
        }

        return element;
    }

    /**
     * Removes form elements from the DOM document.
     *
     * @param {string} name The element name or CSS selector.
     */
    removeElement(name) {
        $(this.getElements(name)).remove();
    }

    /**
     * Submits the form.
     */
    submit() {
        this._form.submit();
    }

    /**
     * Registers event listener to the form element.
     *
     * @param {string} event The event name.
     * @param {string} name The form element name or CSS selector.
     * @param {function} listener
     * @param {{}}      [options]
     * @param {[]}      [options.arguments] The listener arguments.
     * @param {{}}      [options.context = window] The listener context.
     * @param {boolean} [options.preventDefault = true] Whether to block element default event
     *                                                  (e.g. stop button from sending the form).
     *
     * @return Form
     */
    addElementListener(event, name, listener, options = {}) {
        eventRegistry.on(event, this.getElements(name), listener,
            options.arguments, options.context, options.preventDefault
        );
        this._eventData.push({ event, name, listener, options });

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
        this._submitData.push({ listener, options });

        return this;
    }

    /**
     * Creates HTTP request url with form data as query string.
     *
     * @param {boolean} [skipEmptyValue = false] Whether to not include query parameter names with empty value.
     * @param {{}} [extraQueryParameters] The extra query parameters to add to the url query.
     *                                    Object with parameters "name":"value" pairs.
     *
     * @return {string}
     */
    createRequestUrl(skipEmptyValue, extraQueryParameters = {}) {
        let data = $.extend(this.getData(skipEmptyValue), extraQueryParameters),
            queryString = $.param(data),
            url = this.getAction();

        if (queryString) {
            url += (/\?/.test(url) ? '&' : '?') + queryString;
        }

        return url;
    }

    /**
     * Calls specified function for the all of form elements.
     *
     * @param {function} fn The function to call with all of form elements. Function argument: {Node|NodeList} element
     * @param {object} [fnContext = null]
     */
    callElementsFunction(fn, fnContext = null) {
        for (const element of this._elements) {
            fn.call(fnContext, element);
        }
    }

    /**
     * Gets form elements data.
     *
     * @param {boolean} [skipEmptyValues = false] Whether to not include query parameter names with empty value.
     *
     * @return {{}} The form elements data with "name":"value" pairs.
     */
    getData(skipEmptyValues) {
        let elements = this.$form.serializeArray(),
            data = {},
            pushCounters = {};

        const patterns = {
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

        for (const element of elements) {
            const name = element.name;

            // Skip elements with invalid name or empty value.
            if (!patterns.validate.test(name) || skipEmptyValues === true && !element.value) {
                continue;
            }

            let k,
                keys = name.match(patterns.key),
                merge = element.value,
                reverseKey = name;

            while ((k = keys.pop()) !== undefined) {
                reverseKey = reverseKey.replace(new RegExp("\\[" + k + "\\]$"), '');

                if (k.match(patterns.push)) {
                    merge = build([], pushCounter(reverseKey), merge);
                } else if (k.match(patterns.fixed)) {
                    merge = build([], k, merge);
                } else if (k.match(patterns.named)) {
                    merge = build({}, k, merge);
                }
            }

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

        for (const element of this._elements) {
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
     * Sets values of the form elements.
     *
     * @param {{}} data The form data with pairs "element-name: value".
     */
    setData(data) {
        this._doSetData(data, this._elements);
    }

    /**
     * Sets form element value.
     *
     * @param {string} name The form element name.
     * @param {string|number|boolean} value
     */
    setElementValue(name, value) {
        const element = this.getElement(name);

        this._doSetData({ [name]: value }, [element]);
    }

    /**
     * Sets values of the form elements.
     *
     * @param {{}} data The form data with pairs "element-name: value".
     * @param {[]} elements
     */
    _doSetData(data, elements) {
        let value;

        for (let element of elements) {
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
                        const option = element.options[i];

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

    /**
     * Sets options of the "select" element.
     *
     * @param {string} name The name of "select" element.
     * @param {{}} choices The select options data. Object with pairs: "value: label".
     * @param {boolean} [preserveSelected = false] Whether to preserve selected options.
     */
    setSelectOptions(name, choices, preserveSelected) {
        const element = this.getElement(name);

        if (element.type === 'select-one' || element.type === 'select-multiple') {
            const selectedOptions = {};
            const options = element.querySelectorAll('option');

            for (const option of options) {
                if (option.selected == true) {
                    selectedOptions[option.value] = option.textContent;
                }

                element.removeChild(option);
            }

            for (const value in choices) {
                let option = document.createElement('option');
                option.value = value;
                option.textContent = choices[value];

                if (preserveSelected === true && selectedOptions.hasOwnProperty(value)) {
                    option.selected = true;
                }

                element.appendChild(option);
            }
        }
    }
}
