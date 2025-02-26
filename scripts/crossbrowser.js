/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Detects what browser the extension is running on
 * (Currently, all Chromium browsers are listed under Chrome)
 * @returns Browser enum
 */
function detectBrowser() {
    if (typeof browser != "object") browser = chrome;

    if (browser.runtime.getURL('').startsWith('moz-extension://')) {
        return browsers.FIREFOX;
    } else if (browser.runtime.getURL('').startsWith('edge://extension')) {
        return browsers.EDGE;
    } else {
        return browsers.CHROME;
    }
}

/**
 * Get the name of the browser the user is running
 * @returns Browser Name
 */
function getBrowserName() {
    const names = [
        'Firefox',
        'Chrome',
        'Edge',
        'Opera'
    ];

    return names[runningOn];
}

const browsers = {
    FIREFOX: 0,
    CHROME: 1,
    EDGE: 2,
    OPERA: 3
};
const runningOn = detectBrowser();
