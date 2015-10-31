'use strict';
var TAB_AVAILABILITY_TIMEOUT = 15;
/*
 * how does the enable/disable icon work?
 * website:document.ready -> 'ready' message to background -> enables icon
 *
 * how does clicking on the extension icon work?
 * browserAction:onclick -> 'enableselection' event to specific tab -> selection enabled in that tab
 */

function enableIcon(tabId) {
    chrome.browserAction.enable(tabId);
    chrome.browserAction.setIcon({
        'path': {
            '19': 'images/icon-19.png',
            '38': 'images/icon-38.png'
        },
        tabId: tabId
    });
}

function disableIcon(tabId) {
    chrome.browserAction.disable(tabId);
    chrome.browserAction.setIcon({
        'path': {
            '19': 'images/icon-19_disabled.png',
            '38': 'images/icon-38_disabled.png'
        },
        tabId: tabId
    });
}

function captureScreen( /*info, callingTab*/ ) {
    chrome.permissions.request({
        permissions: ['desktopCapture'],
    }, function(granted) {
        // The callback argument will be true if the user granted the permissions.
        if (granted) {
            chrome.tabs.create({
                url: chrome.extension.getURL('/screencapture.html')
            }, function(destTab) {
                // delay the action so that the tab is ready. Possible bug with the API
                setTimeout(function() {
                    disableIcon(destTab.id);
                }, 300);
                chrome.desktopCapture.chooseDesktopMedia(['window', 'screen'], function(inStream) {
                    if (!inStream) {
                        window.alert(chrome.i18n.getMessage('captureFailure'));
                    } else if (!navigator.webkitGetUserMedia) {
                        window.alert(chrome.i18n.getMessage('userMediaUnsupported'));
                    } else {
                        navigator.webkitGetUserMedia({
                            audio: !1,
                            video: {
                                mandatory: {
                                    chromeMediaSource: 'desktop',
                                    chromeMediaSourceId: inStream,
                                    maxWidth: 3e3,
                                    maxHeight: 3e3
                                }
                            }
                        }, function(mediaStream) {
                            var videoTrack = mediaStream.getVideoTracks();
                            videoTrack = videoTrack.length > 0 ? videoTrack[0] : null;
                            var v = document.createElement('video');
                            var can = document.createElement('canvas');
                            var dataURL;
                            v.src = URL.createObjectURL(mediaStream);
                            setTimeout(function() {
                                can.width = v.videoWidth;
                                can.height = v.videoHeight;
                                can.getContext('2d').drawImage(v, 0, 0, can.width, can.height);
                                videoTrack.stop();
                                dataURL = can.toDataURL();
                                chrome.tabs.sendMessage(destTab.id, {
                                    evt: 'desktopcapture',
                                    dataURL: dataURL,
                                    width: can.width,
                                    height: can.height
                                }, function() {
                                    // chrome.tabs.sendMessage(destTab.id, {
                                    //     evt: 'enableselection'
                                    // });
                                });
                                can.remove();
                                v.remove();
                            }, 500);
                        }, function() {});
                    }
                });
            });


        } else {
            window.alert(chrome.i18n.getMessage('permWarning'));
        }
    });
}

// supports autotimeout
function isTabAvailable(tabId) {
    function _checkAvailability() {
        var _tabId = tabId;
        var $dfd = $.Deferred();
        chrome.tabs.sendMessage(_tabId, {
            evt: 'isavailable'
        }, function(resp) {
            if ($dfd.state() !== 'rejected' && resp && resp.farewell === 'isavailable:OK') {
                $dfd.resolve();
            }
        });

        setTimeout(function() {
            if ($dfd.state() !== 'resolved') {
                $dfd.reject();
            }
        }, TAB_AVAILABILITY_TIMEOUT);

        return $dfd;
    }

    return _checkAvailability();
}

chrome.contextMenus.create({
    contexts: ['browser_action'],
    title: 'Desktop Text Capture',
    id: 'capture-desktop',
    onclick: captureScreen
});

// disableIcon();
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    var url = changeInfo.url || tab.url || !1;
    if (url && (/^chrome\-extension:\/\//.test(url) || /^chrome:\/\//.test(url) || /^https:\/\/chrome\.google\.com\/webstore\//.test(url))) {
        disableIcon(tabId);
    }
});

chrome.storage.sync.get({
    visualCopyOCRLang: '',
    visualCopyTranslateLang: '',
    // visualCopyAutoProcess: '',
    visualCopyAutoTranslate: '',
    visualCopyOCRFontSize: '',
    visualCopySupportDicts:''
}, function(items) {
    if (!items.visualCopyOCRLang) {
        chrome.storage.sync.set({
            visualCopyOCRLang: 'eng',
            visualCopyTranslateLang: 'en',
            // visualCopyAutoProcess: true,
            visualCopyAutoTranslate: true,
            visualCopyOCRFontSize: '16px',
            visualCopySupportDicts: false
        }, function() {

        });
    }
});

chrome.browserAction.onClicked.addListener(function(tab) {
    disableIcon(tab.id);
    isTabAvailable(tab.id)
        .done(function() {
            chrome.tabs.sendMessage(tab.id, {
                evt: 'enableselection'
            });
        })
        .fail(function() {
            window.alert(chrome.i18n.getMessage('captureError'));
            enableIcon(tab.id);
        });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    var tab = sender.tab;
    var copyDiv;
    if (!tab) {
        return false;
    }
    if (request.evt === 'ready') {
        enableIcon(tab.id);
        sendResponse({
            farewell: 'ready:OK'
        });
        return true;
    } else if (request.evt === 'capture-screen') {
        chrome.tabs.captureVisibleTab(function(dataURL) {
            chrome.tabs.getZoom(tab.id, function(zf) {
                sendResponse({
                    dataURL: dataURL,
                    zf: zf
                });
            });
        });
        return true;
    } else if (request.evt === 'capture-done') {
        enableIcon(tab.id);
        sendResponse({
            farewell: 'capture-done:OK'
        });
    } else if (request.evt === 'copy') {
        copyDiv = document.createElement('div');
        copyDiv.contentEditable = true;
        document.body.appendChild(copyDiv);
        copyDiv.innerText = request.text;
        copyDiv.unselectable = 'off';
        copyDiv.focus();
        document.execCommand('SelectAll');
        document.execCommand('Copy', false, null);
        document.body.removeChild(copyDiv);
        sendResponse({
            farewell: 'copy:OK'
        });
    } else if (request.evt === 'open-settings') {
        chrome.tabs.create({
            'url': chrome.extension.getURL('options.html')
        });
        sendResponse({
            farewell: 'open-settings:OK'
        });
    }
});