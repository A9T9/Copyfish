/* This content script is being loaded by default by manifest.json in firefox only*/

(function () {
    'use strict';
    let onDemandFunc = {
        init: function () {
            browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
                if (sender.tab) {
                    return true;
                }
                if (request.evt === 'captureClipboard') {
                    this.captureClipboard(sendResponse);
                } else if (request.evt === 'copyToClipboard') {
                    this.copyToClipboard(request, sendResponse);
                }
            });
        },
        checkValidImgBase64: function (s) {
            let regex = /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;
            return s.match(regex);
        },
        toDataURL: function (url) {
            return new Promise((resolve, reject) => {
                try {
                    var xhr = new XMLHttpRequest();
                    xhr.onload = function () {
                        var reader = new FileReader();
                        reader.onloadend = function () {
                            resolve(reader.result);
                        }
                        reader.readAsDataURL(xhr.response);
                    };
                    xhr.open('GET', url);
                    xhr.responseType = 'blob';
                    xhr.send();
                }
                catch (err) {
                    return reject(err);
                }
            });
        },
        captureClipboard: function (sendResponse) {
            var self = this;
            var noImage = function () {
                browser.runtime.sendMessage({
                    evt: 'show-warning-message',
                    data: { message: 'No image in clipboard' },
                });
            };
            navigator.clipboard.read().then(function (items) {
                for (var i = 0; i < items.length; i++) {
                    var item = items[i];
                    var imageType = item.types.find(function (t) { return t.startsWith('image/'); });
                    if (imageType) {
                        item.getType(imageType).then(function (blob) {
                            var reader = new FileReader();
                            reader.onloadend = function () {
                                browser.runtime.sendMessage({
                                    evt: 'imageOcrInTab',
                                    ocrText: '',
                                    overlayInfo: '',
                                    data: reader.result,
                                    translatedTextIfAny: '',
                                    currentZoomLevel: 0,
                                });
                            };
                            reader.readAsDataURL(blob);
                        }).catch(noImage);
                        return;
                    }
                }
                noImage();
            }).catch(noImage);
        }, copyToClipboard: function (request, sendResponse) {
            let copyDivElm = document.createElement('div');
            copyDivElm.contentEditable = true;
            copyDivElm.style.opacity = 0;
            copyDivElm.style = "white-space:pre-wrap;"
            document.body.appendChild(copyDivElm);
            copyDivElm.textContent = request && request.data || '';
            copyDivElm.unselectable = 'off';
            copyDivElm.focus();
            document.execCommand('SelectAll');
            document.execCommand('Copy', false, null);
            document.body.removeChild(copyDivElm);
            request.onComplete && request.onComplete();
        }
    }
    onDemandFunc.init();
}());
