(function() {
    'use strict';
    var TextOverlay = function() {
        var _overlay;
        var $container;
        var htmlString;
        var wordString;
        var $overlay;
        var _overlayInstance;
        var _init;



        var _isOverlayAvailable = function() {
            return !!_overlay && _overlay.HasOverlay;
        };
        $container = $('.ocrext-textoverlay-container');
        htmlString = [
            '<div class="ocrext-element ocrext-text-overlay">',
            '<div class="ocrext-element ocrext-text-overlay-word-wrapper">',
            '<img class="ocrext-element ocrext-text-overlay-img" id="text-overlay-img"/>',
            '</div>',
            '</div>'
        ].join('');
        wordString = '<span class="ocrext-element ocrext-text-overlay-word"></span>';

        _init = function(self) {
            var run;
            // $('title,.title').text(chrome.i18n.getMessage('appName') + ' - ' + chrome.i18n.getMessage('overlayTab'));
            // `self` is passed; pythonic!
            $overlay = $(htmlString);
            $overlay.appendTo($container);

            $container.on('click', '.ocrext-close-link', function() {
                _overlayInstance.hide();
            });
        };

        _overlayInstance = {

            setOverlayInformation: function(overlayInfo, canvasWidth, canHeight, imgDataURI) {
                // if setOverlayInformation is called when _overlay is already set, do nothing!
                if (!_overlay) {
                    _overlay = overlayInfo;
                    this.render(canvasWidth, canHeight, imgDataURI);
                }
                return this;
            },
            getOverlayInformation: function() {
                return _overlay;
            },
            render: function(canvasWidth, canvasHeight, imgDataURI) {
                if (_isOverlayAvailable()) {
                    var lines = _overlay.Lines;
                    var $wordWrapper = $overlay.find('.ocrext-text-overlay-word-wrapper');
                    var $word;

                    if (imgDataURI) {
                        $container.find('#text-overlay-img').attr('src', imgDataURI);
                    }

                    this.setDimensions(canvasWidth, canvasHeight);
                    $.each(lines, function(i, line) {
                        var maxLineHeight = line.MaxHeight;
                        var minLineTopDist = line.MinTop;
                        $.each(line.Words, function(j, word) {
                            $word = $(wordString);
                            $word
                                .text(word.WordText)
                                .css({
                                    left: word.Left,
                                    top: minLineTopDist,
                                    height: maxLineHeight,
                                    width: word.Width,
                                    fontSize: maxLineHeight * 0.8
                                })
                                .appendTo($wordWrapper);
                            $word = null;
                        });

                    });
                }
                return this;
            },

            setDimensions: function(width, height) {
                $.each([$overlay, $overlay.find('.ocrext-text-overlay-word-wrapper')], function() {
                    this.width(width).height(height);
                });
                return this;
            },

            reset: function() {
                _overlay = null;
                $overlay.find('.ocrext-text-overlay-word-wrapper span').remove();
                return this;
            },

            show: function() {

                if (_isOverlayAvailable()) {
                    // this.position();
                    $container.addClass('visible');
                    $overlay.addClass('visible');

                } else {
                    // logError('Overlay is unavailable.');
                    window.alert('Sorry. Text overlay is currently unavailable.');
                }
                return this;
            },

            hide: function() {
                $container.removeClass('visible');
                $overlay.removeClass('visible');
                return this;
            },

            position: function() {
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

            setTitle: function() {
                $('title,.ocrext-textoverlay-title').text(chrome.i18n.getMessage('appName') + ' - ' + chrome.i18n.getMessage('overlayTab'));
                return this;
            },

            listenToBackgroundEvents: function() {
                var self = this;
                chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                    if (sender.tab) {
                        return true;
                    }

                    if (request.evt === 'init-overlay-tab') {
                        self.setOverlayInformation(request.overlayInfo, request.canWidth, request.canHeight, request.imgDataURI);
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

    window.__TextOverlay__ = TextOverlay;
}());