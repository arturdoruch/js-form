/*!
 * (c) Artur Doruch <arturdoruch@interia.pl>
 */

/**
 * Required package dependencies
 * =============================
 *
 *  - "jquery"
 *  - "jquery-ui"
 *
 * Usage
 * =====
 *
 * In your main JavaScript file:
 * Import jQuery and jQuery UI datepicker modules:
 *
 *     import $ from 'jquery';
 *     import 'jquery-ui/ui/widgets/datepicker';
 *
 * Import CSS styles
 *     import 'jquery-ui/themes/base/theme.css';
 *     import 'jquery-ui/themes/base/datepicker.css';
 *
 * In order to set date picker region, import module with required localization
 *     import 'jquery-ui/ui/i18n/datepicker-{region}';
 *
 * and make the following setup:
 *     $.datepicker.setDefaults($.datepicker.regional['{region}']);
 *
 * @todo Optimize method logic.
 */

export default {
    register,
    registerDateRange,
}

/**
 * @param {Node} dateElement The form input element.
 * @param {string} [format = "dd.mm.yy"] Format of displayed date.
 *                                       See https://api.jqueryui.com/datepicker/#option-dateFormat for the available options.
 * @param {{}} options
 */
function register(dateElement, format = 'dd.mm.yy', options = {}) {
    const $date = $(dateElement);
    format = prepareFormat(format);

    $date.datepicker($.extend({
        dateFormat: format,
        onSelect(date) {
            try {
                date = $.datepicker.parseDate(format, date);
            } catch (error) {
                markInputInvalid($date, true);
            }
        },
        onClose() {
            validateDate($date, format);
        }
    }, options));
}

/**
 * @param {Node} dateFromElement The form input element with start date.
 * @param {Node} dateToElement The form input element with end date.
 * @param {string} [format = "dd.mm.yy"] Format of displayed date.
 *                                       See https://api.jqueryui.com/datepicker/#option-dateFormat for the available options.
 */
function registerDateRange(dateFromElement, dateToElement, format = 'dd.mm.yy') {
    const $dateFrom = $(dateFromElement);
    const $dateTo = $(dateToElement);
    format = prepareFormat(format);

    $dateFrom.datepicker({
        dateFormat: format,
        maxDate: new Date(),
        onSelect(date) {
            try {
                date = $.datepicker.parseDate(format, date);
            } catch (error) {
                markInputInvalid($dateFrom, true);
            }

            // Set minimum selectable date for "dateTo" input field.
            $dateTo.datepicker('option', 'minDate', modifyDay(date, 1));
        },
        onClose() {
            validateDate($dateFrom, format);
        }
    });

    $dateTo.datepicker({
        dateFormat: format,
        minDate: modifyDay(new Date(), 1),
        onSelect(date) {
            try {
                date = $.datepicker.parseDate(format, date);
            } catch (error) {
                markInputInvalid($dateTo, true);
            }

            // Set maximum selectable date for "dateFrom" input field.
            $dateFrom.datepicker('option', 'maxDate', modifyDay(date, -1));
        },
        onClose() {
            validateDate($dateTo, format);
        }
    });
}

/**
 * Convert PHP date format into JavaScript format.
 *
 * @param {string} format
 * @return {string}
 */
function prepareFormat(format) {
    const _format = format
        .replace(/Y/g, 'y')
        .replace(/yyyy/, 'yy')
        .replace(/F/, 'MM')
        .replace(/n/, 'm');

    if (!/^(?=^[dmMy].+[dmMy]$)[dmMy,\-\.\/\\ ]{5,}$/.test(_format)) {
        throw new TypeError(`Invalid date format "${format}".`);
    }

    return _format;
}

/**
 * @param {Date} date
 * @param {int} days
 */
function modifyDay(date, days) {
    date.setDate(date.getDate() + days);

    return date;
}


function validateDate($date, format) {
    const date = $date.val();
    let invalid = false;

    if (date) {
        try {
            $.datepicker.parseDate(format, date);
        } catch (error) {
            invalid = true;
            // todo Add error message.
        }
    }

    markInputInvalid($date, invalid);
}

/**
 * @param {jQuery} $date
 * @param {boolean} state
 */
function markInputInvalid($date, state) {
    $date.closest('div.form-group').toggleClass('has-error', state);
}
