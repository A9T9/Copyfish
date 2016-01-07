(function() {
    'use strict';
    var TextOverlay = function() {
        var _overlay;
        var _imgDataURI;

        var _isOverlayAvailable = function() {
            return !!_overlay && _overlay.HasOverlay;
        };
        var $container = $('.container');
        var htmlString = [
            '<div class="ocrext-element ocrext-text-overlay">',
            '<div class="ocrext-element ocrext-text-overlay-word-wrapper">',
            // '<a class="ocrext-close-link" title="Close">',
            '</a>',
            '<img class="ocrext-element ocrext-text-overlay-img" id="text-overlay-img"/>',
            '</div>',
            '</div>'
        ].join('');
        var wordString = '<span class="ocrext-element ocrext-text-overlay-word"></span>';

        var $overlay;
        var _overlayInstance;
        var _init = function(self) {
            $('title,.title').text(chrome.i18n.getMessage('appName') + ' - ' + chrome.i18n.getMessage('overlayTab'));
            // `self` is passed; pythonic!
            $overlay = $(htmlString);
            $overlay.appendTo($container);

            $overlay.on('click', '.ocrext-close-link', function() {
                _overlayInstance.hide();
            });
            chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                if (sender.tab) {
                    return true;
                }

                if (request.evt === 'init-overlay-tab') {
                    self.setOverlayInformation(request.overlayInfo, request.imgDataURI);
                    // self.position();
                    self.show();
                    sendResponse({
                        farewell: 'init-overlay-tab:OK'
                    });
                    return true;
                }
            });
        };

        _overlayInstance = {
            reset: function() {
                _overlay = null;
                _imgDataURI = null;
                $overlay.find('.ocrext-text-overlay-word-wrapper span').remove();
                $overlay.find('#text-overlay-img').attr('src', '');
            },
            setOverlayInformation: function(overlayInfo, img) {
                _overlay = overlayInfo;
                _imgDataURI = img;
                this.render();
            },
            getOverlayInformation: function() {
                return _overlay;
            },
            render: function() {
                if (_isOverlayAvailable()) {
                    var lines = _overlay.Lines;
                    var $wordWrapper = $overlay.find('.ocrext-text-overlay-word-wrapper');
                    var $word;
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
                    $overlay.find('img').attr('src', _imgDataURI);

                    // destroy the JS image reference after render
                    _imgDataURI = null;
                }
            },
            show: function() {

                if (_isOverlayAvailable()) {
                    // this.position();
                    $overlay.addClass('visible');

                } else {
                    // logError('Overlay is unavailable.');
                    window.alert('Sorry. Text overlay is currently unavailable.');
                }
                return this;
            },
            hide: function() {
                $overlay.hide();
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
            }
        };
        _init(_overlayInstance);
        return _overlayInstance;
    };

    // future proofing
    var textOverlay = TextOverlay();
}());