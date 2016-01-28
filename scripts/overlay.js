(function() {
    'use strict';
    var TextOverlay = function() {
        var _overlay;

        var _isOverlayAvailable = function() {
            return !!_overlay && _overlay.HasOverlay;
        };
        var $container = $('.ocrext-textoverlay-container');
        var htmlString = [
            '<div class="ocrext-element ocrext-text-overlay">',
            '<div class="ocrext-element ocrext-text-overlay-word-wrapper">',
            '<a class="ocrext-close-link" title="Close"></a>',
            // '<img class="ocrext-element ocrext-text-overlay-img" id="text-overlay-img"/>',
            '</div>',
            '</div>'
        ].join('');
        var wordString = '<span class="ocrext-element ocrext-text-overlay-word"></span>';

        var $overlay;
        var _overlayInstance;
        var _init = function(self) {
            // $('title,.title').text(chrome.i18n.getMessage('appName') + ' - ' + chrome.i18n.getMessage('overlayTab'));
            // `self` is passed; pythonic!
            $overlay = $(htmlString);
            $overlay.appendTo($container);

            $overlay.on('click', '.ocrext-close-link', function() {
                _overlayInstance.hide();
            });
            /*chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
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
            });*/
        };

        _overlayInstance = {

            setOverlayInformation: function(overlayInfo, canvasWidth, canHeight) {
                // if setOverlayInformation is called when _overlay is already set, do nothing!
                if (!_overlay) {
                    _overlay = overlayInfo;
                    this.render(canvasWidth, canHeight);
                }
                return this;
            },
            getOverlayInformation: function() {
                return _overlay;
            },
            render: function(canvasWidth, canvasHeight) {
                if (_isOverlayAvailable()) {
                    var lines = _overlay.Lines;
                    var $wordWrapper = $overlay.find('.ocrext-text-overlay-word-wrapper');
                    var $word;


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
                $([$overlay, $overlay.find('.ocrext-text-overlay-word-wrapper')]).each(function() {
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
            }

        };
        _init(_overlayInstance);
        return _overlayInstance;
    };

    // future proofing
    // var textOverlay = TextOverlay();
    window.__TextOverlay__ = TextOverlay;
}());