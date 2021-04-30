'use strict';
var TAB_AVAILABILITY_TIMEOUT = 150;
let planCheckTime = 864 * 1000 * 100; //one day
const isFirefox = typeof InstallTrigger !== 'undefined';
const isFirefoxBrowser = chrome.runtime.getURL('').startsWith('moz-extension://');
const isChromeBrowser = chrome.runtime.getURL('').startsWith('chrome-extension://');
let intialTab = 0;
var appConfigSettings = {};
window.browser = (function () {
	return window.msBrowser ||
		window.browser ||
		window.chrome;
})();
$.ajaxSetup({ cache: false });
/*
 * how does the enable/disable icon work?
 * Ans: website:document.ready -> 'ready' message to background -> enables icon
 *
 * how does clicking on the extension icon work?
 * Ans: browserAction:onclick -> 'enableselection' event to specific tab -> selection enabled in that tab
 */
var activeOnTab = {};
var isUpdated = false;
const screenshotDelay = 3000;
setInterval(checkPlanEveryDay, planCheckTime);
let nextInvocationId = 0;
let port = null;
let portResolveList = {};
let fileaccessPort = null;
let params;
let totalSize;
let optionsTabId;
let imageURI = '';
let imagepath;
let errorConnect = false;
let fileaccessConnectError = false;

const setBadge = function (textLabel, tabId) {
	window.browser.browserAction.setBadgeText({ text: textLabel, tabId: tabId });
	if (textLabel) {
		window.browser.browserAction.setBadgeBackgroundColor({ color: "#0366d6" });
		window.browser.browserAction.setBadgeTextColor && window.browser.browserAction.setBadgeTextColor({ color: "white" }); // Probably not supported in chrome
	}
}


const getFileAccessVersion = () => {
	invokeAsync('get_version').
		then(result => browser.runtime.sendMessage({ evt: 'fileaccess_module_version', version: result }));
}
const testFileAccess = () => {
	var file;
	invokeAsync('get_special_folder_path', 'UserProfile').
		then(folder => {
			file = folder + (folder[ 0 ] === '/' ? '/' : '\\') + 'a9t9fileaccesstest';
			return invokeAsync('write_all_text', { path: file, content: '' });
		}).
		then(writeOk => {
			if (writeOk)
				return invokeAsync('delete_file', { path: file });
			return Promise.reject('can not create file');
		}).
		then(deleteOk => {
			if (deleteOk)
				browser.runtime.sendMessage({ evt: 'fileaccess_module_test', result: true });
			else
				return Promise.reject('can not delete file');
		}).
		catch(() => browser.runtime.sendMessage({ evt: 'fileaccess_module_test', result: false }));
}
const onMessageReceiveFromDesktopCapture = (message) => {
	if (!message.result) {
		return;
	}
};
const connectAsync = () => {
	errorConnect = false;
	port = browser.runtime.connectNative("com.a9t9.kantu.file_access");
	try {
		let imageCapturePort = browser.runtime.connectNative(NMHOST);
		imageCapturePort.onMessage.addListener(onMessageReceiveFromDesktopCapture);
		imageCapturePort.onDisconnect.addListener(function () {
			fileaccessConnectError = true;
		});
	}
	catch (e) {
		fileaccessConnectError = true;
	}
	port.onMessage.addListener(function (msg) {
		var id = msg.id;
		if (portResolveList[ id ]) {
			portResolveList[ id ](msg.result);
			delete portResolveList[ id ];
		}
		if (typeof msg.result === "object") {
			imageURI = btoa(atob(imageURI) + atob(msg.result.buffer))
			if (msg.result.rangeEnd >= totalSize || msg.result.rangeEnd <= msg.result.rangeStart) {
				msg.result.buffer = imageURI;
				browser.tabs.sendMessage(optionsTabId, {
					evt: 'desktopcaptureData',
					result: msg.result
				});
				invokeAsync("delete_file", { path: imagepath });
			} else {
				params = {
					path: imagepath,
					rangeStart: msg.result.rangeEnd
				}
				invokeAsync("read_file_range", params);
			}
		} else if (typeof msg.result === "number") {
			//
			totalSize = msg.result;
			invokeAsync("read_file_range", params);
		}
	});
	port.onDisconnect.addListener(function () {
		errorConnect = true;
		//
	});
}
function isLetter(str) {
	try {
		return str.match(/[a-z]/i);
	} catch (e) {
		return false
	}
}
const invokeAsync = (method, params) => {
	try {
		const id = nextInvocationId++;
		const requestObject = {
			id: id,
			method: method,
			params: params
		};
		return new Promise(resolve => {
			portResolveList[ id ] = resolve;
			port.postMessage(requestObject);
		});
	}
	catch (err) {
		console.log('error occured', err);
		return Promise.reject(err);
	}
};
connectAsync();
function updateIcons() {
	for (var tabId in activeOnTab) {
		if (activeOnTab.hasOwnProperty(tabId)) {
			// if (activeOnTab[tabId]) {
			// 	disableIcon(+tabId);
			// } else {
			enableIcon(+tabId);
			//}
		}
	}
	browser.tabs.query({}, function (tabs) {
		for (var i = 0; i < tabs.length; i++) {
			var tab = tabs[ i ];
			//if (/^chrome:/.test(tab.url)) {
			//	disableIcon(tab.id);
			// else {
			enableIcon(tab.id);
			//	}
		}
	});
}

function onInstallActiveTab() {
	browser.tabs.query({}, function (tabs) {
		for (var i = 0; i < tabs.length; i++) {
			var tab = tabs[ i ];
			if (tab && tab.active && tab.id) {
				intialTab = tab.id;
			}
		}
	});
}


