'use strict';
// var IS_PRESSED = {};
/*chrome.runtime.onInstalled.addListener(function(details) {
	console.log('previousVersion', details.previousVersion);
});*/

chrome.storage.sync.get({
	visualCopyOCRLang: '',
	visualCopyTranslateLang: '',
	visualCopyAutoProcess: '',
	visualCopyAutoTranslate: ''
}, function(items) {
	if (!items.visualCopyOCRLang) {
		chrome.storage.sync.set({
			visualCopyOCRLang: 'eng',
			visualCopyTranslateLang: 'en',
			visualCopyAutoProcess: true,
			visualCopyAutoTranslate: true
		}, function() {

		});
	}
});

chrome.browserAction.onClicked.addListener(function(tab) {
	chrome.browserAction.disable(tab.id);
	chrome.browserAction.setIcon({
		'path': {
			'19': 'images/icon-19_disabled.png',
			'38': 'images/icon-38_disabled.png'
		},
		tabId: tab.id
	});
	chrome.tabs.sendMessage(tab.id, {
		evt: 'enableselection'
	}, function( /*response*/ ) {
		// console.log(response.farewell);

	});
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	var tab = sender.tab;
	var copyDiv;
	if (!tab) {
		return false;
	}
	if (request.evt === 'capture-screen') {
		chrome.tabs.captureVisibleTab(function(dataURL) {
			chrome.tabs.getZoom(tab.id, function(zf) {
				sendResponse({
					dataURL: dataURL,
					zf: zf
				});
			});
		});
		return true;
	}
	if (request.evt === 'capture-done') {
		// IS_PRESSED[tab.id] = false;
		/*sendResponse({
			dataURL: dataURL
		});*/
		chrome.browserAction.enable(tab.id);
		chrome.browserAction.setIcon({
			'path': {
				'19': 'images/icon-19.png',
				'38': 'images/icon-38.png'
			},
			tabId: tab.id
		});
	}
	if (request.evt === 'copy') {
		copyDiv = document.createElement('div');
		copyDiv.contentEditable = true;
		document.body.appendChild(copyDiv);
		copyDiv.innerHTML = request.text;
		copyDiv.unselectable = 'off';
		copyDiv.focus();
		document.execCommand('SelectAll');
		document.execCommand('Copy', false, null);
		document.body.removeChild(copyDiv);
	}

	if (request.evt === 'open-settings') {
		chrome.tabs.create({
			'url': chrome.extension.getURL('options.html')
		});
	}

	sendResponse({
		farewell:'OK'
	});

});