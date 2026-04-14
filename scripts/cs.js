/* globals jQuery, unescape, componentHandler */

(function ($) {
	'use strict';
	// pseudo-private members
	// var $ = jQuery;
	var isFirefox = typeof InstallTrigger !== 'undefined';
	var appName = 'Copyfish'; //browser.i18n.getMessage('appShortName');
	var appShortName = 'Copyfish';
	var $ready;
	var HTMLSTRCOPY;
	var APPCONFIG;
	var startX, startY, endX, endY;
	var startCx, startCy, endCx, endCy;
	var IS_CAPTURED = false;
	var $SELECTOR;
	var OPTIONS;
	let isImageParse = false;
	let imageParseData = null;
	let imagePath = null;
	var MAX_ZINDEX = 2147483646;
	var WIDGETBOTTOM = -8;
	var SELECTOR_BORDER = 2;
	let messageDialogHtml;
	var OCR_LIMIT = {
		min: {
			width: 40,
			height: 40
		},
		max: {
			width: 2600,
			height: 2600
		}
	};
	var ISPOSITIONED = false;
	var OCR_DIMENSION_ERROR = browser.i18n.getMessage('ocrDimensionError');
	var TextOverlay = window.__TextOverlay__;
	var OcrEngine = null;
	var _currentOcrXhr = null;
	var _ocrCancelled = false;
	let dialogOverlay = window.__copyFishHtmlDialog__;

	/*
	 *  Set to true to use a JPEG image. Default is PNG
	 *  JPEG_QUALITY ranges from 0.1 to 1 and is valid only if USE_JPEG is true
	 */
	 var USE_JPEG = false;
	 var JPEG_QUALITY = 0.6;
	 /*Utility functions*/
	 var logError = function (msg, err) {
	 	err = err || '';
	 	msg = msg || 'An error occurred.';
		//console.error('Extension ' + appShortName + ': ' + msg, err);
	};



	var _searchOCRLanguageList = function (lang) {
		var result = '';
		if (OPTIONS.ocrEngine == "OcrLocal") {
			$.each(APPCONFIG.ocr_languages, function (i, v) {
				if (v.lang === lang) {
					result = v;
					return false;
				}
			});
		}else if (OPTIONS.ocrEngine === "OcrSpace") {
			$.each(APPCONFIG.ocr_languages, function (i, v) {
				if (v.lang === lang) {
					result = v;
					return false;
				}
			});
		} else if (OPTIONS.ocrEngine === "OcrSpaceSecond") {
			return true
		} else if (OPTIONS.ocrEngine === "OcrSpaceThird") {
			return true
		}
		return result;
	};

	var _getLanguageLocal = function (type, lang) {
		// var langList = APPCONFIG[type === 'OCR' ? 'ocr_languages' : 'yandex_languages'];
		var res = '';
		let origLang = lang;
		lang = (lang || 'en').toLowerCase();
		if (type === 'OCR') {
			res = (_searchOCRLanguageList(lang) || {}).name;
		} else {
			
			$.each(APPCONFIG.ocr_languages, function (k, v) {
				if (lang in v || origLang in v) {
					res = v[ lang ] || v[ origLang ];
					return false;
				}
			});
		}
		return res;
	};

	var _getLanguage = function (type, lang) {
		// var langList = APPCONFIG[type === 'OCR' ? 'ocr_languages' : 'yandex_languages'];
		var res = '';
		let origLang = lang;
		lang = (lang || 'en').toLowerCase();
		res = (_searchOCRLanguageList(lang) || {}).name;
		return res;
	};
	var _setLanguageOnUI = function () {
		var ocrLang = (OPTIONS.ocrEngine === "OcrSpaceSecond" || OPTIONS.ocrEngine === "OcrSpaceThird") ? "Auto-Detect" : _getLanguage('OCR', OPTIONS.visualCopyOCRLang);
		$('.ocrext-label.ocrext-message span')
		.text('(' + ocrLang + ')')
		.attr({
			title: ocrLang
		});
		//autodetect for second and third engine
		if (OPTIONS.ocrEngine === "OcrSpaceSecond" || OPTIONS.ocrEngine === "OcrSpaceThird") {
			$('.ocrext-result').attr('dir', 'ltr');
			return
		}
		var ocrLangDir = _getLanguageDirection(ocrLang);
		$('.ocrext-result').attr('dir', ocrLangDir);
	};
	var _getLanguageDirection = function (lang) {
		if(!lang){
			return 'ltr';
		}
		var rtlLanguages = [ 'arabic', 'arabian' ];
		return rtlLanguages.indexOf(lang.toLowerCase()) === -1 ? "ltr" : "rtl";
	};
	var _setOCRFontSize = function () {
		$('.ocrext-ocr-message')
		.removeClass(function (i, className) {
			var classes = className.match(/ocrext-font-\d\dpx/ig);
			return classes && classes.length ? classes.join(' ') : '';
		})
		.addClass('ocrext-font-' + OPTIONS.visualCopyOCRFontSize);
	};
	var _setZIndex = function () {
		/*
		 * Google Translate - 1201 Perapera - 7777 GDict - 99997 Transover - 2147483647
		 */
		 if (OPTIONS.visualCopySupportDicts) {
		 	$('.ocrext-wrapper').css('zIndex', 1200);
		 	let $textarea = $('textarea.ocrext-result');
		 	if ($('#popup_support_text').length === 0) {
		 		$textarea.after(`<p id="popup_support_text" class="${$textarea.prop('classList')}">${$textarea.val()}</p>`);
		 		$textarea.hide();
		 	}
		 } else {
		 	$('.ocrext-wrapper').css('zIndex', MAX_ZINDEX);
		 }
		};
		var _isImageParseError = function (data) {
			return data && data.ParsedResults && data.ParsedResults.length && data.ParsedResults[ 0 ].FileParseExitCode === -10;
		};
		var ENGINES = [
			{ value: 'OcrSpace',       label: 'OCR Engine 1' },
			{ value: 'OcrSpaceSecond', label: 'OCR Engine 2' },
			{ value: 'OcrSpaceThird',  label: 'OCR Engine 3' },
			{ value: 'OcrLocal',       label: 'Local OCR' }
		];

		var _getEngineLabel = function(value) {
			var found = ENGINES.filter(function(e) { return e.value === value; });
			return found.length ? found[0].label : value;
		};

		var _drawEngineSelector = function () {
			var localOcrInstalled = OPTIONS.localOcrInstalled;
			var $btnContainer = $('.ocrext-quickselect-btn-container');
			$btnContainer.empty();
			var currentLabel = _getEngineLabel(OPTIONS.ocrEngine);

			var $wrapper = $('<div class="ocrext-element ocrext-engine-dropdown"></div>');

			var $btn = $('<button class="ocrext-element ocrext-engine-btn mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--colored">' +
				'<span class="ocrext-engine-btn-label">' + currentLabel + '</span>' +
				'<span class="ocrext-engine-btn-arrow">&#9660;</span>' +
				'</button>');

			var $panel = $('<div class="ocrext-engine-panel"></div>');
			$.each(ENGINES, function(i, e) {
				if (e.value === 'OcrLocal' && !localOcrInstalled) return;
				var $item = $('<div class="ocrext-engine-item' +
					(OPTIONS.ocrEngine === e.value ? ' selected' : '') +
					'" data-engine="' + e.value + '">' +
					e.label +
					'</div>');
				$panel.append($item);
			});

			$wrapper.append($btn).append($panel);
			$btnContainer.append($wrapper);
			componentHandler.upgradeElement($btn.get(0));
		};

	// Background mask
	var htmlDialogMessage = (function () {
		let $body;
		var maskString = [
		'<div class="ocrext-element ocrext-mask">',
		'<p class="ocrext-element">Please select text to grab.</p>',
		'<div class="ocrext-overlay-corner ocrext-corner-tl"></div>',
		'<div class="ocrext-overlay-corner ocrext-corner-tr"></div>',
		'<div class="ocrext-overlay-corner ocrext-corner-br"></div>',
		'<div class="ocrext-overlay-corner ocrext-corner-bl"></div>',
		'</div>'
		].join('');

		var tl;
		var tr;
		var bl;
		var br;
		return {
			addToBody: function () {
				$body = $('body');
				if (!$MASK && !$body.find('.ocrext-mask').length) {
					$MASK = $(maskString)
					.css({
						left: 0,
						top: 0,
						width: '100%',
						height: '100%',
						zIndex: MAX_ZINDEX - 2,
						display: 'none'
					});
					$MASK.appendTo($body);
					tl = $MASK.find('.ocrext-corner-tl');
					tr = $MASK.find('.ocrext-corner-tr');
					br = $MASK.find('.ocrext-corner-br');
					bl = $MASK.find('.ocrext-corner-bl');
					this.resetPosition();
				} else if (!$MASK) {
					// Re-adopt orphaned mask element left in DOM (e.g. after failed cleanup)
					$MASK = $body.find('.ocrext-mask');
					tl = $MASK.find('.ocrext-corner-tl');
					tr = $MASK.find('.ocrext-corner-tr');
					br = $MASK.find('.ocrext-corner-br');
					bl = $MASK.find('.ocrext-corner-bl');
				}
				$MASK.width($(document).width());
				$MASK.height($(document).height());
				if ([ 'absolute', 'relative', 'fixed' ].indexOf($('body').css('position')) >= 0) {
					$MASK.css('position', 'fixed');
				}
				return this;
			},
			width: function (w) {
				if (w === undefined) {
					return $MASK.width();
				}
				$MASK.width(w);
			},
			height: function (h) {
				if (h === undefined) {
					return $MASK.height();
				}
				$MASK.height(h);
			},
			show: function () {
				this.resetPosition();
				$MASK.show();
				return this;
			},
			hide: function () {
				$MASK.hide();
				return this;
			},
			remove: function () {
				$MASK.remove();
				$MASK = null;
			},
			resetPosition: function () {
				var width = $(document).width();
				var height = $(document).height();
				tl.css({
					top: 0,
					left: 0,
					width: width / 2,
					height: height / 2
				});
				tr.css({
					top: 0,
					left: width / 2,
					width: width / 2,
					height: height / 2
				});
				bl.css({
					top: height / 2,
					left: 0,
					width: width / 2,
					height: height / 2
				});
				br.css({
					top: height / 2,
					left: width / 2,
					width: width / 2,
					height: height / 2
				});
			},
			reposition: function (pos) {
				var width = $(document).width();
				var height = $(document).height();
				tl.css({
					left: 0,
					top: 0,
					width: pos.tr[ 0 ],
					height: pos.tl[ 1 ]
				});
				tr.css({
					left: pos.tr[ 0 ],
					top: 0,
					width: (width - pos.tr[ 0 ]),
					height: pos.br[ 1 ]
				});
				br.css({
					left: pos.bl[ 0 ],
					top: pos.bl[ 1 ],
					width: (width - pos.bl[ 0 ]),
					height: (height - pos.bl[ 1 ])
				});
				bl.css({
					left: 0,
					top: pos.tl[ 1 ],
					width: pos.tl[ 0 ],
					height: (height - pos.tl[ 1 ])
				});
			}
		};
	}());

	// Background mask
	var Mask = (function () {
		var $body;
		var $MASK;
		var maskString = [
		'<div class="ocrext-element ocrext-mask">',
		'<p class="ocrext-element">Please select text to grab.</p>',
		'<div class="ocrext-overlay-corner ocrext-corner-tl"></div>',
		'<div class="ocrext-overlay-corner ocrext-corner-tr"></div>',
		'<div class="ocrext-overlay-corner ocrext-corner-br"></div>',
		'<div class="ocrext-overlay-corner ocrext-corner-bl"></div>',
		'</div>'
		].join('');

		var tl;
		var tr;
		var bl;
		var br;
		return {
			addToBody: function () {
				$body = $('body');
				if (!$MASK && !$body.find('.ocrext-mask').length) {
					$MASK = $(maskString)
					.css({
						left: 0,
						top: 0,
						width: '100%',
						height: '100%',
						zIndex: MAX_ZINDEX - 2,
						display: 'none'
					});
					$MASK.appendTo($body);
					tl = $MASK.find('.ocrext-corner-tl');
					tr = $MASK.find('.ocrext-corner-tr');
					br = $MASK.find('.ocrext-corner-br');
					bl = $MASK.find('.ocrext-corner-bl');
					this.resetPosition();
					return this;
				}
				if (!$MASK) {
					// Re-adopt orphaned mask element left in DOM (e.g. after failed cleanup)
					$MASK = $body.find('.ocrext-mask');
					tl = $MASK.find('.ocrext-corner-tl');
					tr = $MASK.find('.ocrext-corner-tr');
					br = $MASK.find('.ocrext-corner-br');
					bl = $MASK.find('.ocrext-corner-bl');
				}
				$MASK.width($(document).width());
				$MASK.height($(document).height());
				if ([ 'absolute', 'relative', 'fixed' ].indexOf($('body').css('position')) >= 0) {
					$MASK.css('position', 'fixed');
				}
				return this;
			},
			width: function (w) {
				if (w === undefined) {
					return $MASK.width();
				}
				$MASK.width(w);
			},
			height: function (h) {
				if (h === undefined) {
					return $MASK.height();
				}
				$MASK.height(h);
			},
			show: function () {
				this.resetPosition();
				$MASK.show();
				return this;
			},
			hide: function () {
				$MASK.hide();
				return this;
			},
			remove: function () {
				if($MASK){
					$MASK.remove();
				}
				$MASK = null;
			},
			resetPosition: function () {
				var width = $(document).width();
				var height = $(document).height();
				tl.css({
					top: 0,
					left: 0,
					width: width / 2,
					height: height / 2
				});
				tr.css({
					top: 0,
					left: width / 2,
					width: width / 2,
					height: height / 2
				});
				bl.css({
					top: height / 2,
					left: 0,
					width: width / 2,
					height: height / 2
				});
				br.css({
					top: height / 2,
					left: width / 2,
					width: width / 2,
					height: height / 2
				});
			},
			reposition: function (pos) {
				var width = $(document).width();
				var height = $(document).height();
				tl.css({
					left: 0,
					top: 0,
					width: pos.tr[ 0 ],
					height: pos.tl[ 1 ]
				});
				tr.css({
					left: pos.tr[ 0 ],
					top: 0,
					width: (width - pos.tr[ 0 ]),
					height: pos.br[ 1 ]
				});
				br.css({
					left: pos.bl[ 0 ],
					top: pos.bl[ 1 ],
					width: (width - pos.bl[ 0 ]),
					height: (height - pos.bl[ 1 ])
				});
				bl.css({
					left: 0,
					top: pos.tl[ 1 ],
					width: pos.tl[ 0 ],
					height: (height - pos.tl[ 1 ])
				});
			}
		};
	}());
	/*
	 * Mutates global state by setting the OPTIONS value
	 */
	 function getOptions() {
	 	try {
	 		var $optsDfd = $.Deferred();
	 		var theseOptions = {
	 			visualCopyOCRLang: '',
				// visualCopyAutoProcess: '',
				visualCopyOCRFontSize: '',
				copyAfterProcess: '',
				copyType: '',
				visualCopySupportDicts: '',
				useTableOcr: '',
				visualCopyQuickSelectLangs: [],
				localOcrInstalled: false,
				visualCopyTextOverlay: '',
				openGrabbingScreenHotkey: 0,
				closePanelHotkey: 0,
				copyTextHotkey: 0,
				ocrEngine: '',
				status: null
			};
			browser.storage.sync.get(theseOptions, function (opts) {
				opts.visualCopyTextOverlay = 1;
				OPTIONS = opts;
				// set the global options here
				$optsDfd.resolve();
			});
			return $optsDfd;
		}
		catch (err) {
			console.log(err);
		}
	}

	/*
	 * Mutates global state by setting the OPTIONS value
	 */
	 function setOptions(opts) {
	 	var $optsDfd = $.Deferred();
	 	browser.storage.sync.set(opts, function () {
	 		$.extend(OPTIONS, opts);
			// set the global options here
			$optsDfd.resolve();
		});
	 	return $optsDfd;
	 }

	/*
	 * Loads the config, HTML and options before activating the widget
	 */
	 function _bootStrapResources() {
	 	var $dfd = $.Deferred();
	 	browser.runtime.sendMessage({
	 		evt: '_bootStrapResources'
	 	}, function (response) {
	 		getOptions();
	 		let config= response.config;
	 		let htmlStr= response.htmlStr;

	 		if (OPTIONS.status !== "PRO+") {
	 			$('.translate-text-tab').addClass('disabled');
	 		} else {
	 			$('.copyfish-text-translate').css('display', 'flex');
	 		}
	 		HTMLSTRCOPY = htmlStr;
				//works on PC, but not Mac/Linux? OCRTranslator.APPCONFIG = APPCONFIG = JSON.parse(config[0]);
				// Note: it seems like with jQuery 3+,  $.get (ajax) directly returns a json object if you're loading a json file
				OCRTranslator.APPCONFIG = APPCONFIG = typeof config === 'string' ? JSON.parse(config) : config;
				$dfd.resolve(APPCONFIG, HTMLSTRCOPY);
			});
	 	return $dfd;
	 }

	/*
	 * Loads the config, HTML and options before activating the widget
	 */
	 function _bootStrapMessageDialog() {
	 	let $dfd = $.Deferred();
	 	if ($('#cfish-popup-message-dialog').length) {
	 		$dfd.resolve();
	 		return $dfd;
	 	}
	 	browser.runtime.sendMessage({
	 		evt: '_bootStrapMessageDialog'
	 	}, function (response) {
	 		getOptions();
	 		let htmlStr= response.htmlStr;
	 		messageDialogHtml = htmlStr;
	 		$('body').append(messageDialogHtml);
	 		$dfd.resolve();
	 	});
	 	return $dfd;
	 }

	/*
	 * Converts dataURI to a blob instance
	 */

	//zoom 0.5 mode prototype
	// async  function  resizeImage(url, width, height) {
	//
	// 	return new Promise((resolve, reject) => {
	// 		var sourceImage = new Image();
	//
	// 		sourceImage.onload = function() {
	// 			// Create a canvas with the desired dimensions
	// 			var canvas = document.createElement("canvas");
	// 			canvas.width = width;
	// 			canvas.height = height;
	//
	// 			// Scale and draw the source image to the canvas
	// 			canvas.getContext("2d").drawImage(sourceImage, 0, 0, width, height);
	//
	// 			// Convert the canvas to a data URL in PNG format
	// 			resolve(canvas.toDataURL());
	// 		}
	//
	//
	// 		sourceImage.src = url;
	// 	})
	//
	//
	// }

	async function dataURItoBlob(dataURI) {
		//Todo zoom 0.5 mode prototype
		// if ($('#zoom-btn') && $('#zoom-btn').data('value') === 0.5){
		// 	const $ocrRext = $('#ocrext-canOrig');
		// 	let resize = {
		// 		width: $ocrRext.width() * 2,
		// 		height: $ocrRext.height() * 2
		// 	};
		// 	dataURI = await resizeImage(dataURI,resize.width, resize.height);
		// }
		// convert base64/URLEncoded data component to raw binary data held in a string
		var byteString;
		if (dataURI.split(',')[ 0 ].indexOf('base64') >= 0) {
			byteString = atob(dataURI.split(',')[ 1 ]);
		} else {
			byteString = unescape(dataURI.split(',')[ 1 ]);
		}
		// separate out the mime component
		var mimeString = dataURI.split(',')[ 0 ].split(':')[ 1 ].split(';')[ 0 ];
		// write the bytes of the string to a typed array
		var ia = new Uint8Array(byteString.length);
		for (var i = 0; i < byteString.length; i++) {
			ia[ i ] = byteString.charCodeAt(i);
		}
		return new Promise((resolve, reject) => {
			resolve(
				new Blob([ ia ], { type: mimeString })
				)
		});
	}

	/*depends on the global variables startCx,startCy,endCx,endCy
	 * will not work if layout changes in between calls, but there is no way to detect this.
	 * is asynchronous, returns a promise
	 */

	 function _captureImageOntoCanvas(image_parse_mode = false, imageUrl) {
	 	var $canOrig = $('#ocrext-canOrig'),
	 	$can = $('#ocrext-can'),
	 	$dialog = $('body').find('.ocrext-wrapper');
	 	var $captureComplete = $.Deferred();
	 	IS_CAPTURED = true;
		// capture the current tab using the background page. On success it returns
		// dataURL and zoom of the captured image
		getOptions().done(function () {
			_setLanguageOnUI();
			_setOCRFontSize();
			_drawEngineSelector();
			setTimeout(function () {
				if (isFirefox) {
					browser.runtime.sendMessage({
						evt: 'capture-screen'
					}).then(function (response) {
						getOptionsCallback(response, $canOrig, $can, $dialog, image_parse_mode, imageUrl, $captureComplete)
					});
				} else {
					browser.runtime.sendMessage({
						evt: 'capture-screen'
					}, function (response) {
						getOptionsCallback(response, $canOrig, $can, $dialog, image_parse_mode, imageUrl, $captureComplete)
					});
				}
			}, 150);
		});
		return $captureComplete;
	}
	const getOptionsCallback = (response, $canOrig, $can, $dialog, image_parse_mode, imageUrl, $captureComplete) => {
		var $imageLoadDfd = $.Deferred();
		var img = new Image();
		img.onload = function () {
			$imageLoadDfd.resolve();
		};
		img.crossOrigin = "anonymous";
		img.src = image_parse_mode ? imageUrl : response.dataURL;
		$imageLoadDfd
		.done(function () {
				// the screencapture is messed up when pixel density changes; compare the window width
				// and image width to determine if it needs to be fixed
				// also, this fix problem with page zoom
				var devicePxRatio = devicePixelRatio;
				var scaleValue = 1 / devicePxRatio;
				var dpf = window.innerWidth / img.width;
				var scaleFactor = 1 / dpf,
				sx = image_parse_mode ? img.width : Math.min(startCx, endCx) * scaleFactor,
				sy = image_parse_mode ? img.height : Math.min(startCy, endCy) * scaleFactor,
				width = image_parse_mode ? img.width : Math.abs(endCx - startCx),
				height = image_parse_mode ? img.height : Math.abs(endCy - startCy),
				scaledWidth = image_parse_mode ? width : width * scaleFactor,
				scaledHeight = image_parse_mode ? height : height * scaleFactor;
				$canOrig.attr({
					width: scaledWidth,
					height: scaledHeight
				});
				$can.attr({
					width: width,
					height: height,
				});
				var ctxOrig = $canOrig.get(0).getContext('2d');
				//var ctxOrig = setupCanvas($canOrig.get(0));
				//var ctx = setupCanvas($can.get(0));
				var ctx = $can.get(0).getContext('2d');
				if (image_parse_mode) {
					ctxOrig.drawImage(img, 0, 0, scaledWidth, scaledHeight, 0, 0, scaledWidth, scaledHeight)
					ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight, 0, 0, scaledWidth, scaledHeight); // Or at whatever offset you like
				} else {
					ctxOrig.drawImage(img, sx, sy, scaledWidth, scaledHeight, 0, 0, scaledWidth, scaledHeight)
					ctx.drawImage(img, sx, sy, scaledWidth, scaledHeight, 0, 0, width, height); // Or at whatever offset you like
				}
				$dialog.css({
					opacity: 1,
					bottom: WIDGETBOTTOM
				});
				$captureComplete.resolve();
			});
	}

	function setupCanvas(canvas) {
		try {
			// Get the device pixel ratio, falling back to 1.
			var dpr = window.devicePixelRatio || 1;
			var reset = false;
			if (!$(canvas).is(":visible")) {
				$(canvas).show();
				reset = true;
			}
			// Get the size of the canvas in CSS pixels.
			var rect = canvas.getBoundingClientRect();
			// Give the canvas pixel dimensions of their CSS
			// size * the device pixel ratio.
			if (reset) {
				$(canvas).hide();
			}
			//canvas.width = rect.width * dpr;
			//canvas.height = rect.height * dpr;
			$(canvas).attr({
				width: rect.width * dpr,
				height: rect.height * dpr
			})
			var ctx = canvas.getContext('2d');
			// Scale all drawing operations by the dpr, so you
			// don't have to worry about the difference.
			ctx.scale(dpr, dpr);
			return ctx;
		} catch (err) {
			console.log(err);
			return canvas.getContext('2d');
		}
	}

	/*
	 * Returns the ID of the most responsive server
	 */
	 function _getOCRServer() {
	 	var $dfd = $.Deferred();
	 	if (isFirefox) {
	 		browser.runtime.sendMessage({
	 			evt: 'get-best-server'
	 		}).then(function (response) {
	 			$dfd.resolve(response.server.id);
	 		});
	 	} else {
	 		browser.runtime.sendMessage({
	 			evt: 'get-best-server'
	 		}, function (response) {
	 			$dfd.resolve(response.server.id);
	 		});
	 	}
	 	return $dfd;
	 }

	/*
	 * Handles the AJAX POST calls to OCR API.
	 * Failover logic happens here!
	 */
	function _postToOCR($ocrPromise, postData, attempt, second_engine = false, third_engine = false) {
		if (_ocrCancelled) { $ocrPromise.reject({ type: 'cancelled', stat: 'Cancelled' }); return; }
		var formData = new FormData();
		OPTIONS && OPTIONS.useTableOcr && !third_engine && (formData.append('isTable', true));
		
		// Engine 1: send explicit language code; Engine 2+3: send 'auto' (API auto-detects)
		if (!second_engine && !third_engine && postData.language) {
			formData.append('language', postData.language);
		} else if (second_engine || third_engine) {
			formData.append('language', 'auto');
		}
		
		formData.append('file', postData.blob, postData.fileName);
		formData.append('OCREngine', third_engine ? "3" : (second_engine ? "2" : "1"));
		
		// Engine 3 returns no overlay data — do not request it
		if (OPTIONS.visualCopyTextOverlay && !third_engine) {
			formData.append('isOverlayRequired', true);
		}
		

		_getOCRServer().done(function (serverId) {
			if (_ocrCancelled) { $ocrPromise.reject({ type: 'cancelled', stat: 'Cancelled' }); return; }
			var startTime;
			var serverList = APPCONFIG.ocr_api_list;
			var maxAttempts = serverList.length;
			var ocrAPIInfo = $.grep(serverList, function (el) {
				return el.id === serverId;
			})[ 0 ];
			formData.append('apikey', ocrAPIInfo.ocr_api_key);
			attempt += 1;
			startTime = Date.now();
			_currentOcrXhr = $.ajax({
				url: ocrAPIInfo.ocr_api_url,
				data: formData,
				dataType: 'json',
				cache: false,
				contentType: false,
				processData: false,
				timeout: APPCONFIG.ocr_timeout,
				type: 'POST',
				success: function (data) {
					var result;
					data = data || {};
					// retry if any error condition is met and if any servers are still available
					if ((typeof data === 'string' ||
						// OCRExitCode = -10 corresponds to a parse error due to malformed/blurry image. Not the server's fault
						data.IsErroredOnProcessing ||
						data.OCRExitCode !== 1) && !_isImageParseError(data) &&
						attempt < maxAttempts) {
						// sometimes an error string is returned
					if (isFirefox) {
						browser.runtime.sendMessage({
							evt: 'set-server-responsetime',
							serverId: ocrAPIInfo.id,
							serverResponseTime: -1
						}).then(function () {
							OCRTranslator.setStatus('progress',
								'Retrying on server ' + (attempt + 1) + ' of ' + maxAttempts + '\u2026', true);
							formData = null;
							_postToOCR($ocrPromise, postData, attempt, second_engine, third_engine);
						});
					} else {
						browser.runtime.sendMessage({
							evt: 'set-server-responsetime',
							serverId: ocrAPIInfo.id,
							serverResponseTime: -1
						}, function () {
							OCRTranslator.setStatus('progress',
								'Retrying on server ' + (attempt + 1) + ' of ' + maxAttempts + '\u2026', true);
							formData = null;
							_postToOCR($ocrPromise, postData, attempt, second_engine, third_engine);
						});
					}
					return false;
				}
				if (typeof data === 'string') {
					$ocrPromise.reject({
						type: 'OCR',
						stat: 'OCR conversion failed',
						message: data,
						details: data,
						code: data
					});
				} else if (data.IsErroredOnProcessing) {
					$ocrPromise.reject({
						type: 'OCR',
						stat: 'OCR conversion failed',
						message: data.ErrorMessage,
						details: data.ErrorDetails,
						code: data.OCRExitCode
					});
				} else if (data.OCRExitCode === 1) {
					browser.runtime.sendMessage({
						evt: 'set-server-responsetime',
						serverId: ocrAPIInfo.id,
						serverResponseTime: (Date.now() - startTime) / 1000
					});
					var parsed = data.ParsedResults && data.ParsedResults[0];
					$ocrPromise.resolve(parsed ? parsed.ParsedText : '', parsed ? parsed.TextOverlay : null);
				} else {
					result = data.ParsedResults && data.ParsedResults[0];
					$ocrPromise.reject({
						type: 'OCR',
						stat: 'OCR conversion failed',
						message: result ? result.ErrorMessage : '',
						details: result ? result.ErrorDetails : '',
						code: result ? result.FileParseExitCode : data.OCRExitCode
					});
				}
			},
			error: function (x, t) {
				var errData;
				var stat;
				if (t === 'abort') {
					$ocrPromise.reject({ type: 'cancelled', stat: 'Cancelled' });
					return;
				}
				if (attempt < maxAttempts) {
					if (isFirefox) {
						browser.runtime.sendMessage({
							evt: 'set-server-responsetime',
							serverId: ocrAPIInfo.id,
							serverResponseTime: -1
						}).then(function () {
							OCRTranslator.setStatus('progress',
								'Retrying on server ' + (attempt + 1) + ' of ' + maxAttempts + '\u2026', true);
							formData = null;
							_postToOCR($ocrPromise, postData, attempt, second_engine, third_engine);
						});
					} else {
						browser.runtime.sendMessage({
							evt: 'set-server-responsetime',
							serverId: ocrAPIInfo.id,
							serverResponseTime: -1
						}, function () {
							OCRTranslator.setStatus('progress',
								'Retrying on server ' + (attempt + 1) + ' of ' + maxAttempts + '\u2026', true);
							formData = null;
							_postToOCR($ocrPromise, postData, attempt, second_engine, third_engine);
						});
					}
					return false;
				}
				try {
					errData = JSON.parse(x.responseText);
				} catch (e) {
					errData = '';
				}
				if (t === 'timeout') {
					stat = 'OCR request timed out';
				} else if (x.status === 404) {
					stat = 'OCR service is currently unavailable';
				} else if (t == 'error') {
						// Probably no internet connection or server is not reached...
						stat = 'No internet connection, or can not reach OCR server';
					} else {
						stat = 'An error occurred during OCR';
					}
					$ocrPromise.reject({
						type: 'OCR',
						stat: stat,
						message: stat,
						details: null,
						code: null,
						data: errData
					});
				}
			});
});
}


function fullViewAvailable(el) {
	var elementTop = $(el).offset().top;
	var elementBottom = elementTop + $(el).outerHeight();
	var viewportTop = $( "#copyfish-tab-image-container" ).scrollTop();
	var viewportBottom = viewportTop + $( "#copyfish-tab-image-container" ).height();
	let vl = ( elementBottom > viewportTop ) && ( elementTop < viewportBottom - $( el ).height());
	return vl;
}

function adjustHeightScreenCapture() {
	if (!fullViewAvailable($('#ocrext-can').get(0))) {
		$('#copyfish-tab-image-container').css({ 'height': '50%' });
	}
	else {
		$('#copyfish-tab-image-container').css({ 'height': 'auto' });
	}
}

	/*
	 * Responsible for:
	 * 1. Rolling up the canvas data into a form object along with API key and language
	 * 2. POST to OCR API
	 * 3. Handle response from OCR API and POST to Yandex translate
	 * 4. AJAX error handling anywhere in the pipeline
	 *
	 *
	 */

	 const _processOCRTranslate = (request={}) => {
		// var data = new FormData();
		var dataURI;
		var ocrPostData;
		var $ocr = $.Deferred();
		var $process = $.Deferred();
		var ocrStartTime = Date.now();
		var $canOrig = $('#ocrext-canOrig');
		let $capturedImage = $('.copyfish-image-view');
		var dims = {
			width: $canOrig.width(),
			height: $canOrig.height()
		};
		if ($canOrig.width() == 0 && $canOrig.height() == 0) {
			// probably we are on screencapture tab and element not visible.. so try to get from inline attribute
			let width = $canOrig.attr('width');
			let height = $canOrig.attr('height');
			if (width && height) {
				try {
					dims = {
						width: parseFloat(width),
						height: parseFloat(height)
					};
				}
				catch (err) {
				}
			}
		}
		// read options before every AJAX call, will ensure that any changes
		// in settings are transferred to existing sessions as well
		getOptions().done(function () {
			_setOCRFontSize();
			if (OPTIONS.ocrEngine != null) {
				//select Ocr Engine
				OcrEngine = OPTIONS.ocrEngine;
			}
			OCRTranslator.resetOverlayInformation();
			$process
			.done(function (fromCache) {
				$('.ocrext-btn').removeClass('disabled');
				var successMsg;
				if (fromCache) {
					successMsg = 'Text loaded';
				} else {
					var elapsedSec = ((Date.now() - ocrStartTime) / 1000).toFixed(2);
					successMsg = browser.i18n.getMessage('ocrSuccessStatus') + ' (' + elapsedSec + 's)';
				}
				OCRTranslator.setStatus('success', successMsg);
				OCRTranslator.enableContent();
			})
			.fail(function (err) {
					// All API failure handling is done here, the AJAX callbacks simply relay
					// necessary data to this callback
					$('.ocrext-btn').removeClass('disabled');
					if (err.type === 'cancelled') {
						_updateNanoTitle(); // restores nano text (or placeholder) and clears status
						OCRTranslator.enableContent();
						return;
					}
					OCRTranslator.setStatus('error', err.stat);
					// per spec, display OCR error messages inside OCR text field
					if (err.type === 'OCR') {
						$('.ocrext-ocr-message').val(err.message).trigger('ocrResultChanged');
					}
					OCRTranslator.enableContent();
					//console.error('Visual Copy Exception', err);
				})
			.always(function () {
					// dereference expensive objects, just in case
					// everything terminates with $process, single point of extry/exit
					dataURI = null;
					ocrPostData = null;
					$canOrig = null;
					$ocr = null;
					onOCRCopy(true)
				});
			$ocr
			.done(function (text, overlayInfo, opts = {}) {
				$('.ocrext-ocr-message')
				.val(text)
				.trigger('ocrResultChanged');
				$('#popup_support_text').text(text);
				_updateNanoTitle();
					// dataURI should be visible as it is encapsulated within _processOCRTranslate
					// the mad-world of async programming
					// OCRTranslator.textOverlay.setOverlayInformation(overlayInfo, dataURI);
					OCRTranslator.setOverlayInformation(overlayInfo, dataURI);
					if (OPTIONS.visualCopyTextOverlay) {
						let currentZoom = opts && request.forExternalTab && opts.currentZoomLevel || '';
						OCRTranslator.showOverlay(currentZoom);
					}
					$process.resolve(opts.fromCache || false);
				})
.fail(function (err) {
					//  receive error and relay it to $process
					$process.reject(err);
				});
if (
	(dims.width < OCR_LIMIT.min.width && dims.height < OCR_LIMIT.min.height) ||
	(dims.width > OCR_LIMIT.max.width && dims.height > OCR_LIMIT.max.height)
	) {
	$ocr.reject({
		type: 'OCR',
		stat: 'OCR conversion failed',
		message: OCR_DIMENSION_ERROR,
		details: null,
		code: null
	});
return false;
}

			// Disable widget, show spinner
			_ocrCancelled = false;
			_currentOcrXhr = null;
			OCRTranslator.disableContent();
			OCRTranslator.checkDesktopCaptureModule();
			OCRTranslator.setStatus('progress',
				browser.i18n.getMessage('ocrProgressStatus'), true);
			// POST to OCR.
			ocrPostData = {};
			ocrPostData.language = OPTIONS.visualCopyOCRLang;
			if (USE_JPEG) {
				dataURI = $canOrig.get(0).toDataURL('image/jpeg', JPEG_QUALITY);
				ocrPostData.fileName = 'ocr-file.jpg';
				dataURItoBlob(dataURI).then(function (url) {
					ocrPostData.blob = url;
					//check Ocr Engine
					if (OcrEngine === "OcrSpace") {
						_postToOCR($ocr, ocrPostData, 0);
					}else if (OcrEngine === "OcrLocal") {
						var ocrLang =   OPTIONS.visualCopyOCRLang;
						browser.runtime.sendMessage({
							evt: 'captureScreenLocalOcr',
							ocrLang:ocrLang,
							imagepath:dataURI
						}).then(function (response) {
							console.log(response)

						})
					}
					else if (OcrEngine === "OcrSpaceSecond") {
						_postToOCR($ocr, ocrPostData, 0, true);
					} else if (OcrEngine === "OcrSpaceThird") {
						_postToOCR($ocr, ocrPostData, 0, false, true);
					}
				});
			} else {
				dataURI = $canOrig.get(0).toDataURL();
				ocrPostData.fileName = 'ocr-file.png';
				dataURItoBlob(dataURI).then(function (url) {
					ocrPostData.blob = url;
					//check Ocr Engine
					if(request.ocrText && request.forExternalTab){
						return $ocr.resolve(request.ocrText, request.overlayInfo || '', { 
							translatedTextIfAny: request.translatedTextIfAny || '',
							currentZoomLevel   : request.currentZoomLevel || 0,
							fromCache          : true
						});
					}
					if (OcrEngine === "OcrSpace") {
						_postToOCR($ocr, ocrPostData, 0);

					} else if (OcrEngine === "OcrLocal") {
						var ocrLang =   OPTIONS.visualCopyOCRLang;
						browser.runtime.sendMessage({
							evt: 'captureScreenLocalOcr',
							ocrLang:ocrLang,
							imagepath:dataURI
						}).then(function (data) {
							console.log(data)
							var result;
							
							data = data.result || {};
							
							if (typeof data === 'string') {
								$ocr.reject({
									type: 'OCR',
									stat: 'OCR conversion failed',
									message: data,
									details: data,
									code: data
								});
							} else if (data.IsErroredOnProcessing) {
								$ocr.reject({
									type: 'OCR',
									stat: 'OCR conversion failed',
									message: data.ErrorMessage,
									details: data.ErrorDetails,
									code: data.OCRExitCode
								});
							} else if (!data.IsErroredOnProcessing || data.OCRExitCode === 0) {
								$ocr.resolve(data.ParsedResults[ 0 ].ParsedText, data.ParsedResults[ 0 ].TextOverlay);
							} else {
								result = 'OCRCommandLine stopped working';
								$ocr.reject({
									type: 'OCR',
									stat: 'OCR conversion failed',
									message: result.ErrorMessage,
									details: result.ErrorDetails,
									code: result.FileParseExitCode
								});
							}


						})
					}else if (OcrEngine === "OcrSpaceSecond") {
						_postToOCR($ocr, ocrPostData, 0, true);
					} else if (OcrEngine === "OcrSpaceThird") {
						_postToOCR($ocr, ocrPostData, 0, false, true);
					}
				});
			}
			/*
			 * $process::done can be called only if OCR and translation succeed
			 * $process::fail can be called if either OCR or translation fails
			 */
			});
}

/*Utility functions - end*/


/* Event handlers*/
	/*
	 * Mouse move event handler. Attached on mousedown and removed on mouseup
	 */
	 function onOCRMouseMove(e) {
	 	var l, t, w, h;
	 	var scrollTop = $('body').scrollTop();
	 	if (!scrollTop) {
			// some modern browser hack
			// Fix issue: https://github.com/teamdocs/copyfish2020/issues/4
			scrollTop = Math.max($("html").scrollTop(), $('body').scrollTop());
		}
		if (ISPOSITIONED) {
			endX = e.pageX - $('body').scrollLeft();
			endY = e.pageY - scrollTop;
			$SELECTOR.css({
				'position': 'fixed'
			});
		} else {
			endX = e.pageX;
			endY = e.pageY;
			$SELECTOR.css({
				'position': 'absolute'
			});
		}
		l = Math.min(startX, endX);
		t = Math.min(startY, endY);
		w = Math.abs(endX - startX);
		h = Math.abs(endY - startY);
		$SELECTOR.css({
			left: l,
			top: t,
			width: w,
			height: h
		});
		Mask.reposition({
			tl: [ l + SELECTOR_BORDER, t + SELECTOR_BORDER ],
			tr: [ l + w + SELECTOR_BORDER, t + SELECTOR_BORDER ],
			bl: [ l + SELECTOR_BORDER, t + h + SELECTOR_BORDER ],
			br: [ l + w + SELECTOR_BORDER, t + h + SELECTOR_BORDER ]
		});
	}
	/*
	 * mousedown event handler
	 * once mousedown occurs, selection starts. Captures the initial coords and adds the selector
	 * rectangle onto the page.
	 * Adds the mousemove and mouseup events
	 */
	 function onOCRMouseDown(e) {
	 	if (!IS_CAPTURED) {
	 		IS_CAPTURED = true;
	 	} else {
	 		return true;
	 	}
	 	var $body = $('body');
	 	$('.ocrext-mask p.ocrext-element').css('transform', 'scale(0,0)');
	 	$SELECTOR = $('<div class="ocrext-selector"></div>');
	 	$SELECTOR.appendTo($body);
	 	var scrollTop = $body.scrollTop();
	 	if (!scrollTop) {
			// some modern browser hack
			// Fix issue: https://github.com/teamdocs/copyfish2020/issues/4
			scrollTop = Math.max($("html").scrollTop(), $body.scrollTop());
		}
		if (ISPOSITIONED) {
			startX = e.pageX - $body.scrollLeft();
			startY = e.pageY - scrollTop;
			$SELECTOR.css({
				'position': 'fixed'
			});
		} else {
			startX = e.pageX;
			startY = e.pageY;
			$SELECTOR.css({
				'position': 'absolute'
			});
		}
		startCx = e.clientX;
		startCy = e.clientY;
		$SELECTOR.css({
			left: 0,
			top: 0,
			width: 0,
			height: 0,
			zIndex: MAX_ZINDEX - 1
		});
		$body.on('mousemove', onOCRMouseMove);
		// we need the closure here. `.one` would automagically remove the listener when done
		$body.one('mouseup', function (evt) {
			var $dialog;
			isImageParse = false;
			imageParseData = null;
			endCx = evt.clientX;
			endCy = evt.clientY;
			// turn off the mousemove event, we no longer need it
			$body.off('mousemove', onOCRMouseMove);
			// manipulate DOM to remove temporary cruft
			$body.removeClass('ocrext-ch');
			$SELECTOR.remove();
			Mask.hide();
			// show the widget
			_setZIndex();
			$dialog = $body.find('.ocrext-wrapper');
			/*
			https://github.com/teamdocs/copyfish2020/issues/9
			firefox causing issue and applying css and show at same time, show should be happend when css is applied completely so
			adding animate instead of css jquery method
			$dialog
				.css({
					// zIndex: MAX_ZINDEX,
					// opacity: 0,
					bottom: -$dialog.height()
				})
				.show();
				*/
				$dialog
				.animate({
					// zIndex: MAX_ZINDEX,
					// opacity: 0,
					bottom: -$dialog.height()
				}, 0, function () {
					$dialog.show();
				});
			// initiate image capture
			_captureImageOntoCanvas().done(function () {
				_processOCRTranslate();
			});
		});
	}

	/*
	 * Recapture + re-OCR: hides dialog, grabs a fresh screenshot, then processes.
	 */
	 function onOCRRedo() {
	 	$('.ocrext-wrapper').css('opacity', 0);
	 	OCRTranslator.reset();
		// timeout to ensure that a render is done before initiating next capture cycle
		setTimeout(function () {
			_captureImageOntoCanvas(isImageParse, imageParseData).done(function () {
				_processOCRTranslate();
				_setZIndex();
			});
		}, 20);
	}

	/*
	 * Re-OCR using the existing captured image — no recapture, no dialog flash.
	 * Used by the re-OCR button and engine switching.
	 */
	function onOCRReprocess() {
		OCRTranslator.reset();
		_processOCRTranslate();
	}

	function _updateNanoTitle() {
		var text = $('.ocrext-ocr-message').val() || '';
		var maxLen = 240;
		var $nanoTitle = $('.ocrext-nano-title');
		var html;
		if (text) {
			var truncated = text.length > maxLen ? text.substring(0, maxLen) + '\u2026' : text;
			html = truncated
				.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
				.replace(/\r\n|\r|\n/g, '<span class="ocrext-nl"> | </span>');
		} else {
			html = '<span class="ocrext-nano-placeholder">Nano mode \u2014 OCR result will appear here\u2026</span>';
		}
		$nanoTitle.html(html);
		// Only make the nano-title visible when actually in nano mode.
		// In full/minimised mode the CSS display:none rule is sufficient.
		if ($('.ocrext-wrapper').hasClass('ocrext-wrapper-nano')) {
			// Adaptive font: try big font with 1-line clamp; if text overflows
			// fall back to the normal (smaller) font with 2-line clamp.
			var BIG_SIZE = '16px', SMALL_SIZE = '13px';
			$nanoTitle.css({
				'display': '-webkit-box',
				'font-size': BIG_SIZE,
				'-webkit-line-clamp': '1'
			});
			var el = $nanoTitle[0];
			var fitsOneLine = el.scrollHeight <= el.clientHeight + 2;
			if (!fitsOneLine) {
				$nanoTitle.css({ 'font-size': SMALL_SIZE, '-webkit-line-clamp': '2' });
			}
			$('.ocrext-header-status, .ocrext-status').text('').removeClass('ocrext-success ocrext-error ocrext-progress');
		} else {
			// Ensure no leftover inline style that would override CSS display:none
			$nanoTitle.css('display', '');
		}
	}

	const onOcrDesktopRecapture = () => {
		browser.runtime.sendMessage({ evt: 'captureScreen' });
	};

	/*
	 * Recapture button click handler
	 * Hands control back to the user to recapture the viewport
	 */
	 function onOCRRecapture() {
	 	IS_CAPTURED = false;
	 	OCRTranslator.slideDown();
		// reset stuff
		OCRTranslator.reset();
		Mask.addToBody().show();
		$('body').addClass('ocrext-ch');
	}

	 function openGoogleTranslatePage() {
		getOptions().done(function () {// let the reload all option in real time..
			// update option in real time and do the stuff..
			let $textarea = $('textarea.ocrext-result').val();
			let translatedText = $textarea.split(' ').join('+');
			let userLang = navigator.language;
			let $text = `https://translate.google.com/?text=${encodeURI(translatedText)}&tl=${userLang}&langpair=auto|${userLang}&tbb=1`;
			//window.open($text, '_blank');
			//browser.windows.create({url: $text});
			browser.runtime.sendMessage({
				evt: 'open-window',
				url: $text,
			});
		});
	}

	function openDeeplTransatePage() {
		getOptions().done(function () { // let the reload all option in real time..
			let $textarea = $('textarea.ocrext-result').val();
			let translatedText = $textarea;
			let userLang = navigator.language;
			if (userLang.indexOf('-') !== -1) {
				userLang = userLang.split('-')[ 0 ] || userLang;
			}
			let $text = `https://www.deepl.com/en/translator#${userLang}/${userLang}/${encodeURIComponent(translatedText)}`;
			browser.runtime.sendMessage({
				evt: 'open-window',
				url: $text,
			});
		});
	}



	function onOCRClose(e) {
		e && e.stopPropagation();
		if (OCRTranslator.state === 'disabled') {
			return true;
		}
		$('.ocrext-wrapper').removeClass('ocrext-wrapper-minimized ocrext-wrapper-nano');
		$('.ocrext-nano-title').css('display', ''); // clear inline style from nano mode
		OCRTranslator.disable();
		browser.runtime.sendMessage({
			evt: 'capture-done'
		});
	}


	function fireCopy(text) {
		var copyDiv;
		copyDiv = document.createElement('div');
		copyDiv.contentEditable = true;
		copyDiv.style = "white-space:pre-wrap;"
		document.body.appendChild(copyDiv);
		copyDiv.textContent = text;
		copyDiv.unselectable = 'off';
		copyDiv.classList.add('copy-hidden');
		copyDiv.focus();
		document.execCommand('SelectAll');
		document.execCommand('Copy', false, null);
		document.body.removeChild(copyDiv);
		return true
	}
	const onOCRCopy = (translateAuto = false) => {
		/*Copy button click handler*/
		if (translateAuto && !OPTIONS.copyAfterProcess) {
			return false;
		}
		let messageTextArea = $('.ocrext-ocr-message');
		var message = messageTextArea.val();
		let activeTab = $('div[aria-selected="true"]');
		var text = null;
		let animatedText = translateAuto && typeof translateAuto=='object' ? (obj) => {
			let oldText = obj ? $(obj).text() : 'Copy to clipboard';
			let objElm = obj && $(obj) || $('.ocrext-ocr-copy');
			// Lock the button's current width before swapping text so the row never reflows.
			objElm.css('min-width', objElm.outerWidth() + 'px');
			objElm.text('Copied!');
			objElm.fadeOut(1000, function () {
				$(this).text(oldText).fadeIn(1500);
			});
		} : () => { };

		if (!translateAuto) {
			text = message;
		} else {
			switch (OPTIONS.copyType) {
				case 'Text':
				text = message;
				break;
				case 'Translation':
				text = '';
				break;
				default:
				text = message;
			}
		}
		if (activeTab.length === 0) {
			let isCopied = fireCopy(text);
			if (isCopied) {
				animatedText();
			}
		} else {
			let isCopied = fireCopy(text);
			if (isCopied) {
				animatedText();
			}
		}
	}


	/*
	 * @module: OCRTranslator
	 * The main translator module. Simple module pattern, no fancy constructors or factories
	 */

	 var OCRTranslator = {
		/*
		 * Pseudo constructor
		 * init: load resources and bind runtime listener, once the $ready deferred
		 * resolves, render HTML on 'enableselection' event
		 * Nothing gets rendered until the user presses the browserAction atleast
		 * once within a tab. Only listeners get added and these simply bubble up
		 * (delegated to body)
		 */

		 init: function () {
			// get config information
			var self = this;
			this._initializing = true;
			this._initialized = false;
			let $readyMsgDialog = _bootStrapMessageDialog()
			$ready = _bootStrapResources();
			// listen to runtime messages from other pages, mainly the background page
			browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
				if (sender.tab) {
					return true;
				}
				if (request.evt === 'isavailable') {
					if (self._initialized) {
						sendResponse({
							farewell: 'isavailable:OK'
						});
					} else {
						// if not yet initialized and body is still unavailable, reject
						if (!$('body').length) {
							sendResponse({
								farewell: 'isavailable:FAIL'
							});
						} else {
							$ready.done(function () {
								$readyMsgDialog.done(function(){
									self._initialize();
									sendResponse({
										farewell: 'isavailable:OK'
									});
								});
							});
						}
					}
					return true;
				}
				if (request.evt === 'enableselection') {
					// enable only if resources are loaded and available
					$ready.done(function () {
						OCRTranslator.enable();
					});
					// ACK back
					sendResponse({
						farewell: 'enableselection:OK'
					});
				} else if (request.evt === "disableselection") {
					if (OCRTranslator.state === 'disabled') {
						return true;
					}
					$ready.done(function () {
						OCRTranslator.disable();
					});
				} else if (request.evt === "translateCapturedImage") {
					this.textOverlay = TextOverlay();
					isImageParse = true;
					imageParseData = request.data;
					imagePath = request.imagepath;
					if (OCRTranslator.state !== 'enabled') this.bindEvents();
					OCRTranslator.state = 'enabled';
					// check do we have already captured and ocr the use old data instead of new
					_captureImageOntoCanvas(true, request.data).done(function () {
						_processOCRTranslate(request);
					});
				} else if (request.evt === 'image_for_parse') {
					isImageParse = true;
					imageParseData = request.data;
					let $body = $('body');
					var $dialog;
					// manipulate DOM to remove temporary cruft
					$body.removeClass('ocrext-ch');
					// turn off the mousemove event, we no longer need it
					$body.off('mousemove', onOCRMouseMove);
					Mask.hide();
					// show the widget
					_setZIndex();
					$dialog = $body.find('.ocrext-wrapper');

					// $dialog
					// 	.css({
					// 		// zIndex: MAX_ZINDEX,
					// 		// opacity: 0,
					// 		bottom: -$dialog.height()
					// 	})
					// 	.show();
					$dialog
					.animate({
							// zIndex: MAX_ZINDEX,
							// opacity: 0,
							bottom: -$dialog.height()
						}, 0, function () {
							$dialog.show();
						});
					// initiate image capture
					_captureImageOntoCanvas(true, request.data).done(function () {
						_processOCRTranslate();
					});
				}
				else if (request.evt == 'show-message-dialog-native-app'){
					let self = this;
					// _bootStrapMessageDialog().then(function () {
					// 	self.showNativeAppSupportMeessage();
					// }, function (err) {
					// 	console.log(err);
					// });
					self.showNativeAppSupportMeessage();
					sendResponse({
						farewell: 'OK'
					});
				}
				else if (request.evt == 'show-message-dialog') {
					let self = this;
					let message = browser.i18n.getMessage('captureNotAvailable');
					let buttons = [
					{
						label: 'Take Desktop Screenshot',
						cb: () => {
							dialogOverlay.hardClose();
							browser.runtime.sendMessage({
								evt: 'captureScreen'
							});
						}
					},
					{
						label: 'Try again Web Screenshot',
						cb: () => {
							dialogOverlay.closeDialog();
							browser.runtime.sendMessage({
								evt: 'activate'
							});
						}
					},
					{
						label: 'Cancel',
						cb: () => { dialogOverlay.closeDialog(); }
					}
					];
					dialogOverlay.showDialog('Copyfish', message, buttons);
				}
				else if (request.evt == 'show-warning' && request.data) {
					let buttons = [
					{
						label: 'Ok',
						cb: () => { dialogOverlay.closeDialog(); }
					}
					];
					dialogOverlay.hardClose();
					setTimeout(function () {
						dialogOverlay.showDialog('Copyfish', request.data, buttons);
					}, 1000);
					sendResponse({
						farewell: 'OK'
					});
				}
				else if (request.evt == 'captureClipboard') {
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
								});
								return;
							}
						}
						browser.runtime.sendMessage({ evt: 'show-warning-message', data: { message: 'No image in clipboard' } });
					}).catch(function () {
						browser.runtime.sendMessage({ evt: 'show-warning-message', data: { message: 'No image in clipboard' } });
					});
				}
				else if (request.evt == 'captureClipboardChrome') {
					let imgSrcRegex = /<img[^>]+src="([^">]+)"/g;
					let copyDiv = document.createElement('div');
					copyDiv.style.width = '1px';
					copyDiv.style.height = '1px';
					copyDiv.style.opacity = 0;
					copyDiv.contentEditable = true;
					copyDiv.classList.add('copy-hidden');

					document.body.appendChild(copyDiv);
					copyDiv.focus();
					document.execCommand("paste");
					let imageContent = copyDiv.innerHTML;
					copyDiv.remove();
					let src = imgSrcRegex.exec(imageContent);
					sendResponse(src);

				}else if (request.evt === "getDevicePixelRatio") {
					sendResponse(devicePixelRatio);					
				}
			});