function enableIcon(tabId) {
	activeOnTab[ tabId ] = true;
	browser.browserAction.enable(tabId);
	// if (isUpdated) {
	// 	browser.browserAction.setIcon({
	// 		'path': {	// new text icon
	// 				"16": "images/copyfish-16.png",
	// 				"32": "images/copyfish-32.png",
	// 				"48": "images/copyfish-48.png",
	// 				"128": "images/copyfish-128.png"
	// 		},
	// 		tabId: tabId
	// 	});
	// 	setBadge('New',tabId);
	// } 
	// else {
	// 	browser.browserAction.setIcon({
	// 		'path': {
	// 				"16": "images/copyfish-16.png",
	// 				"32": "images/copyfish-32.png",
	// 				"48": "images/copyfish-48.png",
	// 				"128": "images/copyfish-128.png"
	// 		},
	// 		tabId: tabId
	// 	});
	// 	setBadge('',tabId);
	// }
}
function disableIcon(tabId) {
	activeOnTab[ tabId ] = false;
	browser.browserAction.disable(tabId);
	browser.browserAction.setIcon({
		'path': {	// disabled icon here need to add text
			"16": "images/copyfish-16.png",
			"32": "images/copyfish-32.png",
			"48": "images/copyfish-48.png",
			"128": "images/copyfish-128.png"
		},
		tabId: tabId
	});
}
function checkPlanEveryDay() {
	browser.storage.sync.get([ 'lastPlanCheck', "key" ], function (result) {
		const currentDate = new Date().getTime();
		let planCheck = result.lastPlanCheck;
		if (result.key) {
			let check_key_interval;
			//clearTimeout(check_key_interval);
			//check_key_interval = setTimeout(checkPlanEveryDay, 60 * 1000 * 60);
			// if (!planCheck) {
			// 	browser.storage.sync.set({ "lastPlanCheck": currentDate });
			// } else {
			// 	browser.storage.sync.set({ "lastPlanCheck": currentDate });
			// 	checkKey(result.key);
			// }
			browser.storage.sync.set({ "lastPlanCheck": currentDate });
			checkKey(result.key);
		}
	});
}
checkPlanEveryDay()
function reloadOptionsPage() {
	browser.runtime.sendMessage({ message: "reloadPage" });
}
const multipleKeySchemaCheckKey =
{
	validKeyFound: false,
	urlSchema: [
		{
			url: 'https://license1.ocr.space/api/status?licensekey=',
			legacy: false
		},
		{
			url: 'https://ui.vision/xcopyfish/',
			legacy: true
		}
	]
};
function checkKey(keyData, singleEntity = multipleKeySchemaCheckKey.urlSchema[ 0 ], iteration = 0) {
	try {
		checkLicenseKey(keyData, singleEntity.url, singleEntity.legacy).done(function (result) {
			iteration++;
		}).fail(function (err) {
			iteration++;
			// if error found and we have any entity left to verify then check..
			if (iteration < multipleKeySchemaCheckKey.urlSchema.length) {
				// clear old message and make space for other messages ...
				checkKey(keyData, multipleKeySchemaCheckKey.urlSchema[ iteration ], iteration);
			}
		});
	} catch (err) {

	}
}

