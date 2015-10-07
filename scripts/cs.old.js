(function() {
	'use strict';
	var lang = 'english';
	var startX, startY, endX, endY;
	var $can;
	var ctx;
	var $dialog;

	var $body = $('body');
	var $selector;
	var IS_CAPTURED = false;
	var YANDEX_API_KEY = 'trnsl.1.1.20150922T105455Z.99470f3e9ce906c3.cf17b4ce52b7a2e61e94b84ad439cb9afe0bee9a';


	function onOCRMouseDown(e) {
		if (!IS_CAPTURED) {
			IS_CAPTURED = true;
		} else {
			return true;
		}

		$selector = $('<div class="ocrext-selector"></div>');
		$selector.appendTo($body);
		startX = e.pageX;
		startY = e.pageY;

		$selector.css({
			left: 0,
			top: 0,
			width: 0,
			height: 0,
			zIndex:Number.MAX_SAFE_INTEGER - 8
		});

		$body.on('mousemove', function(e) {
			endX = e.pageX;
			endY = e.pageY;
			$selector.css({
				left: Math.min(startX, endX),
				top: Math.min(startY, endY),
				width: Math.abs(endX - startX),
				height: Math.abs(endY - startY)
			});
		});
		$body.one('mouseup', function(e) {
			var htmlContent,
				// these are page coords
				X1 = startX,
				Y1 = startY,
				X2 = e.pageX,
				Y2 = e.pageY;
			startX = startX - window.scrollX;
			startY = startY - window.scrollY;
			endX = X2 - window.scrollX;
			endY = Y2 - window.scrollY;
			$body.off('mousemove');
			$body.removeClass('ocrext-ch');
			$selector.remove();
			$.get(chrome.extension.getURL('/dialog.html'), function(data) {
				$dialog = $(data);
				var $dfd = $.Deferred();
				var img = new Image;
				$dialog.css({
					left: Math.min(X1, X2),
					top: Math.max(Y1, Y2),
					width: Math.abs(X2 - X1),
					zIndex: Number.MAX_SAFE_INTEGER - 8
				});
				$body.append($dialog);

				chrome.runtime.sendMessage({
					evt: 'capture-screen'
				}, function(response) {
					var $dfd = $.Deferred();
					var img = new Image;
					img.onload = function() {
						$dfd.resolve();
					};
					img.src = response.dataURL;
					$dfd.done(function() {
						var sx, sy, width, height;
						sx = Math.min(startX, endX);
						sy = Math.min(startY, endY);
						width = Math.abs(endX - startX);
						height = Math.abs(endY - startY);
						$can = $('#ocrext-can');
						$can.attr({
							width: width,
							height: height
						});
						ctx = $can.get(0).getContext('2d');
						ctx.drawImage(img, sx, sy, width, height, 0, 0, width, height); // Or at whatever offset you like
					});
				});
			});
		});
	}

	var makeSelectable = function makeSelectable() {
		$body.addClass('ocrext-ch');
		$body.on('mousedown', onOCRMouseDown);
	}

	function dataURItoBlob(dataURI) {
		// convert base64/URLEncoded data component to raw binary data held in a string
		var byteString;
		if (dataURI.split(',')[0].indexOf('base64') >= 0)
			byteString = atob(dataURI.split(',')[1]);
		else
			byteString = unescape(dataURI.split(',')[1]);

		// separate out the mime component
		var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

		// write the bytes of the string to a typed array
		var ia = new Uint8Array(byteString.length);
		for (var i = 0; i < byteString.length; i++) {
			ia[i] = byteString.charCodeAt(i);
		}

		return new Blob([ia], {
			type: mimeString
		});
	}

	function onClose(e) {
		if(!$body){
			return true;
		}
		$body.removeClass('ocrext-overlay');
		$body.off('mousedown', onOCRMouseDown);
		if ($dialog) {
			$dialog.empty().remove();
		}
		if ($selector) {
			$selector.empty().remove();
		}
		$body.off('click', '.ocrext-ocr-sendocr');
		$body.off('click', '.ocrext-ocr-recapture');
		$body.off('click', '.ocrext-ocr-copy');
		$body.off('click', '.ocrext-ocr-close');

		$body = $selector  = $can = ctx = null;
		chrome.runtime.sendMessage({
			evt: 'capture-done'
		}, function(resp) {

		});
	}

	$body.addClass('ocrext-overlay');

	$body.on('click', '.ocrext-ocr-recapture', function() {
		IS_CAPTURED = false;
		$dialog.remove();
		makeSelectable();
	});

	$body.on('click', '.ocrext-ocr-sendocr', function() {
		var f = $('.ocr-fl')[0];
		var data = new FormData();
		data.append('apikey', 'helloworld');
		data.append('language', $('#ocrext-lang').val());
		// data.append('file', f.files[0], f.files[0].name)
		var duri = $can.get(0).toDataURL();
		data.append('file', dataURItoBlob(duri), 'ocr-file.png');
		var $ocr = $.Deferred();


		$('.ocrext-status')
			.removeClass('success error progress')
			.addClass('progress')
			.text('OCR conversion in progress ...');
		$('.ocrext-btn').addClass('disabled');
		$.ajax({
			url: 'https://ocr.a9t9.com/api/Parse/Image',
			data: data,
			dataType: 'json',
			cache: false,
			contentType: false,
			processData: false,
			type: 'POST',
			success: function(data) {
				data = data || {};
				if (data.IsErroredOnProcessing) {
					$ocr.reject(data.ErrorMessage);
				} else if (data.OCRExitCode === 1) {
					$ocr.resolve(data.ParsedResults[0].ParsedText)
				} else {
					$ocr.reject('Failed');
				}
			},
			failure: function() {
				$ocr.reject();
			}
		});

		$ocr.done(function(text) {
			$('.ocrext-ocr-message').text(text);
			$('.ocrext-status')
				.removeClass('success error progress')
				.addClass('progress')
				.text('Translation in progress ...');
			$.ajax({
				url: 'https://translate.yandex.net/api/v1.5/tr.json/translate',
				data: {
					key: YANDEX_API_KEY,
					lang: 'en',
					text: text
				},
				type: 'GET',
				success: function(data) {
					if (data.code === 200) {
						$('.ocrext-ocr-translated').text(data.text);
						$('.ocrext-btn').removeClass('disabled');
						$('.ocrext-status')
							.removeClass('success error progress')
							.addClass('success')
							.text('Translation successful.');
					}
				},
				failure: function(err) {
					$('.ocrext-btn').removeClass('disabled');
					$('.ocrext-status')
						.removeClass('success error progress')
						.addClass('error')
						.text('Translation failed');
					console.error('Translation failed', err);
				}
			});
		}).fail(function(msg) {
			$('.ocrext-btn').removeClass('disabled');
			$('.ocrext-status')
				.removeClass('success error progress')
				.addClass('error')
				.text('OCR conversion failed');
			console.error('OCR conversion failed', msg);
		});
	});

	$body.on('click', '.ocrext-ocr-close', onClose);
	$(document).on('keyup', function(e) {
		if (e.keyCode == 27) {
			onClose();
		}
	});

	$body.on('click', '.ocrext-ocr-copy', function() {
		chrome.runtime.sendMessage({
			evt: 'copy',
			text: $('.ocrext-ocr-translated').text()
		})
	});

	makeSelectable();
	// handle incoming messages
	chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
		sendResponse({
			farewell: 'OK'
		})
	});
}());