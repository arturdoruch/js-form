/*
 * (c) Artur Doruch <arturdoruch@interia.pl>
 */

import $ from 'jquery';
import eventRegistry from '@arturdoruch/event-registry';
import HttpRequest from './HttpRequest.js';

const formElementNames = [
    'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'
];

/**
 * HTML form manager.
 */
export default class Form {
    /**
     * @param {HTMLFormElement|jQuery|string} form The form HTMLFormElement or jQuery object, or CSS selector.
     */
    constructor(form) {
        this._selector = form;
        this._setForm();

        this._eventData = [];
        this._submitData = [];
        this._elementNamePrefix = null;
    }

    /**
     * Queries form from the DOM document. Re-registers event listener to the form element.
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
     *
     * @private
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
     * Sets to use form name as element name prefix, while getting or setting values of the form elements.
     *
     * @return {Form}
     */
    useNameAsElementNamePrefix() {
        this._elementNamePrefix = this.getName();

        return this;
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
     * Gets form elements with name or CSS selector.
     *
     * @param {string} name The form element name or CSS selector.
     *
     * @return {Node[]|NodeList}
     */
    getElements(name) {
        if (this.hasElement(name)) {
            const element = this.getElement(name);

            if (element instanceof NodeList) {
                return element;
            }

            return [element];
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
     * @throws TypeError when form not contain an element with specified name.
     */
    getElement(name) {
        const element = this._elements.namedItem(this._prepareElementName(name));

        if (!element) {
            throw new TypeError(`The form does not contain an element with name "${name}".`);
        }

        return element;
    }

    /**
     * @param {string} name The form element name.
     *
     * @return {boolean}
     */
    hasElement(name) {
        return this._elements.namedItem(this._prepareElementName(name)) !== null;
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
     * @param {function} listener Arguments passed to the listener:
     *                             - {Node} element The form element that triggered this event.
     *                             - {HTMLFormControlsCollection} elements The form elements.
     * @param {{}}      [options]
     * @param {[]}      [options.arguments] The listener arguments.
     * @param {{}}      [options.context = window] The listener context.
     * @param {boolean} [options.preventDefault = true] Whether to block element default event
     *                                                  (e.g. stop button from sending the form).
     *
     * @return Form
     */
    addElementListener(event, name, listener, options = {}) {
        const elements = this.getElements(name);

        if (elements) {
            let self = this;

            if (typeof listener !== 'function') {
                throw new TypeError(`Invalid listener for element with name "${name}". Expected function, but got "${typeof listener}".`);
            }

            eventRegistry.on(event, elements, function (e) {
                listener.apply(options.context || self, [e.target, self._elements, ...(options.arguments || [])]);
            }, [], null, options.preventDefault);

            this._eventData.push({ event, name, listener, options });
        }

        return this;
    }

    /**
     * Adds a listener to the form submit event.
     * The listener is called when `button[type="submit"]` is clicked or pressed "enter" key
     * while input element is selected.
     *
     * @param {function} listener Arguments passed to the listener:
     *                             - {HTMLButtonElement} submitter The clicked button.
     * @param {{}}      [options]
     * @param {[]}      [options.arguments] The listener arguments.
     * @param {{}}      [options.context = window] The listener context.
     * @param {boolean} [options.preventDefault = true]
     *
     * @return Form
     */
    addSubmitListener(listener, options = {}) {
        let self = this;

        eventRegistry.on('submit', this._form, function (e) {
            listener.apply(options.context || self, [e.originalEvent.submitter, ...(options.arguments || [])]);
        }, [], null, options.preventDefault);

        this._submitData.push({ listener, options });

        return this;
    }

    /**
     * Calls specified function for the all of form elements.
     *
     * @param {function} fn The function to call with all of form elements.
     *                          Argument passed to the function: {Node|NodeList} element The form element.
     * @param {object} [fnContext = null]
     */
    callElementsFunction(fn, fnContext = null) {
        for (const element of this._elements) {
            fn.call(fnContext, element, this._elements);
        }
    }

    /**
     * Creates HTTP request with form properties.
     *
     * @param {boolean} [skipEmptyValue = false] Whether to not include elements with empty value.
     * @param {{}} [extraData] Extra (serialized) data to add, to the GET request query and POST request parameters.
     *
     * @return {HttpRequest}
     */
    createHttpRequest(skipEmptyValue, extraData = {}) {
        const data = $.extend(this.getData(skipEmptyValue), extraData);

        return new HttpRequest(this.getMethod(), this.getAction(), data);
    }

    /**
     * Gets form element values.
     *
     * @param {boolean} [skipEmptyValues = false] Whether to not include elements with empty value.
     * @param {boolean} [serialized = true] Whether to get serialized data.
     *
     * @return {{}} An object with {"element-name": "value"} pairs or object with serialized data.
     */
    getData(skipEmptyValues = false, serialized = true) {
        const elementValues = this._getElementValues(skipEmptyValues);

        if (serialized !== true) {
            return elementValues;
        }

        let data = {};
        const buildObject = function (object, key, value) {
            object[key] = value;

            return object;
        };

        for (const name in elementValues) {
            let value = elementValues[name];
            const names = name.match(/[^\[\]]+/g);
            let _name;

            while ((_name = names.pop()) !== undefined) {
                if (_name.match(/^\d+$/)) {
                    value = buildObject([], _name, value);
                } else if (_name.match(/^.+$/)) {
                    value = buildObject({}, _name, value);
                }
            }

            data = $.extend(true, data, value);
        }

        return data;
    }

    /**
     * Sets values of the form elements.
     *
     * @param {{}} data The form data. An object with {"element-name": "value"} pairs or object with serialized form data.
     * @param {boolean} [serialized = true] Whether to passed data is a serialized form data.
     */
    setData(data, serialized = true) {
        if (serialized === true) {
            if (this._elementNamePrefix && !data.hasOwnProperty(this._elementNamePrefix)) {
                data = {[this._elementNamePrefix]: data};
            }
        } else {
            for (let name in data) {
                name = this._prepareElementName(name);
            }
        }

        if (serialized === true) {
            // Deserialize form data.
            const queryParameters = $.param(data).split('&');
            data = {};

            for (const parameter of queryParameters) {
                const parts = parameter.split('=');
                const name = decodeURIComponent(parts[0]);
                const value = decodeURIComponent(parts[1]);

                if (/\[\]$/.test(name)) {
                    if (!data.hasOwnProperty(name)) {
                        data[name] = [];
                    }

                    data[name].push(value);
                } else {
                    data[name] = value;
                }
            }
        }

        this._setElementValues(this._elements, data);
    }

    /**
     * Sets values of the form elements to empty.
     *
     * @param {[]} [preserveElements] The list of element names, which should not be reset.
     * @param {boolean} [resetHidden = true] Whether to reset input elements with type of "hidden".
     */
    resetData(preserveElements = [], resetHidden) {
        preserveElements = preserveElements.map(this._prepareElementName.bind(this));

        for (const element of this._elements) {
            const type = element.type;

            if (preserveElements.indexOf(element.name) !== -1 || (type === 'hidden' && resetHidden === false)) {
                continue;
            }

            if (element.nodeName === 'SELECT') {
                for (const option of element.options) {
                    option.selected = false;
                }
            } else if (element.nodeName !== 'BUTTON') {
                if (type === 'radio' || type === 'checkbox') {
                    element.checked = false;
                } else {
                    element.value = '';
                }
            }
        }
    }

    /**
     * Sets form element value.
     *
     * @param {string} name The form element name.
     * @param {string|number|boolean} value
     */
    setElementValue(name, value) {
        const element = this.getElement(name);
        this._setElementValues([element], {[element.name]: value});
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
                const option = document.createElement('option');
                option.value = value;
                option.textContent = choices[value];

                if (preserveSelected === true && selectedOptions.hasOwnProperty(value)) {
                    option.selected = true;
                }

                element.appendChild(option);
            }
        }
    }

    /**
     * Gets form elements values.
     *
     * @param {boolean} [skipEmptyValues = false]
     *
     * @return {{}} An object with {"element-name": "value"} pairs.
     */
    _getElementValues(skipEmptyValues) {
        const data = {};

        for (const element of this._elements) {
            let value = element.value;
            const name = element.name;
            const type = element.type;

            if (!name || element.nodeName === 'BUTTON' || element.disabled) {
                continue;
            }

            if (type === 'select-multiple') {
                value = [];

                for (const option of element.selectedOptions) {
                    value.push(option.value);
                }
            } else if (type === 'checkbox') {
                if (data.hasOwnProperty(name)) {
                    continue;
                }

                let elementList = this.getElement(name);

                if (elementList instanceof RadioNodeList) {
                    value = [];

                    for (const elem of elementList) {
                        if (elem.checked) {
                            value.push(elem.value);
                        }
                    }
                } else if (/\[\]$/.test(name)) {
                    value = element.checked ? [value]: [];
                } else if (!element.checked) {
                    //value = '';
                    continue;
                }
            } else if (type === 'radio') {
                if (data.hasOwnProperty(name)) {
                    continue;
                }

                let elementList = this.getElement(name);

                if (elementList instanceof RadioNodeList) {
                    value = '';

                    for (const elem of elementList) {
                        if (elem.checked) {
                            value = elem.value;

                            break;
                        }
                    }
                }
            }

            if (skipEmptyValues === true && (!value || !value.length)) {
                continue;
            }

            data[name] = value;
        }

        return data;
    }

    /**
     * Sets form elements. Depend on element type: sets values, checks radio or checkbox element,
     * or selects the select options.
     *
     * @param {[]} elements
     * @param {{}} data The form data with { "element-name": "value" } pairs.
     */
    _setElementValues(elements, data) {
        let value;

        for (let element of elements) {
            if ((value = data[element.name]) === undefined) {
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
                                option.selected = true;
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
     * @param {string} name
     * @return {string}
     * @private
     */
    _prepareElementName(name) {
        if (this._elementNamePrefix && /^\[.+\]$/.test(name)) {
            return this._elementNamePrefix + name;
        }

        return name;
    }
}