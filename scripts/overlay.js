window.browser = (function () {
	return window.msBrowser ||
		window.browser ||
		window.chrome;
})();

//let isFirefox = typeof InstallTrigger !== 'undefined';
(function () {
	'use strict';
	const htmlDialog = function () {
		const allMethod = {
			init: function () {
				let self = this;
				$('body').off('click', '[popup-close]');
				$('body').off('click', '.cp-dialog-close-button,.cp-dialog-popup');
				$('body').on('click', '[popup-close]', function () {
					var popup_name = $(this).attr('popup-close');
					$('[popup-name="' + popup_name + '"]').fadeOut(300);
				});
				// Close Popup When Click Outside
				$('body').on('click', '.cp-dialog-close-button', function () {
					var popup_name = $(this).find('[popup-close]').attr('popup-close');
					$('[popup-name="' + popup_name + '"]').fadeOut(300);
					$(this).children().click(function () {
						return false;
					});
				});
				$(document).on('keyup', function (e) {
					if (e.keyCode === 27) {
						self.closeDialog();
					}
				});
				$('body').attr('data-ocrext-dialog',1);
			},
			closeDialog: function(){
				$('#cfish-popup-message-dialog').fadeOut(300);
			},
			hardClose:function(){
				$('#cfish-popup-message-dialog').hide();
			},
			showDialog: function (header,message, buttons) {
				let buttonHtml = '';
				//this.hardClose();
				buttons && buttons.forEach((single,i) => {
					let { label = '', cb = () => { } } = single;
					let buttonId = 'cfish-' + i + (Date.now());
					let btn = '<span><button id="' + buttonId + '" class="cp-show-dialog-button ocrext-btn mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent" title="">' + label + '</button></span>';
					buttonHtml += btn;
					if ($('#' + buttonId).length) {
						$('#' + buttonId).remove();
					}
					$('body').off('click', '#' + buttonId);
					$('body').on('click', '#' + buttonId, cb);
				});
				$('#cp-dialog-title').html('');
				$('#cp-dialog-description').html('');
				$('#cp-dialog-image').attr('src', browser.runtime.getURL("images/copyfish-32.png"));
				$('#cp-dialog-title').html(header);
				$('#cp-dialog-description').html(message);
				buttonHtml && $('#cp-dialog-description').append('<div class="button-row ' + (buttons.length == 1 ? 'btn-center' : '') + '">' + buttonHtml + '</div>');
				$('[popup-name="popup-1"]').fadeIn(300);
			},
		}

		return allMethod;
	};

	var TextOverlay = function () {
		var _overlay;
		var $container;
		var htmlString;
		var wordString;
		var $overlay;
		var _overlayInstance;
		var _init;



		var _isOverlayAvailable = function () {
			return !!_overlay && _overlay.HasOverlay;
		};
		$container = $('.ocrext-textoverlay-container');

		htmlString = [
			'<div class="ocrext-element ocrext-text-overlay">',
			'<div class="ocrext-element ocrext-text-overlay-word-wrapper">',
			'<img class="ocrext-element ocrext-text-overlay-img text-overlay-img" />',
			'</div>',
			'</div>'
		].join('');
		wordString = '<span class="ocrext-element ocrext-text-overlay-word"></span>';

		_init = function (self) {
			var run;
			// $('title,.title').text(browser.i18n.getMessage('appName') + ' - ' + browser.i18n.getMessage('overlayTab'));
			// `self` is passed; pythonic!
			if($container && $container.length){
				// reset if already available
				$container.find('.ocrext-text-overlay').remove();
			}
			$(htmlString).appendTo($container);
			$overlay = $('.ocrext-textoverlay-container')

			$container.on('click', '.ocrext-close-link', function () {
				_overlayInstance.hide();
			});
		};

		_overlayInstance = {

			setOverlayInformation: function (overlayInfo, canvasWidth, canHeight, imgDataURI, zoom) {
				// if setOverlayInformation is called when _overlay is already set, do nothing!
				if (!_overlay) {
					_overlay = overlayInfo;
					this.render(canvasWidth, canHeight, imgDataURI, zoom);
				}
				return this;
			},
			getOverlayInformation: function () {
				return _overlay;
			},
			render: function (canvasWidth, canvasHeight, imgDataURI, zoom) {
				zoom = zoom || 1;
				if (_isOverlayAvailable()) {
					var lines = _overlay.Lines;
					var $wordWrapper = $overlay.find('.ocrext-text-overlay-word-wrapper');
					var $word;
					if (imgDataURI) {
						$container.find('.text-overlay-img').attr('src', imgDataURI);
					}

					this.setDimensions(canvasWidth, canvasHeight);
					$.each(lines, function (i, line) {
						var maxLineHeight = line.MaxHeight * zoom;
						var minLineTopDist = line.MinTop * zoom;
						$.each(line.Words, function (j, word) {
							$word = $(wordString);
							$word
								.text(word.WordText)
								.css({
									left: word.Left * zoom,
									top: minLineTopDist,
									height: maxLineHeight,
									width: word.Width * zoom,
									fontSize: maxLineHeight * 0.7
								})
								.appendTo($wordWrapper);
							$word = null;
						});

					});
				}
				return this;
			},

			setDimensions: function (width, height) {

				$.each([$overlay, $overlay.find('.ocrext-text-overlay-word-wrapper')], function () {
					this.width(width).height(height);
				});

				return this;
			},

			reset: function () {
				_overlay = null;
				$overlay.find('.ocrext-text-overlay-word-wrapper span').remove();
				return this;
			},

			show: function () {
				if (_isOverlayAvailable()) {
					// this.position();
					$container.addClass('visible');
					$overlay.addClass('visible');
					$container.find('.ocrext-text-overlay').addClass('visible');

				} else {
					// logError('Overlay is unavailable.');
					// window.alert('Sorry. Text overlay is currently unavailable.');
				}
				return this;
			},

			hide: function () {
				$container.removeClass('visible');
				$overlay.removeClass('visible');
				$container.find('.ocrext-text-overlay').remove('visible');
				return this;
			},

			position: function () {
				var bodyWidth, bodyHeight;
				var $body = $('body');
				bodyWidth = $body.width();
				bodyHeight = $(window).height();
				$overlay.css({
					left: bodyWidth / 2 - $overlay.width() / 2,
					top: 150
				});
				return this;
			},

			setTitle: function () {
				$('title,.ocrext-textoverlay-title').text(browser.i18n.getMessage('overlayTab'));
				return this;
			},

			listenToBackgroundEvents: function () {
				var self = this;
				browser.runtime.onMessage.addListener(function (request, sender, sendResponse) {

					console.log(request.evt, 8789)

					if (sender.tab) {
						return true;
					}
					
					if (request.evt === 'init-overlay-tab') {
						self.setOverlayInformation(request.overlayInfo, request.canWidth, request.canHeight, request.imgDataURI, request.zoom);
						// self.position();
						self.show();
						sendResponse({
							farewell: 'init-overlay-tab:OK'
						});
						return true;
					}
				});
			}

		};
		_init(_overlayInstance);
		return _overlayInstance;
	};

	// future proofing
	var run = $('body').attr('data-ocrext-run');
	var textOverlay;
	if (run) {
		textOverlay = TextOverlay();
		textOverlay.listenToBackgroundEvents();
		textOverlay.setTitle();
	}
	if(!$('body').attr('data-ocrext-dialog')){
		window.__copyFishHtmlDialog__ = htmlDialog();
		window.__copyFishHtmlDialog__.init();
	}

	window.__TextOverlay__ = TextOverlay;
	
}());
