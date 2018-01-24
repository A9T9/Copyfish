'use strict';
var TAB_AVAILABILITY_TIMEOUT = 150;
/*
 * how does the enable/disable icon work?
 * Ans: website:document.ready -> 'ready' message to background -> enables icon
 *
 * how does clicking on the extension icon work?
 * Ans: browserAction:onclick -> 'enableselection' event to specific tab -> selection enabled in that tab
 */

var activeOnTab = {};

var isUpdated = false;

function updateIcons() {
	for (var tabId in activeOnTab) {
		if (activeOnTab.hasOwnProperty(tabId)) {
			if (activeOnTab[tabId]) {
				enableIcon(+tabId);
			} else {
				disableIcon(+tabId);
			}
		}
	}

	chrome.tabs.query({}, function (tabs) {
		for (var i = 0; i < tabs.length; i++) {
			var tab = tabs[i];
			if (/^chrome:/.test(tab.url)) {
				disableIcon(tab.id);
			} else {
				enableIcon(tab.id);
			}
		}
	});
}

function enableIcon(tabId) {	
	activeOnTab[tabId] = true;
	chrome.browserAction.enable(tabId);
	if (isUpdated) {
		chrome.browserAction.setIcon({
			'path': {
				'19': 'images/icon-19_new.png',
				'38': 'images/icon-38_new.png'
			},
			tabId: tabId
		});
	} else {
		chrome.browserAction.setIcon({
			'path': {
				'19': 'images/icon-19.png',
				'38': 'images/icon-38.png'
			},
			tabId: tabId
		});
	}
}