function checkLicenseKey(keyData, urlApi = 'https://ui.vision/xcopyfish/', legacy = true) {
	let $dfd = $.Deferred();
	let key = keyData;
	let keyChar = key.substr(1, 9);
	if (key.length === 20) {
		if (key.charAt(1) === 'p') {
			// Old url -> https://a9t9.com/xcopyfish/
			// replaced with https://ui.vision/xcopyfish/
			$.get(legacy ? urlApi + keyChar + ".json" : urlApi + key.toUpperCase(), function (data, status, xhr) {
				if (xhr.status === 200) {
					if (legacy) {
						if (data.google_ocr_api_key === 'freeplan') {
							//key is invalid
							browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
							browser.storage.sync.remove("key");
							reloadOptionsPage()
							browser.runtime.openOptionsPage()
							browser.notifications.create({
								type: 'basic',
								iconUrl: 'images/copyfish-48.png',
								title: "It seems your PRO/PRO+ subscription is expire",
								message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space`,
								silent: true
							});
						} else {
							browser.storage.sync.set({ visualCopyAutoTranslate: false });
							browser.storage.sync.set({
								status: 'PRO',
								google_ocr_api_url: data.google_ocr_api_url,
								google_ocr_api_key: data.google_ocr_api_key,
								deepl_api_url: data.deepl_api_url || '',
								deepl_api_key: data.deepl_api_key || '',
							});
						}
						$dfd.resolve(data);
					} else {
						if (data && data.status && data.status == 'on') {
							browser.storage.sync.set({
								status: 'PRO',
								google_ocr_api_url: data.data1a,
								google_ocr_api_key: data.data1b,
								deepl_api_url: '',
								deepl_api_key: '',
							});
							$dfd.resolve(data);
						} else if (data && data.status && data.status == 'off') {
							browser.storage.sync.set({ status: "Subscription expired", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
							browser.storage.sync.remove("key");
							reloadOptionsPage()
							browser.runtime.openOptionsPage()
							browser.notifications.create({
								type: 'basic',
								iconUrl: 'images/copyfish-48.png',
								title: "It seems your PRO/PRO+ subscription is expire",
								message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space.com`
							});
							$dfd.resolve(data); // don't ask parent to call the old api..
						} else {
							$dfd.reject(data);
						}
					}
				}
			}).fail(function () {
				if (res && res.status && res.status == 404 && legacy) { // if legacy api and key not found then reset to free
					browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
					browser.storage.sync.remove("key");
					reloadOptionsPage()
					browser.runtime.openOptionsPage()
					browser.notifications.create({
						type: 'basic',
						iconUrl: 'images/copyfish-48.png',
						title: "It seems your PRO/PRO+ subscription is expire",
						message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space.com`
					});
				}
				// a http request failed occur. Wait for next round of check
				$dfd.reject('Invalid key');
			});
		} else if (key.charAt(1) === 't') {
			$.get(legacy ? urlApi + keyChar + ".json" : urlApi + key.toUpperCase(), function (data, status, xhr) {
				if (xhr.status === 200) {
					if (legacy) {
						if (data.google_ocr_api_key === 'freeplan') {
							//key is invalid
							browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
							browser.storage.sync.remove("key");
							reloadOptionsPage()
							browser.runtime.openOptionsPage()
							browser.notifications.create({
								type: 'basic',
								iconUrl: 'images/copyfish-48.png',
								title: "It seems your PRO/PRO+ subscription is expire",
								message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space.com`
							});
						} else {
							browser.storage.sync.set({ key: key }); // set key if cleared in last failed attempt
							browser.storage.sync.set(
								{
									status: 'PRO+',
									google_ocr_api_url: data.google_ocr_api_url,
									google_ocr_api_key: data.google_ocr_api_key,
									google_trs_api_url: data.google_trs_api_url || data.google_translation_api_url || appConfigSettings.google_translation_api_url || '',
									google_trs_api_key: data.google_trs_api_key,
									deepl_api_url: data.deepl_api_url || data.deepapi_translation_api_url || appConfigSettings.deepapi_translation_api_url || '',
									deepl_api_key: data.deepl_api_key || '',
								});
						}

					} else {
						if (data && data.status && data.status == 'on') {
							browser.storage.sync.set({ key: key }); // set key if cleared in last failed attempt
							browser.storage.sync.set(
								{
									status: 'PRO+',
									google_ocr_api_url: data.data1a,
									google_ocr_api_key: data.data1b,
									google_trs_api_url: appConfigSettings.google_translation_api_url || '',
									google_trs_api_key: data.data2a,
									deepl_api_url: appConfigSettings.deepapi_translation_api_url || '',
									deepl_api_key: data.data2b || '',
								});
							$dfd.resolve(data);
						} else if (data && data.status && data.status == 'off') {
							browser.storage.sync.set({ status: "Subscription expired", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
							browser.storage.sync.remove("key");
							reloadOptionsPage()
							browser.runtime.openOptionsPage()
							browser.notifications.create({
								type: 'basic',
								iconUrl: 'images/copyfish-48.png',
								title: "It seems your PRO/PRO+ subscription is expire",
								message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space.com`
							});
							$dfd.resolve(data); // don't ask parent to call the old api..
						} else {
							$dfd.reject(data);
						}
					}

				}
			}).fail(function (res) {
				if (res && res.status && res.status == 404 && legacy) { // if this is legacy method and key not found (404) in that case reset to free plan
					browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
					browser.storage.sync.remove("key");
					reloadOptionsPage()
					browser.runtime.openOptionsPage()
					browser.notifications.create({
						type: 'basic',
						iconUrl: 'images/copyfish-48.png',
						title: "It seems your PRO/PRO+ subscription is expire",
						message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space`
					});
				}
				// a http request failed occur. Wait for next round of check
				// let the caller know so that key can be checked by another server..
				$dfd.reject('Invalid key');
			});
		} else {
			//if key is invalid
			browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
			browser.storage.sync.remove("key");
			reloadOptionsPage()
			browser.runtime.openOptionsPage()
			browser.notifications.create({
				type: 'basic',
				iconUrl: 'images/copyfish-48.png',
				title: "It seems your PRO/PRO+ subscription is expire",
				message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space`
			});
			$dfd.reject('Invalid key');
		}
	} else {
		//if key is invalid
		browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
		browser.storage.sync.remove("key");
		reloadOptionsPage()
		browser.runtime.openOptionsPage()
		browser.notifications.create({
			type: 'basic',
			iconUrl: 'images/copyfish-48.png',
			title: "It seems your PRO/PRO+ subscription is expire",
			message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space`
		});
		$dfd.reject('Invalid key');
	}
	return $dfd;
}

function checkKeyBack(keyData) {
	let key = keyData;
	let keyChar = key.substr(1, 9);
	if (key.length === 20) {
		if (key.charAt(1) === 'p') {
			// Old url -> https://a9t9.com/xcopyfish/
			// replaced with https://ui.vision/xcopyfish/
			$.get("https://ui.vision/xcopyfish/" + keyChar + ".json", function (data, status, xhr) {
				if (xhr.status === 200) {
					$.get("https://ui.vision/xcopyfish/" + keyChar + ".json", function (data, status, xhr) {
						if (data.google_ocr_api_key === 'freeplan') {
							//key is invalid
							browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
							browser.storage.sync.remove("key");
							reloadOptionsPage()
							browser.runtime.openOptionsPage()
							browser.notifications.create({
								type: 'basic',
								iconUrl: 'images/copyfish-48.png',
								title: "It seems your PRO/PRO+ subscription is expire",
								message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space`,
								silent: true
							});
						} else {
							browser.storage.sync.set({
								status: 'PRO',
								google_ocr_api_url: data.google_ocr_api_url,
								google_ocr_api_key: data.google_ocr_api_key,
								deepl_api_url: data.deepl_api_url || '',
								deepl_api_key: data.deepl_api_key || '',
							});
						}
					});
				}
			}).fail(function () {
				//if key is invalid
				browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
				browser.storage.sync.remove("key");
				reloadOptionsPage()
				browser.runtime.openOptionsPage()
				browser.notifications.create({
					type: 'basic',
					iconUrl: 'images/copyfish-48.png',
					title: "It seems your PRO/PRO+ subscription is expire",
					message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space.com`
				});
			});
		} else if (key.charAt(1) === 't') {
			$.get("https://ui.vision/xcopyfish/" + keyChar + ".json", function (data, status, xhr) {
				if (xhr.status === 200) {
					$.get("https://ui.vision/xcopyfish/" + keyChar + ".json", function (data, status, xhr) {
						if (data.google_ocr_api_key === 'freeplan') {
							//key is invalid
							browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
							browser.storage.sync.remove("key");
							reloadOptionsPage()
							browser.runtime.openOptionsPage()
							browser.notifications.create({
								type: 'basic',
								iconUrl: 'images/copyfish-48.png',
								title: "It seems your PRO/PRO+ subscription is expire",
								message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space.com`
							});
						} else {
							browser.storage.sync.set(
								{
									status: 'PRO+',
									google_ocr_api_url: data.google_ocr_api_url,
									google_ocr_api_key: data.google_ocr_api_key,
									google_trs_api_url: data.google_trs_api_url,
									google_trs_api_key: data.google_trs_api_key,
									deepl_api_url: data.deepl_api_url || '',
									deepl_api_key: data.deepl_api_key || '',
								});
						}
					});
				}
			}).fail(function () {
				//if key is invalid
				browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
				browser.storage.sync.remove("key");
				reloadOptionsPage()
				browser.runtime.openOptionsPage()
				browser.notifications.create({
					type: 'basic',
					iconUrl: 'images/copyfish-48.png',
					title: "It seems your PRO/PRO+ subscription is expire",
					message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space`
				});
			});
		} else {
			//if key is invalid
			browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
			browser.storage.sync.remove("key");
			reloadOptionsPage()
			browser.runtime.openOptionsPage()
			browser.notifications.create({
				type: 'basic',
				iconUrl: 'images/copyfish-48.png',
				title: "It seems your PRO/PRO+ subscription is expire",
				message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space`
			});
		}
	} else {
		//if key is invalid
		browser.storage.sync.set({ status: "Free Plan", ocrEngine: "OcrSpace", transitionEngine: false, visualCopyAutoTranslate: false, visualCopyOCRLang: "eng" });
		browser.storage.sync.remove("key");
		reloadOptionsPage()
		browser.runtime.openOptionsPage()
		browser.notifications.create({
			type: 'basic',
			iconUrl: 'images/copyfish-48.png',
			title: "It seems your PRO/PRO+ subscription is expire",
			message: `Copyfish will go back to the free mode. \n If you think this message is an error, please contact us at team@ocr.space`
		});
	}
}


function captureScreen(beforeCb, afterCb, tabId) {
	if (errorConnect === false && fileaccessConnectError === false) {
		//
		beforeCb && typeof beforeCb == 'function' && beforeCb();
		let takeScreenshot = {
			command: "saveScreenshot",
			scale: devicePixelRatio
		};
		browser.runtime.sendNativeMessage(NMHOST, takeScreenshot, ({ file, result }) => {
			if (result) {
				if (file) {
					browser.tabs.create({
						url: browser.extension.getURL('/screencapture.html')
					}, function (destTab) {
						setTimeout(() => {
							optionsTabId = destTab.id;
							imagepath = file;
							imageURI = "";
							params = {
								path: imagepath,
								rangeStart: 0
							}
							invokeAsync("get_file_size", params);
						}, 1000)
					});
				}
				afterCb && typeof afterCb == 'function' && afterCb();
				return;
			}
			browser.notifications.create({
				type: 'basic',
				iconUrl: 'images/copyfish-48.png',
				title: "Desktop capture",
				message: `Please install external Shutter program first`
			});
			openXmoduleInstallOption();
		})
	} else {
		browser.notifications.create({
			type: 'basic',
			iconUrl: 'images/copyfish-48.png',
			title: "Desktop capture",
			message: `Please install the Copyfish Desktop Screenshot module first`
		});
		tabId ? openNativeAppNotSupprotedDialog(tabId) : openXmoduleInstallOption();
	}
}

function loadDialogFile(tabId) {
	return new Promise((resolve, reject) => {
		isTabAvailable(tabId)
			.done(function () {
				return resolve();
			})
			.fail(function () {
				loadFiles(tabId)
					.then(function () {
						return resolve();
					})
					.catch((err) => {
						return reject(err);
					});
			});
	});
}

function openNativeAppNotSupprotedDialog(tabId) {
	loadDialogFile(tabId).then(function (response) {
		setTimeout(function () {
			browser.tabs.sendMessage(tabId, {
				evt: 'show-message-dialog-native-app'
			}, {}, (response) => {
				if (!response) {
					openExternalDialogNotSupported();
				}
			});
		}, 1000);
	}, function (err) {
		//openXmoduleInstallOption();
		openExternalDialogNotSupported();
	});
}

function openExternalDialogNotSupported(forLoadingPopup, popupProp) {
	let url = "/message-dialog-special-page.html?forLoadingPopup=" + forLoadingPopup || '';
	let left;
	let top;
	let w = popupProp && popupProp.width || 520;
	let h = popupProp && popupProp.height || 360;
	try {
		left = (screen.width / 2) - (w / 2);
		top = (screen.height / 2) - (h / 2);
	}
	catch (err) {

	}
	let windowCrt = browser.windows.create({
		url: url,
		type: "popup",
		height: parseInt(h),
		width: parseInt(w),
		top: parseInt(top) || 200,
		left: parseInt(left) || 430,
		//allowScriptsToClose: true,
	});
	if (windowCrt && windowCrt.then) {
		windowCrt.then(function (info) {
		}, (err) => {
			openXmoduleInstallOption();
		});
	}
}

function openXmoduleInstallOption() {
	setTimeout(function () {
		browser.runtime.openOptionsPage(function () {
			setTimeout(function () {
				browser.runtime.sendMessage({ message: "showXmoduleOption" });
			}, 300)
		})
	}, 500)
}

// supports autotimeout
function isTabAvailable(tabId) {
	function _checkAvailability() {
		var _tabId = tabId;
		var $dfd = $.Deferred();
		//return $dfd.reject();;
		if (isFirefox) {
			browser.tabs.sendMessage(_tabId, {
				evt: 'isavailable'
			}).then(function (resp) {
				if ($dfd.state() !== 'rejected') {
					if (resp && resp.farewell === 'isavailable:OK') {
						$dfd.resolve();
					} else if (resp && resp.farewell === 'isavailable:FAIL') {
						$dfd.reject();
					}
				}
			});
		} else {
			browser.tabs.sendMessage(_tabId, {
				evt: 'isavailable'
			}, function (resp) {
				if ($dfd.state() !== 'rejected') {
					if (resp && resp.farewell === 'isavailable:OK') {
						$dfd.resolve();
					} else if (resp && resp.farewell === 'isavailable:FAIL') {
						$dfd.reject();
					}
				}
			});
		}
		setTimeout(function () {
			if ($dfd.state() !== 'resolved') {
				$dfd.reject();
			}
		}, TAB_AVAILABILITY_TIMEOUT);
		return $dfd;
	}
	return _checkAvailability();
}
// ensure the config is available before doing anything else
$.getJSON(browser.extension.getURL('config/config.json'))
	.done(function (appConfig) {
		/*
		 * Should ideally be a BST, but a tree for 3 nodes is overkill.
		 * The underlying structure can be converted to a BST in future if required. Since the methods exposed remain the
		 * same, side effects should be near zero
		 */
		appConfigSettings = appConfig;
		var OcrDS = (function () {
			var _maxResponseTime = 99;
			var _randNotEqual = function (serverList, server) {
				var idx = Math.floor(Math.random() * serverList.length);
				if (serverList.length === 1) {
					return serverList[ 0 ];
				}
				if (serverList[ idx ].id !== server.id) {
					return serverList[ idx ];
				} else {
					return _randNotEqual(serverList, server);
				}
			};
			var _ocrDSAPI = {
				resetTime: appConfig.ocr_server_reset_time,
				currentBest: {},
				reset: function () {
					this.getAll().done(function (items) {
						if (Date.now() - items.ocrServerLastReset || 0 > this.resetTime) {
							$.each(items.ocrServerList, function (i, server) {
								server.responseTime = 0;
							});
						}
					});
				},
				getAll: function () {
					var $dfd = $.Deferred();
					browser.storage.sync.get({
						ocrServerLastReset: -1,
						ocrServerList: []
					}, function (items) {
						$dfd.resolve(items);
					});
					return $dfd;
				},
				getBest: function () {
					var $dfd = $.Deferred();
					var self = this;
					this.getAll().done(function (items) {
						var serverList = items.ocrServerList;
						var best = serverList[ 0 ];
						var allValuesSame = true;
						// 1. check if all values are same
						var cmp;
						$.each($.map(serverList, function (s) {
							return s.responseTime;
						}), function (i, s) {
							if (i === 0) {
								cmp = s;
								return true;
							}
							if (cmp !== s) {
								allValuesSame = false;
								return false;
							}
						});
						if (allValuesSame) {
							// if all values are same and one of them is zero, use the first occurrence
							if (serverList[ 0 ].responseTime === 0) {
								self.currentBest = serverList[ 0 ];
							} else {
								self.currentBest = _randNotEqual(serverList, self.currentBest);
							}
							return $dfd.resolve(self.currentBest);
						}
						// 2. Linear search to find best server
						$.each(serverList, function (i, server) {
							if (server.responseTime < best.responseTime) {
								best = server;
							}
						});
						self.currentBest = best;
						$dfd.resolve(self.currentBest);
					});
					return $dfd;
				},
				set: function (id, responseTime) {
					var $dfd = $.Deferred();
					this.getAll().done(function (items) {
						var serverList = items.ocrServerList;
						if (responseTime === -1) {
							responseTime = _maxResponseTime;
						}
						$.each(serverList, function (i, server) {
							if (id === server.id) {
								server.responseTime = responseTime;
								return false;
							}
						});
						browser.storage.sync.set({
							ocrServerList: serverList
						}, function () {
							$dfd.resolve();
						});
					});
					return $dfd;
				}
			};
			// init
			browser.storage.sync.get({
				ocrServerLastReset: -1,
				ocrServerList: []
			}, function (items) {
				var serverList;
				if (items.ocrServerLastReset === -1) {
					serverList = [];
					// if -1, then the store is empty. Populate it
					$.each(appConfig.ocr_api_list, function (i, api) {
						serverList.push({
							id: api.id,
							responseTime: 0
						});
					});
					browser.storage.sync.set({
						ocrServerList: serverList,
						ocrServerLastReset: Date.now()
					});
				} else {
					// store is not empty, reset if required
					_ocrDSAPI.reset();
				}
			});
			return _ocrDSAPI;
		}());

		browser.contextMenus.create({
			contexts: [ 'browser_action' ],
			title: 'Desktop Text Capture (Instant)',
			id: 'capture-desktop',
			onclick: (info, tab) => captureScreen(() => {
				setBadge('Desk', tab.id);
			}, () => {
				setBadge('', tab.id);
			}, tab.id || '')
		});

		browser.contextMenus.create({
			contexts: [ 'browser_action' ],
			title: 'Desktop Text Capture (3s delay)',
			id: 'capture-desktop-delay',
			onclick: (info, tab) => {
				let interval = 0;
				let intr;
				intr = setInterval(function () {
					interval++;
					setBadge(interval.toString(), tab.id);
					if (interval >= 4) {
						// cancel interval
						setBadge('', tab.id);
						clearInterval(intr);
						captureScreen(() => {
							setBadge('Desk', tab.id);
						}, () => {
							setBadge('', tab.id);
						}, tab.id || '');
					}
				}, 1000);
			}
		});

		browser.contextMenus.create({
			contexts: [ 'browser_action' ],
			title: 'Get image from clipboard',
			id: 'clipboard_image',
			onclick: captureClipboardImage
		});

		function checkValidImgBase64(s) {
			let regex = /^\s*data:([a-z]+\/[a-z]+(;[a-z\-]+\=[a-z\-]+)?)?(;base64)?,[a-z0-9\!\$\&\'\,\(\)\*\+\,\;\=\-\.\_\~\:\@\/\?\%\s]*\s*$/i;
			return s.match(regex);
		}

		function toDataURL(url) {
			let $dfd = $.Deferred();
			try {
				var xhr = new XMLHttpRequest();
				xhr.onload = function () {
					var reader = new FileReader();
					reader.onloadend = function () {
						$dfd.resolve(reader.result);
					}
					reader.readAsDataURL(xhr.response);
				};
				xhr.open('GET', url);
				xhr.responseType = 'blob';
				xhr.send();
			} catch (err) {
				$dfd.reject(err);
			}
			return $dfd;
		}

		function captureClipboardImage(info, tab) {
			try {
				if (isFirefoxBrowser) {
					browser.tabs.sendMessage(
						// Send a message to the content script
						tab.id || 0,
						{
							evt: 'captureClipboard'
						}
					).catch((err) => {
						let url = "/message-dialog-action-popup.html";
						browser.windows.create({
							url: url,
							type: "popup",
							height: 300,
							width: 525,
							top: 200,
							allowScriptsToClose: true,
						}).then(function (info) {
							setTimeout(function () {
								// will be closed in 5 seconds...
								browser.windows.remove(info.id);
							}, 5000);
						}, (err) => {
							//console.log(err);
						});
					});
					return;
				}
				let createTabCallback = function (destTab, dataUri) {
					setTimeout(() => {
						optionsTabId = destTab.id;
						browser.tabs.sendMessage(optionsTabId, {
							evt: 'desktopcaptureData',
							result: dataUri,
							ocrText: '',
							overlayInfo: '',
							forExternalTab: 0,
							translatedTextIfAny: '',
							currentZoomLevel: 0,
						});
					}, 1000);
				};

				let imgSrcRegex = /<img[^>]+src="([^">]+)"/g;
				let copyDiv = document.createElement('div');
				copyDiv.contentEditable = true;
				document.body.appendChild(copyDiv);
				copyDiv.focus();
				document.execCommand("paste");
				let imageContent = copyDiv.innerHTML;
				let src = imgSrcRegex.exec(imageContent);
				if (!src || !src[ 1 ]) {
					showWarningMessge(tab.id, 'No image in clipboard');
					return;
				}
				let checkValidImage = checkValidImgBase64(src[ 1 ]);
				if (!checkValidImage && src[ 1 ]) {
					toDataURL(src[ 1 ]).then((res) => {
						browser.tabs.create({
							url: browser.extension.getURL('/screencapture.html')
						}, (destTab) => createTabCallback(destTab, res));
					}, (err) => {
						showWarningMessge(tab.id, 'No image in clipboard');
					});
					return;
				}
				else if (!checkValidImage) {
					//alert('No image in clipboard');
					showWarningMessge(tab.id, 'No image in clipboard');
					return;
				}
				browser.tabs.create({
					url: browser.extension.getURL('/screencapture.html')
				}, (destTab) => createTabCallback(destTab, src[ 1 ]));
			} catch (err) {
				console.log(err);
			}
		}

		function showWarningMessge(tabId, message) {
			if (!tabId) {
				alert(message);
				return;
			}
			loadDialogFile(tabId).then(function (response) {
				let promiseSendMsg = browser.tabs.sendMessage(tabId, {
					evt: 'show-warning',
					data: message || ''
				}, {}, function (response) {
					console.log(response);
					if (!response) {
						alert(message);
					}
				});
			}, function (err) {
			});
		}

		// disableIcon();
		// browser.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
		// 	if(changeInfo && changeInfo.status && changeInfo.status=='complete')
		// 		enableIcon(tabId);
		// });
		browser.storage.sync.get({
			visualCopyOCRLang: '',
			visualCopyTranslateLang: '',
			visualCopyAutoTranslate: '',
			visualCopyOCRFontSize: '',
			visualCopySupportDicts: '',
			useTableOcr: '',
			copyAfterProcess: '',
			copyType: '',
			visualCopyQuickSelectLangs: [],
			visualCopyTextOverlay: ''
		}, function (items) {
			var itemsToBeSet;
			if (!items.visualCopyOCRLang) {
				// first run of the extension, set everything
				browser.storage.sync.set(appConfig.defaults, function () { });
			} else {
				// if any of these fields return '', they have not been set yet.
				itemsToBeSet = {};
				$.each(items, function (k, item) {
					if (item === '') {
						itemsToBeSet[ k ] = appConfig.defaults[ k ];
					}
				});
				if (Object.keys(itemsToBeSet).length) {
					browser.storage.sync.set(itemsToBeSet, function () { });
				}
			}
		});

		//if browser action on click is desktop capture set green icon
		const changeIcon = (url, tabId) => {
			if (isUpdated) {
				return setBadge('New', tabId);
			}
			if (url && (/^moz\-extension\/\//.test(url) || /^about:/.test(url) || /^https:\/\/addons\.mozilla\.org\//.test(url)) || (/^chrome\-extension:\/\//.test(url) || /^chrome:\/\//.test(url) || /^https:\/\/chrome\.google\.com\/webstore\//.test(url))) {
				browser.browserAction.setIcon({
					'path': {
						"16": "images/copyfish-16.png",
						"32": "images/copyfish-32.png",
						"48": "images/copyfish-48.png",
						"128": "images/copyfish-128.png"
					},
					tabId
				});
				//setBadge('Desk',tabId);
			}
			else {
				setBadge('', tabId);
			}
		};
		browser.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
			if (changeInfo && changeInfo.status && changeInfo.status == 'complete') {
				// if ((!tab || !tab.url) && intialTab == tabId) {
				// 	return setBadge('Desk', tabId);
				// }
				changeIcon(tab.url, tab.id);
				enableIcon(tabId);
			}
		});

		browser.tabs.onActivated.addListener(function (activeInfo) {
			// how to fetch tab url using activeInfo.tabid
			browser.tabs.get(activeInfo.tabId, function (tab) {
				// if (!tab.url && intialTab == activeInfo.tabId) {
				// 	return setBadge('Desk', activeInfo.tabId);
				// }
				tab && changeIcon(tab.url || '', activeInfo.tabId);
			});
		});

		browser.browserAction.onClicked.addListener(
			function (tab) {
				const url = tab.url || !1;
				if (url && (/^moz\-extension\/\//.test(url) || /^about:/.test(url) || /^https:\/\/addons\.mozilla\.org\//.test(url)) || (/^chrome\-extension:\/\//.test(url) || /^chrome:\/\//.test(url) || /^https:\/\/chrome\.google\.com\/webstore\//.test(url))) {
					if (isUpdated) {
						activate(tab);
						return;
					}
					captureScreen(() => {
						setBadge('Desk', tab.id);
					}, () => {
						setBadge('', tab.id);
					}, tab.id || '');
				} else {
					if (isUpdated) {
						activate(tab);
						return;
					}
					browser.storage.sync.get({ useDefaultDesktopOcr: false }, function (result) {
						try {
							if (result && result.useDefaultDesktopOcr) { // if forecly useDesktopOcr
								captureScreen(() => {
									setBadge('Desk', tab.id);
								}, () => {
									setBadge('', tab.id);
								}, tab.id || '');
							} else {
								activate(tab);
							}
						}
						catch (err) {
							activate(tab);
						}

					});
				}
			}
		);
		const toDataUrl = (url, callback) => {
			let xhr = new XMLHttpRequest();
			xhr.onload = function () {
				var reader = new FileReader();
				reader.onloadend = function () {
					callback(reader.result);
				}
				reader.readAsDataURL(xhr.response);
			};
			xhr.open('GET', url);
			xhr.responseType = 'blob';
			xhr.send();
		}
		browser.contextMenus.create({
			"title": "Copyfish Get Text From Image",
			"contexts": [ "image" ],
			"onclick": ({ srcUrl }, tab) => activate(tab, (tabId) => getTextFromImage(srcUrl, tabId))
		});
		const getTextFromImage = (srcUrl, tabId) => {
			if (srcUrl.indexOf('http://') !== -1 || srcUrl.indexOf('https://') !== -1) {
				toDataUrl('https://cors-anywhere.herokuapp.com/' + srcUrl, function (myBase64) {
					srcUrl = myBase64
				});
			}
			browser.tabs.sendMessage(tabId, {
				evt: 'image_for_parse',
				data: srcUrl
			});
		}
		function activate(tab, callback = false) {
			browser.tabs.sendMessage(tab.id, {
				evt: 'disableselection'
			});
			if (isUpdated && !callback) {
				browser.tabs.create({
					url: "https://ocr.space/copyfish/whatsnew?b=chrome"
				});
				isUpdated = false;
				updateIcons();
				return;
			}
			isTabAvailable(tab.id)
				.done(function () {
					browser.tabs.sendMessage(tab.id, {
						evt: 'enableselection'
					});
					if (typeof callback === 'function') callback(tab.id);
				})
				.fail(function () {
					loadFiles(tab.id)
						.then(function () {
							isTabAvailable(tab.id)
								.done(function () {
									browser.tabs.sendMessage(tab.id, {
										evt: 'enableselection'
									});
									if (typeof callback === 'function') callback(tab.id);
								})
								.fail(function () {
									// setTimeout(function(){
									// 	browser.tabs.sendMessage(tab.id, {
									// 		evt: 'show-message-dialog'
									// 	});
									// },200);
									openExternalDialogNotSupported('on', { height: 286 });
									// let wantScreenCapture = confirm(browser.i18n.getMessage('captureError'));
									// if (wantScreenCapture === true) {
									// 	captureScreen();
									// }
									enableIcon(tab.id);
								});
						})
						.catch(() => {
							let wantScreenCapture = confirm(browser.i18n.getMessage('captureError'));
							if (wantScreenCapture === true) {
								captureScreen();
							}
							enableIcon(tab.id);
						});
				});
		}


		browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			var tab = sender.tab;
			var copyDiv;
			var overlayInfo;
			var imgDataURI;
			if (!tab) {
				return false;
			}
			if (request.evt === 'checkDesktopCaptureSoftware') {
				sendResponse(!errorConnect && !fileaccessConnectError)
			} else if (request.evt === 'captureScreen') {
				if (tab && tab.id) {
					captureScreen(() => {
						setBadge('Desk', tab.id);
					}, () => {
						setBadge('', tab.id);
					}, tab.id || '')
				}
				else {
					captureScreen();
				}
			} else if (request.evt === 'fileaccessGetVersion') {
				getFileAccessVersion();
			} else if (request.evt === 'fileaccessTest') {
				testFileAccess();
			} else if (request.evt === 'ready') {
				enableIcon(tab.id);
				sendResponse({
					farewell: 'ready:OK'
				});
				return true;
			} else if (request.evt === 'checkKey') {
				checkPlanEveryDay();
			} else if (request.evt === 'activate') {
				activate(tab);
			} else if (request.evt === 'capture-screen') {
				browser.tabs.captureVisibleTab(function (dataURL) {
					browser.tabs.getZoom(tab.id, function (zf) {
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
				if (isFirefoxBrowser) {
					browser.tabs.query({
						currentWindow: true,
						active: true
						// Select active tab of the current window
					}, function (tab) {
						browser.tabs.sendMessage(
							// Send a message to the content script
							tab[ 0 ].id,
							{
								evt: 'copyToClipboard',
								data: request.text
							}
						);
					});
					return sendResponse({
						farewell: 'copy:OK'
					});
				}
				copyDiv = document.createElement('div');
				copyDiv.contentEditable = true;
				copyDiv.style = "white-space:pre-wrap;"
				document.body.appendChild(copyDiv);
				copyDiv.textContent = request.text;
				copyDiv.unselectable = 'off';
				copyDiv.focus();
				document.execCommand('SelectAll');
				document.execCommand('Copy', false, null);
				document.body.removeChild(copyDiv);
				return sendResponse({
					farewell: 'copy:OK'
				});
			} else if (request.evt === 'open-settings') {
				browser.tabs.create({
					'url': browser.extension.getURL('options.html')
				});
				sendResponse({
					farewell: 'open-settings:OK'
				});
			} else if (request.evt === 'get-best-server') {
				OcrDS.getBest().done(function (server) {
					sendResponse({
						server: server
					});
				});
				return true;
			} else if (request.evt === 'set-server-responsetime') {
				OcrDS.set(request.serverId, request.serverResponseTime).done(function () {
					sendResponse({
						farewell: 'set-server-responsetime:OK'
					});
				});
				return true;
			} else if (request.evt === 'translateDesktopCapturedImage') {
				browser.tabs.sendMessage(sender.tab.id, {
					evt: "translateCapturedImage",
					data: request.data || null,
					ocrText: request.ocrText || '',
					overlayInfo: request.overlayInfo || '',
					forExternalTab: request.forExternalTab || 0,
					translatedTextIfAny: request.translatedTextIfAny || '',
					currentZoomLevel: request.currentZoomLevel || 0,
				});
			} else if (request.evt === 'imageOcrInTab') {
				let tabCreated = browser.tabs.create({
					url: browser.extension.getURL('/screencapture.html')
				}, function (destTab) {
					setTimeout(() => {
						optionsTabId = destTab.id;
						browser.tabs.sendMessage(optionsTabId, {
							evt: 'desktopcaptureData',
							result: request.data,
							ocrText: request.ocrText || '',
							overlayInfo: request.overlayInfo || '',
							forExternalTab: 1,
							translatedTextIfAny: request.translatedTextIfAny || '',
							currentZoomLevel: request.currentZoomLevel || 0,
						});
					}, 3000);
				});

			} else if (request.evt === 'show-overlay-tab') {
				// trap them props
				overlayInfo = request.overlayInfo;
				imgDataURI = request.imgDataURI;
				browser.tabs.create({
					url: browser.extension.getURL('/overlay.html')
				}, function (destTab) {
					setTimeout(function () {
						if (isFirefox) {
							browser.tabs.sendMessage(destTab.id, {
								evt: 'init-overlay-tab',
								overlayInfo: overlayInfo,
								imgDataURI: imgDataURI,
								canWidth: request.canWidth,
								canHeight: request.canHeight
							}).then(function () {
								sendResponse({
									farewell: 'show-overlay-tab:OK'
								});
							});
						} else {
							browser.tabs.sendMessage(destTab.id, {
								evt: 'init-overlay-tab',
								overlayInfo: overlayInfo,
								imgDataURI: imgDataURI,
								canWidth: request.canWidth,
								canHeight: request.canHeight
							}, function () {
								sendResponse({
									farewell: 'show-overlay-tab:OK'
								});
							});
						}
					}, 300);
				});
				return true;
			} else if (request.evt === 'google-translate') {
				let OPTIONS = request.options;
				let text = request.text;
				$.ajax({
					url: OPTIONS.google_trs_api_url,
					data: {
						key: OPTIONS.google_trs_api_key,
						target: OPTIONS.visualCopyTranslateLang,
						q: text
					},
					type: 'GET',
					success: function (data) {
						if (data && data.data && data.data.translations && data.data.translations[ 0 ].translatedText != null) {
							sendResponse({
								success: true,
								data: data.data.translations[ 0 ].translatedText
							});
						}
					},
					error: function (x, t) {
						var errData;
						try {
							errData = JSON.parse(x.responseText);
						} catch (e) {
							errData = {};
						}
						sendResponse({
							success: false,
							data: errData,
							time: t
						});
					}
				});
				return true;
			} else if (request.evt === 'deepapi-translate') {
				let OPTIONS = request.options;
				let text = request.text;
				$.ajax({
					url: OPTIONS.deepl_api_url, // || is temp need to remve just for testing
					data: {
						auth_key: OPTIONS.deepl_api_key,
						target_lang: OPTIONS.visualCopyTranslateLang,
						text: text
					},
					type: 'GET',
					success: function (data) {
						if (data && data.translations && data.translations[ 0 ] && data.translations[ 0 ].text != null) {
							sendResponse({
								success: true,
								data: data.translations[ 0 ].text
							});
						}
					},
					error: function (x, t) {
						var errData;
						try {
							errData = JSON.parse(x.responseText);
						} catch (e) {
							errData = {};
						}
						sendResponse({
							success: false,
							data: errData,
							time: t
						});
					},
					complete: function (x) {

					}
				});
				return true;
			} else if (request.evt === 'google-ocr') {
				let OPTIONS = request.options;
				$.ajax({
					method: 'POST',
					url: OPTIONS.google_ocr_api_url + '?key=' + OPTIONS.google_ocr_api_key,
					contentType: 'application/json',
					data: JSON.stringify(request.request),
					processData: false,
					success: function (data) {
						sendResponse({
							success: true,
							data: data
						});
					},
					error: function ({ status }) {
						sendResponse({
							success: false,
							data: []
						});
					}
				})
				return true
			} else if (request.evt == 'show-warning') {
				if (request.message) {
					if (isFirefoxBrowser) {
						let alertWarning = `alert('${request.message}');`
						browser.tabs.executeScript({ code: alertWarning });
					} else {
						alert(request.message);
					}
				}
			}
			else if (request.evt == 'open-window') {
				request.url && window.browser.tabs.create({ url: request.url });
			}
			else if (request.evt == "runContentScript") {
				let sendRes = () => {
					sendResponse({
						success: true
					})
				};
				loadFiles(tab.id).then(function () {
					sendRes();
				}, function (err) {

				});
			}
			else if (request.evt == "show-warning-message") {
				showWarningMessge(tab.id, request.data && request.data.message);
			}
		});
	});

function loadFiles(tabId) {
	var files = [ "styles/material.min.css", "styles/cs.css", "scripts/jquery.min.js", "scripts/material.min.js", "scripts/overlay.js", "scripts/cs.js" ];
	var result = Promise.resolve();
	files.forEach(function (file) {
		result = result.then(function () {
			if (/css$/.test(file)) {
				return insertCSS(tabId, file);
			} else {
				return executeScript(tabId, file);
			}
		});
	});
	return result;
}

function insertCSS(tabId, file) {
	return new Promise(function (resolve, reject) {
		browser.tabs.insertCSS(tabId, {
			file: file
		}, function () {
			resolve();
		});
	});
}
function executeScript(tabId, file, initLoading) {
	return new Promise(function (resolve, reject) {
		browser.tabs.executeScript(tabId, {
			file: file,
			//runAt : initLoading ? 'document_start' : 'document_idle',
		}, function () {
			resolve();
		});
	});
}

checkPlanEveryDay()
//
browser.runtime.onInstalled.addListener(function (object) {
	onInstallActiveTab();
	if (object.reason === browser.runtime.OnInstalledReason.INSTALL) {
		if (isFirefoxBrowser) {
			// if firefox then clear the already stored storage if any 
			try {
				browser.storage.sync.clear();
			}
			catch (err) {

			}
		}
		// Open page after installation
		browser.tabs.create({
			url: "https://ocr.space/copyfish/welcome?b=chrome"
		});
		updateIcons();
	} else if (object.reason === browser.runtime.OnInstalledReason.UPDATE) {
		// Update icon for all tabs
		isUpdated = true;
		updateIcons();
	}
});

//detect file access status
browser.extension.isAllowedFileSchemeAccess((status) => {
	browser.storage.sync.set({ fileAccessStatus: isFirefox ? true : status });
})
// Open page after uninstall
browser.runtime.setUninstallURL("https://ocr.space/copyfish/why?b=chrome");
