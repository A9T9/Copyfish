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
            navigator.clipboard.readText().then(function (text) {
            });
            let imgSrcRegex = /<img[^>]+src="([^">]+)"/g;
            let copyDiv = document.createElement('div');
            copyDiv.style.width = '1px';
            copyDiv.style.height = '1px';
            copyDiv.style.opacity = 0;
            copyDiv.contentEditable = true;
            document.body.appendChild(copyDiv);
            copyDiv.focus();
            document.execCommand("paste");
            let imageContent = copyDiv.innerHTML;
            copyDiv.remove();
            let src = imgSrcRegex.exec(imageContent);
            if (!src || !src[ 1 ]) {
                browser.runtime.sendMessage({
                    evt: 'show-warning-message',
                    data: { message: 'No image in clipboard' },
                });
                return;
            }
            if(src && src[ 1 ] && !this.checkValidImgBase64(src[ 1 ])){
                this.toDataURL(src[ 1 ]).then((res)=>{
                    browser.runtime.sendMessage({
                        evt: 'imageOcrInTab',
                        ocrText: '',
                        overlayInfo: '',
                        data: res,
                        translatedTextIfAny: '',
                        currentZoomLevel: 0,
                    });
                },(err)=>{
                    browser.runtime.sendMessage({
                        evt: 'show-warning-message',
                        data: { message: 'No image in clipboard' },
                    });
                    return;    
                });
                return;
            }
            else if (!this.checkValidImgBase64(src[ 1 ])) {
                browser.runtime.sendMessage({
                    evt: 'show-warning-message',
                    data: { message: 'No image in clipboard' },
                });
                return;
            }
            browser.runtime.sendMessage({
                evt: 'imageOcrInTab',
                ocrText: '',
                overlayInfo: '',
                data: src[ 1 ],
                translatedTextIfAny: '',
                currentZoomLevel: 0,
            });
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
