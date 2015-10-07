/* globals jQuery, unescape, componentHandler */
jQuery(function() {
    'use strict';
    // pseudo-private members
    var $ = jQuery;
    var appName = chrome.i18n.getMessage('appName');
    var $ready;
    var HTMLSTRCOPY;
    var APPCONFIG;
    var startX, startY, endX, endY;
    var startCx, startCy, endCx, endCy;
    var IS_CAPTURED = false;
    var $SELECTOR;
    var OPTIONS;
    var MAX_ZINDEX = 2147483647;
    var WIDGETBOTTOM = -8;
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

    var OCR_DIMENSION_ERROR = 'The parameter is incorrect.Image size is not supported. Each image dimension must be between 40 and 2600 pixels.';


    /*Utility functions*/
    var logError = function(msg, err) {
        err = err || '';
        msg = msg || 'An error occurred.';
        console.error('Extension ' + appName + ': ' + msg, err);
    };

    var _getLanguage = function(type, code) {
        var langList = APPCONFIG[type === 'OCR' ? 'ocr_languages' : 'yandex_languages'];
        code = (code || 'en').toLowerCase();
        var res = '';
        $.each(langList, function(k, v) {
            if (code in v) {
                res = v[code];
                return false;
            }
        });

        return res;
    };

    var _setLanguageOnUI = function() {
        var ocrLang = _getLanguage('OCR', OPTIONS.visualCopyOCRLang);
        var translateLang = _getLanguage('translate', OPTIONS.visualCopyTranslateLang);
        $('.ocrext-label.ocrext-message span')
            .text('(' + ocrLang + ')')
            .attr({
                title: ocrLang
            });
        $('.ocrext-label.ocrext-translated span')
            .text('(' + translateLang + ')')
            .attr({
                title: translateLang
            });
    };

    // Background mask
    var Mask = (function() {
        var $body = $('body');
        var $MASK;

        return {
            addToBody: function() {
                if (!$MASK && !$body.find('.ocrext-mask').length) {
                    $MASK = $('<div class="ocrext-element ocrext-mask"><p class="ocrext-element">Please select text to grab.</p></div>')
                        .css({
                            left: 0,
                            top: 0,
                            width: '100%',
                            height: '100%',
                            zIndex: MAX_ZINDEX - 2,
                            display: 'none'
                        });
                    $MASK.appendTo($body);
                }
                return this;
            },
            show: function(noTimeout) {
                $MASK.show();
                // without the delay, the opacity render cycle and show cycle would interleave
                // result? - no smooth tranisition
                setTimeout(function() {
                    $MASK.css({
                        opacity: 1,
                        background: 'rgba(117,117,117,0.5)'
                    });
                    $MASK.find('p.ocrext-element').css('transform', 'scale(1,1)');
                }, (noTimeout ? 0 : 50));
                return this;
            },

            hide: function() {
                $MASK.css({
                    opacity: 0
                });
                // timeout to ensure that the opacity animates
                setTimeout(function() {
                    $MASK.hide();
                }, 300);
                return this;
            },

            remove: function() {
                $MASK.remove();
                $MASK = null;
            }
        };
    }());

    /*
     * Mutates global state by setting the OPTIONS value
     */
    function getOptions() {
        var $optsDfd = $.Deferred();
        var theseOptions = {
            visualCopyOCRLang: '',
            visualCopyTranslateLang: '',
            visualCopyAutoProcess: '',
            visualCopyAutoTranslate: ''
        };
        chrome.storage.sync.get(theseOptions, function(opts) {
            OPTIONS = opts;
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

        $.when(
                $.get(chrome.extension.getURL('config/config.json')),
                $.get(chrome.extension.getURL('/dialog.html')),
                getOptions()
            )
            .done(function(config, htmlStr) {
                // var $body = $('body');
                HTMLSTRCOPY = htmlStr[0];
                OCRTranslator.APPCONFIG = APPCONFIG = JSON.parse(config[0]);
                $('body').append(HTMLSTRCOPY);
                _setLanguageOnUI();
                // upgrade buttons
                $('button.ocrext-btn').each(function(i, el) {
                    componentHandler.upgradeElement(el);
                });
                // upgrade spinner
                componentHandler.upgradeElement($('.ocrext-spinner').get(0));

                $dfd.resolve();
            })
            .fail(function(err) {
                $dfd.reject();
                logError('Failed to initialize', err);
            });
        return $dfd;
    }

    /*
     * Converts dataURI to a blob instance
     */
    function dataURItoBlob(dataURI) {
        // convert base64/URLEncoded data component to raw binary data held in a string
        var byteString;
        if (dataURI.split(',')[0].indexOf('base64') >= 0) {
            byteString = atob(dataURI.split(',')[1]);
        } else {
            byteString = unescape(dataURI.split(',')[1]);

        }

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

    /*depends on the global variables startCx,startCy,endCx,endCy
     * will not work if layout changes in between calls, but there is no way to detect this
     * is asynchronous, returns a promise
     */
    function _captureImageOntoCanvas() {
        var $can = $('#ocrext-can'),
            $dialog = $('body').find('.ocrext-wrapper');
        var $captureComplete = $.Deferred();
        // capture the current tab using the background page. On success it returns 
        // dataURL and zoom of the captured image
        getOptions().done(function() {
            _setLanguageOnUI();
            setTimeout(function() {
                chrome.runtime.sendMessage({
                    evt: 'capture-screen'
                }, function(response) {
                    var $imageLoadDfd = $.Deferred();
                    var img = new Image();
                    var zf = response.zf;

                    img.onload = function() {
                        $imageLoadDfd.resolve();
                    };
                    img.src = response.dataURL;
                    $imageLoadDfd
                        .done(function() {
                            var sx, sy, width, height;
                            var ctx;
                            sx = Math.min(startCx, endCx) * zf;
                            sy = Math.min(startCy, endCy) * zf;
                            width = Math.abs(endCx * zf - startCx * zf);
                            height = Math.abs(endCy * zf - startCy * zf);

                            $can.attr({
                                width: width,
                                height: height
                            });
                            ctx = $can.get(0).getContext('2d');
                            ctx.drawImage(img, sx, sy, width, height, 0, 0, width, height); // Or at whatever offset you like
                            $dialog.css({
                                opacity: 1,
                                bottom: WIDGETBOTTOM
                            });
                            $captureComplete.resolve();
                        });
                });
            }, 150);
        });

        return $captureComplete;
    }

    /*
     * Responsible for:
     * 1. Rolling up the canvas data into a form object along with API key and language
     * 2. POST to OCR API
     * 3. Handle response from OCR API and POST to Yandex translate
     * 4. AJAX error handling anywhere in the pipeline
     *
     */
    function _processOCRTranslate() {
        var data = new FormData();
        var dataURI;
        var $ocr = $.Deferred();
        var $process = $.Deferred();
        var $can = $('#ocrext-can');
        var dims = {
            width: $can.width(),
            height: $can.height()
        };

        // read options before every AJAX call, will ensure that any changes
        // in settings are transferred to existing sessions as well
        getOptions().done(function() {


            data.append('apikey', APPCONFIG.ocr_api_key);
            data.append('language', OPTIONS.visualCopyOCRLang);
            dataURI = $can.get(0).toDataURL();
            data.append('file', dataURItoBlob(dataURI), 'ocr-file.png');

            $process
                .done(function(txt, fromOCR) {
                    $('.ocrext-ocr-translated')
                        .text(txt)
                        .attr({
                            title: txt
                        });
                    $('.ocrext-btn').removeClass('disabled');
                    OCRTranslator.setStatus('success',
                        fromOCR ? 'OCR successful' : 'Translation successful');
                    OCRTranslator.enableContent();
                })
                .fail(function(err) {
                    // All API failure handling is done here, the AJAX callbacks simply relay
                    // necessary data to this callback
                    $('.ocrext-btn').removeClass('disabled');
                    OCRTranslator.setStatus('error', err.stat);

                    // per spec, display OCR error messages inside OCR text field
                    if (err.type === 'OCR') {
                        $('.ocrext-ocr-message').text(err.message);
                    }
                    $('.ocrext-ocr-translated').text('N/A');
                    OCRTranslator.enableContent();
                    console.error('Copyfish Exception', err);
                });

            $ocr
                .done(function(text) {
                    $('.ocrext-ocr-message')
                        .text(text)
                        .attr({
                            title: text
                        });

                    OCRTranslator.setStatus('progress', 'Translation in progress ...', true);
                    if (!OPTIONS.visualCopyAutoTranslate) {
                        $process.resolve('N/A', true);
                        return true;
                    }
                    $.ajax({
                        url: APPCONFIG.yandex_api_url,
                        data: {
                            key: APPCONFIG.yandex_api_key,
                            lang: OPTIONS.visualCopyTranslateLang,
                            text: text
                        },
                        timeout: APPCONFIG.yandex_timeout,
                        type: 'GET',
                        success: function(data) {
                            if (data.code === 200) {
                                $process.resolve(data.text);
                            }
                        },
                        error: function(x, t) {
                            var errData;
                            try {
                                errData = JSON.parse(x.responseText);
                            } catch (e) {
                                errData = {};
                            }
                            $process.reject({
                                type: 'translate',
                                stat: t === 'timeout' ? 'Translation request timed out' : 'An error occurred during translation',
                                message: errData.message,
                                details: null,
                                code: errData.code
                            });
                        }
                    });
                })
                .fail(function(err) {
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
            OCRTranslator.disableContent();
            OCRTranslator.setStatus('progress', 'OCR conversion in progress ...', true);

            // POST to OCR.
            $.ajax({
                url: APPCONFIG.ocr_api_url,
                data: data,
                dataType: 'json',
                cache: false,
                contentType: false,
                processData: false,
                timeout: APPCONFIG.ocr_timeout,
                type: 'POST',
                success: function(data) {
                    var result;
                    data = data || {};
                    if (data.IsErroredOnProcessing) {
                        $ocr.reject({
                            type: 'OCR',
                            stat: 'OCR conversion failed',
                            message: data.ErrorMessage,
                            details: data.ErrorDetails,
                            code: data.OCRExitCode
                        });
                    } else if (data.OCRExitCode === 1) {
                        $ocr.resolve(data.ParsedResults[0].ParsedText);
                    } else {
                        result = data.ParsedResults[0];
                        $ocr.reject({
                            type: 'OCR',
                            stat: 'OCR conversion failed',
                            message: result.ErrorMessage,
                            details: result.ErrorDetails,
                            code: result.FileParseExitCode
                        });
                    }
                },
                error: function(x, t) {
                    var errData;
                    try {
                        errData = JSON.parse(x.responseText);
                    } catch (e) {
                        errData = '';
                    }
                    $ocr.reject({
                        type: 'OCR',
                        stat: t === 'timeout' ? 'OCR request timed out' : 'An error occurred during OCR',
                        message: null,
                        details: null,
                        code: null,
                        data: errData
                    });
                }
            });

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
        if (ISPOSITIONED) {
            endX = e.pageX - $('body').scrollLeft();
            endY = e.pageY - $('body').scrollTop();
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

        $SELECTOR.css({
            left: Math.min(startX, endX),
            top: Math.min(startY, endY),
            width: Math.abs(endX - startX),
            height: Math.abs(endY - startY)
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
        if (ISPOSITIONED) {
            startX = e.pageX - $body.scrollLeft();
            startY = e.pageY - $body.scrollTop();
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
        $body.one('mouseup', function(evt) {
            var $dialog;
            endCx = evt.clientX;
            endCy = evt.clientY;

            // turn off the mousemove event, we no longer need it
            $body.off('mousemove', onOCRMouseMove);

            // manipulate DOM to remove temporary cruft
            $body.removeClass('ocrext-ch');
            $SELECTOR.remove();
            Mask.hide();
            // show the widget
            $dialog = $body.find('.ocrext-wrapper');
            $dialog
                .css({
                    zIndex: Number.MAX_SAFE_INTEGER - 8,
                    opacity: 0,
                    bottom: -$dialog.height()
                })
                .show();

            // initiate image capture 
            _captureImageOntoCanvas().done(function() {
                // if autoprocess is enabled begin processing for OCR
                if (OPTIONS.visualCopyAutoProcess) {
                    _processOCRTranslate();
                }
            });
        });
    }

    /*
     * Redo OCR button click handler
     * Use current viewport coords to capture, process and translate screen
     * There is no separate button to re-submit captured image, so onOCRRedo can be reused for that
     */
    function onOCRRedo() {
        // $('header.ocrext-header').removeClass('minimized');
        // $('.ocrext-wrapper').removeClass('ocrext-wrapper-minimized');
        $('.ocrext-wrapper').css('opacity', 0);
        // timeout to ensure that a render is done before initiating next capture cycle
        setTimeout(function() {
            _captureImageOntoCanvas().done(function() {
                _processOCRTranslate();
            });
        }, 20);
    }

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

    /*
     * Close button click handler. Also called on press of ESC
     * Close the current session and communicate this to the bg page (main extension)
     * Release any global state captured in between
     */
    function onOCRClose() {
        if (OCRTranslator.state === 'disabled') {
            return true;
        }
        $('header.ocrext-header').removeClass('minimized');
        $('.ocrext-wrapper').removeClass('ocrext-wrapper-minimized');
        OCRTranslator.disable();
        chrome.runtime.sendMessage({
            evt: 'capture-done'
        }, function( /*resp*/ ) {

        });
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
        init: function() {
            // get config information
            ISPOSITIONED = ['absolute', 'relative', 'fixed'].indexOf($('body').css('position')) >= 0;
            $ready = _bootStrapResources();

            // listen to runtime messages from other pages, mainly the background page
            chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                if (request.evt === 'enableselection') {
                    // enable only if resources are loaded and available
                    $ready.done(function() {
                        OCRTranslator.enable();
                    });
                }
                // ACK back
                sendResponse({
                    farewell: 'OK'
                });
            });
            this.bindEvents();
            // tell the background page that the tab is ready
            chrome.runtime.sendMessage({
                evt: 'ready'
            });
            return this;
        },

        /*
         * Bind listeners for interactive elements exposed to user
         * click - redo ocr, recapture, close, copy-to-clipboard
         */
        bindEvents: function() {
            var $body = $('body');
            $body
                .on('click', '.ocrext-ocr-recapture', onOCRRecapture)
                .on('click', '.ocrext-ocr-sendocr', onOCRRedo)
                .on('click', '.ocrext-ocr-close', onOCRClose)
                .on('click', '.ocrext-ocr-copy', function() {
                    /*Copy button click handler*/
                    chrome.runtime.sendMessage({
                        evt: 'copy',
                        text: $('.ocrext-ocr-message').text()
                    });
                })
                .on('click', 'header.ocrext-header', function() {
                    /*click handler for header*/
                    var $this = $(this);

                    if ($this.hasClass('minimized')) {
                        $('.ocrext-wrapper').removeClass('ocrext-wrapper-minimized');
                        $this.removeClass('minimized');
                    } else {
                        $('.ocrext-wrapper').addClass('ocrext-wrapper-minimized');
                        $this.addClass('minimized');
                    }
                })
                .on('click', 'a.ocrext-settings-link', function(e) {
                    /*Settings  (gear icon) click handler*/
                    e.stopPropagation();
                    chrome.runtime.sendMessage({
                        evt: 'open-settings'
                    });
                });

            /*ESC handler. */
            $(document).on('keyup', function(e) {
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
        enable: function() {
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
            OCRTranslator.reset();
            Mask.addToBody().show();
            $body.on('mousedown', onOCRMouseDown);
            OCRTranslator.state = 'enabled';
            return this;
        },

        /*
         * Hide the widget. Does not destroy/recreate, the widget size isn't big enough 
         * to adversely impact page weight
         */
        disable: function() {
            var $body = $('body');
            $body.removeClass('ocrext-overlay ocrext-ch')
                .find('.ocrext-wrapper')
                .hide();
            $body.off('mousedown', onOCRMouseDown);
            OCRTranslator.state = 'disabled';
            Mask.remove();
            IS_CAPTURED = false;
            return this;
        },

        // reset anything that requires resetting
        reset: function() {
            $('.ocrext-status').text('').removeClass('ocrext-success ocrext-error ocrext-progress');
            $('.ocrext-result').text('N/A');
            $('.ocrext-result').attr({
                title: ''
            });
            return this;
        },

        // spinner logic
        enableContent: function() {
            $('.ocrext-spinner').removeClass('is-active');
            $('.ocrext-content').removeClass('ocrext-disabled');
            $('.ocrext-btn-container .ocrext-btn').removeClass('disabled').removeAttr('disabled');
            return this;
        },

        // spinner logic
        disableContent: function() {
            $('.ocrext-spinner').addClass('is-active');
            $('.ocrext-content').addClass('ocrext-disabled');
            $('.ocrext-btn-container .ocrext-btn').addClass('disabled').attr('disabled', 'disabled');
            return this;
        },

        // Utility to set the status - progress, error and success are supported
        setStatus: function(status, txt, noAutoClose) {
            if (status === 'error') {
                $('.ocrext-content').addClass('ocrext-error');
            } else {
                $('.ocrext-content').removeClass('ocrext-error');
            }
            $('.ocrext-status')
                .removeClass('ocrext-success ocrext-error ocrext-progress')
                .addClass(status === 'error' ? 'ocrext-error' :
                    (status === 'success' ? 'ocrext-success' : 'ocrext-progress'))
                .text(txt);
            if (!noAutoClose) {
                setTimeout(function() {
                    $('.ocrext-status').removeClass('ocrext-success ocrext-error ocrext-progress');
                }, 10000);
            }
        },

        slideDown: function() {
            var $dialog = $('.ocrext-wrapper');
            $dialog.css({
                bottom: -$dialog.height()
            });
        },

        slideUp: function() {
            $('.ocrext-wrapper').css('bottom', WIDGETBOTTOM);
        }
    };

    OCRTranslator.init();
});