$(document).ready(function () {
	if (!self._initialized && !self._initializing) {
		$ready.done(function () {
			self._initialize();
		});
	}
});
return this;
},
showNativeAppSupportMeessage: function () {
	let buttons = [
	{
		label: 'Download the helper app',
		cb: () => {
			dialogOverlay.closeDialog();
			window.open('https://ui.vision/rpa/x/download','_blank');
		}
	},
	{
		label: 'Read more',
		cb: () => {
			dialogOverlay.closeDialog();
			window.open('https://ocr.space/rd/copyfish?help=desktop','_blank');
		}
	},
	{
		label: 'Cancel',
		cb: () => { dialogOverlay.closeDialog(); }
	}
	];
	let message = browser.i18n.getMessage('nativeAppNotSupported');
	if ($('#cfish-popup-message-dialog').length) 
	{
		dialogOverlay.showDialog('Copyfish', message, buttons);
		return;
	}
},
_initialize: function () {
			// kind of like using a lock
			this._initializing = false;
			this._initialized = true;
			ISPOSITIONED = [ 'absolute', 'relative', 'fixed' ].indexOf($('body').css('position')) >= 0;
			this.initWidgets();
			this.bindEvents();
			this.addIconToTranslateButton();
			// tell the background page that the tab is ready
			browser.runtime.sendMessage({
				evt: 'ready'
			});
		},


		addIconToTranslateButton: function () {
			let $translateButtonImg = $('#popup_translate_button');
			$translateButtonImg.html(`<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="32pt" height="32pt" viewBox="0 0 64.000000 64.000000" preserveAspectRatio="xMidYMid meet"><g transform="translate(0.000000,64.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">
				<path d="M10 611 c-13 -25 -13 -450 0 -471 7 -12 40 -16 152 -20 l143 -5 19 -53 19 -52 138 0 c126 0 139 2 149 19 13 25 13 450 0 471 -7 12 -40 16 -151 20 l-142 5 -17 50 -17 50 -141 3 c-131 2 -142 1 -152 -17z m344 -229 c42 -125 76 -230 76 -235 0 -8 -361 -10 -384 -1 -14 5 -16 35 -16 229 0 169 3 225 13 228 6 3 62 6 124 6 l111 1 76 -228z m256 99 c6 -12 10 -100 10 -216 0 -116 -4 -204 -10 -216 -10 -17 -22 -19 -122 -19 l-112 0 47 48 c46 47 46 48 35 85 -9 28 -9 40 0 49 9 9 20 4 47 -22 45 -44 59 -30 15 15 l-34 35 24 45 c13 24 32 46 42 48 35 10 18 27 -27 27 -33 0 -45 4 -45 15 0 8 -4 15 -10 15 -5 0 -10 -7 -10 -15 0 -10 -10 -15 -34 -15 -33 0 -35 2 -55 62 -12 34 -21 66 -21 70 0 4 56 8 125 8 113 0 125 -2 135 -19z m-110 -156 c0 -2 -5 -16 -12 -30 -13 -29 -26 -32 -35 -9 -3 9 -13 14 -24 11 -11 -3 -19 2 -22 14 -5 17 1 19 44 19 27 0 49 -2 49 -5z m-50 -81 c0 -8 -4 -14 -10 -14 -5 0 -10 4 -10 9 0 5 -3 18 -7 28 -6 16 -5 16 10 4 9 -7 17 -20 17 -27z"/>
				</g>
				</svg>`);
			let $translateButtonDeeplImg = $('#deepl_translate_button');
			$translateButtonDeeplImg.html(`<svg xmlns="http://www.w3.org/2000/svg" version="1.0" width="30pt" height="30pt" viewBox="0 0 128.000000 128.000000" preserveAspectRatio="xMidYMid meet" ><g transform="translate(0.000000,128.000000) scale(0.100000,-0.100000)" fill="#000000" stroke="none">
				<path d="M393 1142 c-110 -64 -211 -126 -222 -136 -20 -18 -21 -28 -21 -291 0 -318 -17 -277 155 -375 61 -35 210 -121 332 -191 122 -71 226 -129 232 -129 7 0 11 45 11 138 l0 137 110 63 c61 35 115 72 120 82 6 11 10 126 10 280 0 257 0 261 -22 283 -13 12 -115 75 -229 140 -156 89 -213 117 -240 116 -25 0 -88 -32 -236 -117z m155 -184 c12 -12 22 -33 22 -47 1 -22 15 -34 100 -82 65 -37 103 -53 112 -48 27 17 78 10 103 -16 35 -34 33 -78 -5 -117 -26 -25 -36 -29 -62 -24 -41 8 -66 32 -76 70 -7 25 -24 40 -98 83 -83 49 -92 52 -139 47 -42 -5 -54 -2 -72 15 -30 29 -38 63 -21 97 26 56 89 65 136 22z m162 -343 c0 -5 -32 -28 -70 -49 -56 -32 -70 -45 -70 -63 0 -61 -96 -97 -140 -53 -65 65 -3 169 84 140 31 -10 39 -7 102 29 62 36 69 38 81 23 7 -9 12 -21 13 -27z"></path>
				</g>
				</svg>`);
		},

		initWidgets: function () {
			$('body').append(HTMLSTRCOPY);
			if (OPTIONS.status.toLowerCase() === 'free plan') {
				$('.ocrext-title span').text(appName);
			} else {
				$('.ocrext-title span').text(appName + " " + OPTIONS.status);
			}
			// set paragraph font
			_setLanguageOnUI();
			// set OCR font size
			_setOCRFontSize();
			// draw OCR engine selector
			_drawEngineSelector();
			// upgrade buttons
			$('button.ocrext-btn').each(function (i, el) {
				componentHandler.upgradeElement(el);
			});
			// upgrade spinner
			componentHandler.upgradeElement($('.ocrext-spinner').get(0));
		},

		/*
		 * Bind listeners for interactive elements exposed to user
		 * click - redo ocr, recapture, close, copy-to-clipboard
		 */
		 bindEvents: function () {
		 	var $body = $('body');
		 	let $translateButton = $('#popup_translate_button');
		 	let $translateButtonDeepl = $('#deepl_translate_button');
		 	var self = this;
		 	$translateButtonDeepl
		 	.on('click', $translateButtonDeepl, openDeeplTransatePage);
		 	$translateButton
		 	.on('click', $translateButton, openGoogleTranslatePage);
		 	$body
		 	.on('dblclick', '.ocrext-textoverlay-container', function () {
		 		if ($('#ocrext-can').parents('.ocrext-content').hasClass('ocrext-disabled')) {
		 			return true;
		 		}
		 		if (OPTIONS.visualCopyTextOverlay) {
		 			self.showOverlayTab();
		 		} else {
		 			window.alert('Please enable the "Show Text Overlay" option to view text overlays.');
		 		}
		 	})
		 	.on('dblclick', '#ocrext-can', function () {
		 		if ($(this).parents('.ocrext-content').hasClass('ocrext-disabled')) {
		 			return true;
		 		}
		 		if (OPTIONS.visualCopyTextOverlay) {
		 			self.showOverlayTab();
		 		} else {
		 			window.alert('Please enable the "Show Text Overlay" option to view text overlays.');
		 		}
		 	})
		 	.on('click', '.ocrext-cancel-ocr', function (e) {
		 		e.stopImmediatePropagation();
		 		e.preventDefault();
		 		_ocrCancelled = true;
		 		if (_currentOcrXhr) {
		 			_currentOcrXhr.abort();
		 			_currentOcrXhr = null;
		 		}
		 	})
		 	.on('click', '.ocrext-ocr-recapture', onOCRRecapture)
		 	.on('click', '.ocrext-ocr-sendocr', onOCRRedo)
		 	.on('click', '.ocrext-ocr-desktop-recapture', onOcrDesktopRecapture)
		 	.on('click', '.ocrext-closeToolbar-link', onOCRClose)
		 	.on('click', '.ocrext-ocr-copy', onOCRCopy)
		 	.on('click', '.ocrext-engine-btn', function (e) {
		 		e.stopPropagation();
		 		var $panel = $(this).siblings('.ocrext-engine-panel');
		 		var isOpen = $panel.hasClass('open');
		 		$('.ocrext-engine-panel').removeClass('open');
		 		if (!isOpen) { $panel.addClass('open'); }
		 	})
		 	.on('click', '.ocrext-engine-item', function (e) {
		 		e.stopPropagation();
		 		if ($(this).hasClass('disabled')) return;
		 		var newEngine = $(this).data('engine');
		 		$('.ocrext-engine-panel').removeClass('open');
		 		setOptions({ ocrEngine: newEngine }).done(function () {
		 			OcrEngine = OPTIONS.ocrEngine;
		 			_drawEngineSelector();
		 			_setLanguageOnUI();
		 			onOCRReprocess();
		 		});
		 	})
		 	.on('click', function (e) {
		 		// close engine dropdown if clicking outside
		 		if (!$(e.target).closest('.ocrext-engine-dropdown').length) {
		 			$('.ocrext-engine-panel').removeClass('open');
		 		}
		 	})
		 	.on('click', 'header.ocrext-header', function () {
		 		/*click handler for header — cycles: full → minimized → nano → full*/
		 		var $wrapper = $('.ocrext-wrapper');
		 		if ($wrapper.hasClass('ocrext-wrapper-nano')) {
		 			// stage 3 → stage 1: full — clear nano-title inline style so CSS display:none wins
		 			$wrapper.removeClass('ocrext-wrapper-minimized ocrext-wrapper-nano');
		 			$('.ocrext-nano-title').css('display', '');
		 		} else if ($wrapper.hasClass('ocrext-wrapper-minimized')) {
		 			// stage 2 → stage 3: nano (header + buttons only)
		 			$wrapper.addClass('ocrext-wrapper-nano');
		 			_updateNanoTitle();
		 		} else {
		 			// stage 1 → stage 2: minimized
		 			$wrapper.addClass('ocrext-wrapper-minimized');
		 		}
		 	})
		 	.on('click', '.ocrext-settings-link', function (e) {
		 		/*Settings  (gear icon) click handler*/
		 		e.stopPropagation();
		 		browser.runtime.sendMessage({
		 			evt: 'open-settings'
		 		});
		 	}).on('click', 'a.ocrext-open-tab-link, .ocrext-textoverlay-container', function (e) {
		 		e.stopPropagation();
		 		let $canvas = $('#ocrext-can');
		 		let $canvasOrig = $('#ocrext-canOrig');
		 		browser.runtime.sendMessage({
		 			evt: 'imageOcrInTab',
		 			ocrText: $('.ocrext-ocr-message').val(),
		 			overlayInfo: self._overlay || '',
		 			data: $('#ocrext-can').get(0).toDataURL(),
		 			translatedTextIfAny: '',
		 			currentZoomLevel: $canvas.width() / $canvasOrig.width(),
		 		});
		 	});
		 	/*ESC handler. */
		 	$(document).on('keyup', function (e) {
		 		if (e.keyCode === 27) {
		 			onOCRClose();
		 		}
		 	});
		 	return this;
		 },

		/*
		 * Enable selection within the viewport. Render the HTML if it does not already exist
		 * Why render again? Some rogue pages might empty the entire HTML content for some reason
		 */
		 enable: function () {
		 	var $body = $('body');
			/* check again before enabling selection. If the page has decided to empty body and
			 * rerender, the extension code will also be lost
			 */
			 if (!$body.find('.ocrext-wrapper').length) {
			 	$body.append(HTMLSTRCOPY);
			 }
			 $body.addClass('ocrext-overlay ocrext-ch')
			 .find('.ocrext-wrapper')
			 .hide();
			 if (OPTIONS.status.toLowerCase() === 'free plan') {
			 	$('.ocrext-title span').text(appName);
			 } else {
			 	$('.ocrext-title span').text(appName + " " + OPTIONS.status);
			 }
			 OCRTranslator.reset();
			// show mask
			Mask.addToBody().show();
			// instantiate overlay
			this.textOverlay = TextOverlay();
			$body.on('mousedown', onOCRMouseDown);
			OCRTranslator.state = 'enabled';
			return this;
		},

		/*
		 * Hide the widget. Does not destroy/recreate, the widget size isn't big enough
		 * to adversely impact page weight
		 */
		 disable: function () {
		 	var $body = $('body');
		 	try {
		 		$body.removeClass('ocrext-overlay ocrext-ch')
		 		.find('.ocrext-wrapper')
		 		.hide();
		 		$body.off('mousedown', onOCRMouseDown);
		 		OCRTranslator.state = 'disabled';
		 		Mask.remove();
		 		OCRTranslator.reset();
		 		IS_CAPTURED = false;
		 	} catch (e) {
		 		console.log(e)
		 	}
		 	return this;
		 },

		// reset anything that requires resetting
		reset: function () {
			$('.ocrext-header-status, .ocrext-status').text('').removeClass('ocrext-success ocrext-error ocrext-progress');
			$('.ocrext-nano-title').html('');
			$('.ocrext-result').text('N/A');
			$('.ocrext-result').attr({
				title: ''
			});
			if (this.textOverlay) {
				this.resetOverlay();
			}
			return this;
		},
		// spinner logic
		enableContent: function () {
			$('.ocrext-spinner').removeClass('is-active');
			$('.ocrext-content').removeClass('ocrext-disabled');
			$('.ocrext-btn-container .ocrext-btn:not(".ocrext-ocr-desktop-recapture")').removeClass('disabled').removeAttr('disabled');
			$('.ocrext-cancel-ocr').hide();
			return this;
		},
		// spinner logic
		disableContent: function () {
			$('.ocrext-spinner').addClass('is-active');
			$('.ocrext-content').addClass('ocrext-disabled');
			$('.ocrext-btn-container .ocrext-btn').addClass('disabled').attr('disabled', 'disabled');
			$('.ocrext-cancel-ocr').show();
			return this;
		},
		checkDesktopCaptureModule: () => {
			if (isFirefox) {
				browser.runtime.sendMessage({ evt: "checkDesktopCaptureSoftware" }).then(function (response) {
					if (response) $('.ocrext-ocr-desktop-recapture').removeClass('disabled').removeAttr('disabled');
				});
			} else {
				browser.runtime.sendMessage({ evt: "checkDesktopCaptureSoftware" }, function (response) {
					if (response) $('.ocrext-ocr-desktop-recapture').removeClass('disabled').removeAttr('disabled');
				});
			}
		},
		// Utility to set the status - progress, error and success are supported
		// pass noAutoClose as true if the status message must be persisted beyond 10s
		/*
			https://github.com/teamdocs/copyfish2020/issues/9
			firefox causing issue and applying css and show at same time, show should be happend when css is applied completely so
			adding animate instead of css jquery method
			$dialog.css({
				bottom: -$dialog.height()
			});
			*/

			setStatus: function (status, txt, noAutoClose) {
				if (status === 'error') {
					$('.ocrext-content').addClass('ocrext-error');
				} else {
					$('.ocrext-content').removeClass('ocrext-error');
				}
				var isNano = $('.ocrext-wrapper').hasClass('ocrext-wrapper-nano');
				// In nano mode on success: skip the success message, show OCR text immediately
				if (status === 'success' && isNano) {
					_updateNanoTitle();
					return;
				}
				// Hide nano-title and clear any leftover inline style in ALL modes so that
				// a mid-OCR switch into nano never causes a 50/50 flex split.
				$('.ocrext-nano-title').css('display', 'none').html('');
				var statusClass = status === 'error' ? 'ocrext-error' :
					(status === 'success' ? 'ocrext-success' : 'ocrext-progress');
				// Write to the overlay-dialog title bar element AND to the legacy
				// .ocrext-status element used by screencapture.html / ocrlocal.html
				$('.ocrext-header-status, .ocrext-status')
				.removeClass('ocrext-success ocrext-error ocrext-progress')
				.addClass(statusClass)
				.text(txt);
				if (!noAutoClose) {
					setTimeout(function () {
						$('.ocrext-header-status, .ocrext-status').text('').removeClass('ocrext-success ocrext-error ocrext-progress');
					}, 10000);
				}
			},
			slideDown: function () {
				var $dialog = $('.ocrext-wrapper');
				$dialog.animate({
					bottom: -$dialog.height()
				});
			},
			slideUp: function () {
				$('.ocrext-wrapper').css('bottom', WIDGETBOTTOM);
			},
			setOverlayInformation: function (overlay, imgDataURI) {
				this._overlay = overlay;
			// this._imgDataURI = imgDataURI;
		},
		resetOverlayInformation: function () {
			this._overlay = null;
			// this._imgDataURI = null;
		},
		showOverlay: function (customZoom) {
			var $canvas = $('#ocrext-can');
			var $canvasOrig = $('#ocrext-canOrig');
			this.textOverlay
			.setOverlayInformation(this._overlay, $canvas.width(), $canvas.height(), null, customZoom ? customZoom : $canvas.width() / $canvasOrig.width())
			.show();
		},
		showOverlayTab: function () {
			var $canvas = $('#ocrext-can');
			browser.runtime.sendMessage({
				evt: 'imageOcrInTab',
				data: $canvas.get(0).toDataURL()
			});
			//old overlay tab code
			// browser.runtime.sendMessage({
			// 	evt: 'show-overlay-tab',
			// 	overlayInfo: this._overlay,
			// 	imgDataURI: $canvas.get(0).toDataURL(),
			// 	canWidth: $canvas.width(),
			// 	canHeight: $canvas.height(),
			// 	zoom: $canvas.width() / $canvasOrig.width()
			// }, function () {
			// 	/*	 done */
			// });
		},
		hideOverlay: function () {
			this.textOverlay.hide();
		},
		resetOverlay: function () {
			this.textOverlay.reset().hide();
		}
	};
	getOptions().done(function () {
		$('body').on("keydown", function (e) {
			if (e.ctrlKey && e.shiftKey) {
				if (e.keyCode === OPTIONS.openGrabbingScreenHotkey) {
					browser.runtime.sendMessage({
						evt: 'activate'
					});
					e.stopPropagation();
					e.preventDefault();
					return false;
				} else if (e.keyCode === OPTIONS.closePanelHotkey) {
					$(".ocrext-closeToolbar-link").click();
					e.stopPropagation();
					e.preventDefault();
					return false;
				} else if (e.keyCode === OPTIONS.copyTextHotkey) {
					$(".ocrext-ocr-copy").click();
					e.stopPropagation();
					e.preventDefault();
					return false;
				}
			}
		});
	});
	OCRTranslator.init();
}(jQuery));