function disableIcon(tabId) {
	activeOnTab[tabId] = false;
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
	}, function (granted) {
		// The callback argument will be true if the user granted the permissions.
		if (granted) {
			chrome.tabs.create({
				url: chrome.extension.getURL('/screencapture.html')
			}, function (destTab) {
				// delay the action so that the tab is ready. Possible bug with the API
				setTimeout(function () {
					disableIcon(destTab.id);
				}, 300);
				chrome.desktopCapture.chooseDesktopMedia(['window', 'screen'], function (inStream) {
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
						}, function (mediaStream) {
							var videoTrack = mediaStream.getVideoTracks();
							videoTrack = videoTrack.length > 0 ? videoTrack[0] : null;
							var v = document.createElement('video');
							var can = document.createElement('canvas');
							var dataURL;
							v.src = URL.createObjectURL(mediaStream);
							setTimeout(function () {
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
								}, function () {
									// chrome.tabs.sendMessage(destTab.id, {
									//     evt: 'enableselection'
									// });
								});
								can.remove();
								v.remove();
							}, 500);
						}, function () {});
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
		}, function (resp) {
			if ($dfd.state() !== 'rejected') {
				if (resp && resp.farewell === 'isavailable:OK') {
					$dfd.resolve();
				} else if (resp && resp.farewell === 'isavailable:FAIL') {
					$dfd.reject();
				}
			}
		});

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
$.getJSON(chrome.extension.getURL('config/config.json'))
	.done(function (appConfig) {
		/*
		 * Should ideally be a BST, but a tree for 3 nodes is overkill. 
		 * The underlying structure can be converted to a BST in future if required. Since the methods exposed remain the
		 * same, side effects should be near zero
		 */
		var OcrDS = (function () {
			var _maxResponseTime = 99;
			var _randNotEqual = function (serverList, server) {
				var idx = Math.floor(Math.random() * serverList.length);
				if (serverList.length === 1) {
					return serverList[0];
				}
				if (serverList[idx].id !== server.id) {
					return serverList[idx];
				} else {
					return _randNotEqual(serverList, server);
				}
			};
			var _ocrDSAPI = {
				resetTime: appConfig.ocr_server_reset_time,
				currentBest: {},
				reset: function () {
					this.getAll().done(function (items) {
						if (Date.now() - items.ocrServerLastReset > this.resetTime) {
							$.each(items.ocrServerList, function (i, server) {
								server.responseTime = 0;
							});
						}
					});
				},
				getAll: function () {
					var $dfd = $.Deferred();
					chrome.storage.sync.get({
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
						var best = serverList[0];
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
							if (serverList[0].responseTime === 0) {
								self.currentBest = serverList[0];
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
						chrome.storage.sync.set({
							ocrServerList: serverList
						}, function () {
							$dfd.resolve();
						});
					});
					return $dfd;
				}
			};

			// init
			chrome.storage.sync.get({
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
					chrome.storage.sync.set({
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

		chrome.contextMenus.create({
			contexts: ['browser_action'],
			title: 'Desktop Text Capture',
			id: 'capture-desktop',
			onclick: captureScreen
		});

		// disableIcon();
		chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
			var url = changeInfo.url || tab.url || !1;
			if (url && (/^chrome\-extension:\/\//.test(url) || /^chrome:\/\//.test(url) || /^https:\/\/chrome\.google\.com\/webstore\//.test(url))) {
				disableIcon(tabId);
			} else {
				enableIcon(tabId);
			}
		});

		chrome.storage.sync.get({
			visualCopyOCRLang: '',
			visualCopyTranslateLang: '',
			visualCopyAutoTranslate: '',
			visualCopyOCRFontSize: '',
			visualCopySupportDicts: '',
			visualCopyQuickSelectLangs: [],
			visualCopyTextOverlay: ''
		}, function (items) {
			var itemsToBeSet;
			if (!items.visualCopyOCRLang) {
				// first run of the extension, set everything
				chrome.storage.sync.set(appConfig.defaults, function () {});
			} else {
				// if any of these fields return '', they have not been set yet.
				itemsToBeSet = {};
				$.each(items, function (k, item) {
					if (item === '') {
						itemsToBeSet[k] = appConfig.defaults[k];
					}
				});
				if (Object.keys(itemsToBeSet).length) {
					chrome.storage.sync.set(itemsToBeSet, function () {});
				}
			}
		});

		chrome.browserAction.onClicked.addListener(activate);

		function activate(tab) {
			if (isUpdated) {
				chrome.tabs.create({
					url: "https://a9t9.com/copyfish/whatsnew?b=chrome"
				});

				isUpdated = false;
				updateIcons();
				return;
			}

			disableIcon(tab.id);

			isTabAvailable(tab.id)
				.done(function () {
					chrome.tabs.sendMessage(tab.id, {
						evt: 'enableselection'
					});
				})
				.fail(function () {
					loadFiles(tab.id)
						.then(function () {
							isTabAvailable(tab.id)
								.done(function () {
									chrome.tabs.sendMessage(tab.id, {
										evt: 'enableselection'
									});
								})
								.fail(function () {
									window.alert(chrome.i18n.getMessage('captureError'));
									enableIcon(tab.id);
								});
						})
						.catch(() => {
							window.alert(chrome.i18n.getMessage('captureError'));
							enableIcon(tab.id);
						});
				});
		}

		function loadFiles(tabId) {
			var files = ["styles/material.min.css", "styles/cs.css", "scripts/jquery.min.js", "scripts/material.min.js", "scripts/overlay.js", "scripts/cs.js"];
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
				chrome.tabs.insertCSS(tabId, {
					file: file
				}, function () {
					resolve();
				});
			});
		}

		function executeScript(tabId, file) {
			return new Promise(function (resolve, reject) {
				chrome.tabs.executeScript(tabId, {
					file: file
				}, function () {
					resolve();
				});
			});
		}

		chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
			var tab = sender.tab;
			var copyDiv;
			var overlayInfo;
			var imgDataURI;
			if (!tab) {
				return false;
			}
			if (request.evt === 'ready') {
				enableIcon(tab.id);
				sendResponse({
					farewell: 'ready:OK'
				});
				return true;
			} else if (request.evt === 'activate') {
				activate(tab);
			} else if (request.evt === 'capture-screen') {
				chrome.tabs.captureVisibleTab(function (dataURL) {
					chrome.tabs.getZoom(tab.id, function (zf) {
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
				copyDiv.textContent = request.text;
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
			} else if (request.evt === 'show-overlay-tab') {
				// trap them props
				overlayInfo = request.overlayInfo;
				imgDataURI = request.imgDataURI;
				chrome.tabs.create({
					url: chrome.extension.getURL('/overlay.html')
				}, function (destTab) {
					setTimeout(function () {
						chrome.tabs.sendMessage(destTab.id, {
							evt: 'init-overlay-tab',
							overlayInfo: overlayInfo,
							imgDataURI: imgDataURI,
							canWidth: request.canWidth,
							canHeight: request.canHeight
						}, function () {
							// chrome.tabs.sendMessage(destTab.id, {
							//     evt: 'enableselection'
							// });
							sendResponse({
								farewell: 'show-overlay-tab:OK'
							});
						});
					}, 300);
				});
				return true;
			}
		});
	});

chrome.runtime.onInstalled.addListener(function (object) {
	if (object.reason === chrome.runtime.OnInstalledReason.INSTALL) {
		// Open page after installation
		chrome.tabs.create({
			url: "https://a9t9.com/copyfish/welcome?b=chrome"
		});

		updateIcons();
	} else if (object.reason === chrome.runtime.OnInstalledReason.UPDATE) {
		// Update icon for all tabs
		isUpdated = true;
		updateIcons();
	}
});

// Open page after uninstall
chrome.runtime.setUninstallURL("https://a9t9.com/copyfish/why?b=chrome");