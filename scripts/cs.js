/* globals jQuery, unescape, componentHandler */
jQuery(function() {
    'use strict';
    // pseudo-private members
    var $ = jQuery;
    var appName = 'Copyfish'; //chrome.i18n.getMessage('appShortName');
    var appShortName = 'Copyfish';
    var $ready;
    var HTMLSTRCOPY;
    var APPCONFIG;
    var startX, startY, endX, endY;
    var startCx, startCy, endCx, endCy;
    var IS_CAPTURED = false;
    var $SELECTOR;
    var OPTIONS;
    var MAX_ZINDEX = 2147483646;
    var WIDGETBOTTOM = -8;
    var SELECTOR_BORDER = 2;
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
    var OCR_DIMENSION_ERROR = chrome.i18n.getMessage('ocrDimensionError');

    /* 
     *  Set to true to use a JPEG image. Default is PNG
     *  JPEG_QUALITY ranges from 0.1 to 1 and is valid only if USE_JPEG is true
     */
    var USE_JPEG = false;
    var JPEG_QUALITY = 0.6;


    /*Utility functions*/
    var logError = function(msg, err) {
        err = err || '';
        msg = msg || 'An error occurred.';
        console.error('Extension ' + appShortName + ': ' + msg, err);
    };

    var _searchOCRLanguageList = function(lang) {
        var result = '';
        $.each(APPCONFIG.ocr_languages, function(i, v) {
            if (v.lang === lang) {
                result = v;
                return false;
            }
        });
        return result;
    };

    var _getLanguage = function(type, lang) {
        // var langList = APPCONFIG[type === 'OCR' ? 'ocr_languages' : 'yandex_languages'];
        var res = '';
        lang = (lang || 'en').toLowerCase();
        if (type === 'OCR') {
            res = (_searchOCRLanguageList(lang) || {}).name;
        } else {
            $.each(APPCONFIG.yandex_languages, function(k, v) {
                if (lang in v) {
                    res = v[lang];
                    return false;
                }
            });
        }
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

    var _setOCRFontSize = function() {
        $('.ocrext-ocr-message,.ocrext-ocr-translated')
            .removeClass(function(i, className) {
                var classes = className.match(/ocrext-font-\d\dpx/ig);
                return classes && classes.length ? classes.join(' ') : '';
            })
            .addClass('ocrext-font-' + OPTIONS.visualCopyOCRFontSize);
    };

    var _setZIndex = function() {
        /*
         * Google Translate - 1201 Perapera - 7777 GDict - 99997 Transover - 2147483647
         */
        if (OPTIONS.visualCopySupportDicts) {
            $('.ocrext-wrapper').css('zIndex', 1200);
        } else {
            $('.ocrext-wrapper').css('zIndex', MAX_ZINDEX);
        }
    };

    var _drawQuickSelectButtons = function() {
        var $btnContainer = $('.ocrext-quickselect-btn-container');
        var $btn;
        var ocrLang;
        $btnContainer.empty();
        $.each(OPTIONS.visualCopyQuickSelectLangs, function(i, language) {
            if (language === 'none') {
                return true;
            }
            ocrLang = _searchOCRLanguageList(language);
            $btn = $([
                '<button class="ocrext-element ocrext-ocr-quickselect ocrext-btn mdl-button',
                'mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent"></button>'
            ].join(' '));
            $btn.attr({
                'data-lang': ocrLang.lang,
                'title': ocrLang.name
            }).text(ocrLang.short);

            if (OPTIONS.visualCopyOCRLang === ocrLang.lang) {
                $btn.addClass('selected');
            }
            $btnContainer.append($btn);
            // upgrade button to mdl-button
            componentHandler.upgradeElement($btn.get(0));
        });
    };

    // Background mask
    var Mask = (function() {
        var $body = $('body');
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
            addToBody: function() {
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

                    tl = $('.ocrext-corner-tl');
                    tr = $('.ocrext-corner-tr');
                    br = $('.ocrext-corner-br');
                    bl = $('.ocrext-corner-bl');

                    this.resetPosition();
                }
                $MASK.width($(document).width());
                $MASK.height($(document).width());
                if (['absolute', 'relative', 'fixed'].indexOf($('body').css('position')) >= 0) {
                    $MASK.css('position', 'fixed');
                }
                return this;
            },

            width: function(w) {
                if (w === undefined) {
                    return $MASK.width();
                }
                $MASK.width(w);
            },

            height: function(h) {
                if (h === undefined) {
                    return $MASK.height();
                }
                $MASK.height(h);
            },

            show: function() {
                this.resetPosition();
                $MASK.show();
                return this;
            },

            hide: function() {
                $MASK.hide();
                return this;
            },

            remove: function() {
                $MASK.remove();
                $MASK = null;
            },

            resetPosition: function() {
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

            reposition: function(pos) {
                var width = $(document).width();
                var height = $(document).height();

                tl.css({
                    left: 0,
                    top: 0,
                    width: pos.tr[0],
                    height: pos.tl[1]
                });

                tr.css({
                    left: pos.tr[0],
                    top: 0,
                    width: (width - pos.tr[0]),
                    height: pos.br[1]
                });

                br.css({
                    left: pos.bl[0],
                    top: pos.bl[1],
                    width: (width - pos.bl[0]),
                    height: (height - pos.bl[1])
                });

                bl.css({
                    left: 0,
                    top: pos.tl[1],
                    width: pos.tl[0],
                    height: (height - pos.tl[1])
                });
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
            // visualCopyAutoProcess: '',
            visualCopyAutoTranslate: '',
            visualCopyOCRFontSize: '',
            visualCopySupportDicts: '',
            visualCopyQuickSelectLangs: []
        };
        chrome.storage.sync.get(theseOptions, function(opts) {
            OPTIONS = opts;
            // set the global options here
            $optsDfd.resolve();
        });

        return $optsDfd;
    }

    /*
     * Mutates global state by setting the OPTIONS value
     */
    function setOptions(opts) {
        var $optsDfd = $.Deferred();
        chrome.storage.sync.set(opts, function() {
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
                $('.ocrext-title span').text(appName);
                if (!OPTIONS.visualCopyAutoTranslate) {
                    $('.ocrext-ocr-message').addClass('ocrext-preserve-whitespace expanded');
                    $('.ocrext-grid-translated').hide();
                }
                // set paragraph font
                _setLanguageOnUI();
                // set OCR font size
                _setOCRFontSize();
                // draw quick selection buttons
                _drawQuickSelectButtons();
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
     * will not work if layout changes in between calls, but there is no way to detect this.
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
            _setOCRFontSize();
            _drawQuickSelectButtons();
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
                            // the screencapture is messed up when pixel density changes; compare the window width
                            // and image width to determine if it needs to be fixed
                            var dpf = window.innerWidth / img.width;
                            var scaleFactor = zf / dpf;
                            sx = Math.min(startCx, endCx) * scaleFactor;
                            sy = Math.min(startCy, endCy) * scaleFactor;
                            width = Math.abs(endCx * scaleFactor - startCx * scaleFactor);
                            height = Math.abs(endCy * scaleFactor - startCy * scaleFactor);

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
     * Returns the ID of the most responsive server
     */
    function _getOCRServer() {
        var $dfd = $.Deferred();
        chrome.runtime.sendMessage({
            evt: 'get-best-server'
        }, function(response) {
            $dfd.resolve(response.server.id);
        });
        return $dfd;
    }

    function _postToOCR($ocrPromise, postData, attempt) {
        var formData = new FormData();
        formData.append('language', postData.language);
        formData.append('file', postData.blob, postData.fileName);
        _getOCRServer().done(function(serverId) {
            var startTime;
            var serverList = APPCONFIG.ocr_api_list;
            var maxAttempts = serverList.length;
            var ocrAPIInfo = $.grep(serverList, function(el) {
                return el.id === serverId;
            })[0];
            formData.append('apikey', ocrAPIInfo.ocr_api_key);
            attempt += 1;
            startTime = Date.now();
            $.ajax({
                url: ocrAPIInfo.ocr_api_url,
                data: formData,
                dataType: 'json',
                cache: false,
                contentType: false,
                processData: false,
                timeout: APPCONFIG.ocr_timeout,
                type: 'POST',
                success: function(data) {
                    var result;
                    data = data || {};
                    // retry if any error condition is met and if any servers are still available
                    if ((typeof data === 'string' ||
                            data.IsErroredOnProcessing ||
                            data.OCRExitCode !== 1) &&
                        attempt < maxAttempts) {
                        // sometimes an error string is returned
                        chrome.runtime.sendMessage({
                            evt: 'set-server-responsetime',
                            serverId: ocrAPIInfo.id,
                            serverResponseTime: -1
                        }, function() {
                            OCRTranslator.setStatus('progress',
                                chrome.i18n.getMessage('ocrProgressStatusStillWorking'), true);
                            formData = null;
                            _postToOCR($ocrPromise, postData, attempt);
                        });
                        return false;
                    }
                    if (data.IsErroredOnProcessing) {
                        $ocrPromise.reject({
                            type: 'OCR',
                            stat: 'OCR conversion failed',
                            message: data.ErrorMessage,
                            details: data.ErrorDetails,
                            code: data.OCRExitCode
                        });
                    } else if (data.OCRExitCode === 1) {

                        chrome.runtime.sendMessage({
                            evt: 'set-server-responsetime',
                            serverId: ocrAPIInfo.id,
                            serverResponseTime: (Date.now() - startTime)/1000
                        }, function() {});
                        $ocrPromise.resolve(data.ParsedResults[0].ParsedText);

                    } else {
                        result = data.ParsedResults[0];
                        $ocrPromise.reject({
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
                    var stat;
                    if (attempt < maxAttempts) {
                        chrome.runtime.sendMessage({
                            evt: 'set-server-responsetime',
                            serverId: ocrAPIInfo.id,
                            serverResponseTime: -1
                        }, function() {
                            OCRTranslator.setStatus('progress',
                                chrome.i18n.getMessage('ocrProgressStatusStillWorking'), true);
                            formData = null;
                            _postToOCR($ocrPromise, postData, attempt);
                        });
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

    /*
     * Responsible for:
     * 1. Rolling up the canvas data into a form object along with API key and language
     * 2. POST to OCR API
     * 3. Handle response from OCR API and POST to Yandex translate
     * 4. AJAX error handling anywhere in the pipeline
     *
     */
    function _processOCRTranslate() {
        // var data = new FormData();
        var dataURI;
        var ocrPostData;
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
            _setOCRFontSize();
            $process
                .done(function(txt, fromOCR) {
                    if (txt === 'no-translate') {
                        $('.ocrext-ocr-message').addClass('ocrext-preserve-whitespace expanded');
                        $('.ocrext-grid-translated').hide();
                    } else {
                        $('.ocrext-ocr-message').removeClass('ocrext-preserve-whitespace expanded');
                        $('.ocrext-grid-translated').show();
                        $('.ocrext-ocr-translated')
                            .text(txt)
                            .show();
                    }

                    $('.ocrext-btn').removeClass('disabled');
                    OCRTranslator.setStatus('success',
                        fromOCR ? chrome.i18n.getMessage('ocrSuccessStatus') : chrome.i18n.getMessage('translationSuccessStatus'));
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
                    console.error('Visual Copy Exception', err);
                });

            $ocr
                .done(function(text) {
                    $('.ocrext-ocr-message')
                        .text(text);

                    if (!OPTIONS.visualCopyAutoTranslate) {
                        $process.resolve('no-translate', true);
                        return true;
                    }
                    OCRTranslator.setStatus('progress',
                        chrome.i18n.getMessage('translationProgressStatus'), true);
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
            OCRTranslator.setStatus('progress',
                chrome.i18n.getMessage('ocrProgressStatus'), true);

            // POST to OCR.
            ocrPostData = {};
            ocrPostData.language = OPTIONS.visualCopyOCRLang;
            // data.append('language', OPTIONS.visualCopyOCRLang);
            if (USE_JPEG) {
                dataURI = $can.get(0).toDataURL('image/jpeg', JPEG_QUALITY);
                ocrPostData.blob = dataURItoBlob(dataURI);
                ocrPostData.fileName = 'ocr-file.jpg';
                // data.append('file', dataURItoBlob(dataURI), 'ocr-file.jpg');
            } else {
                dataURI = $can.get(0).toDataURL();
                ocrPostData.blob = dataURItoBlob(dataURI);
                ocrPostData.fileName = 'ocr-file.png';
                // data.append('file', dataURItoBlob(dataURI), 'ocr-file.png');
            }
            _postToOCR($ocr, ocrPostData, 0);

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
            tl: [l + SELECTOR_BORDER, t + SELECTOR_BORDER],
            tr: [l + w + SELECTOR_BORDER, t + SELECTOR_BORDER],
            bl: [l + SELECTOR_BORDER, t + h + SELECTOR_BORDER],
            br: [l + w + SELECTOR_BORDER, t + h + SELECTOR_BORDER]
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
            _setZIndex();
            $dialog = $body.find('.ocrext-wrapper');
            $dialog
                .css({
                    // zIndex: MAX_ZINDEX,
                    // opacity: 0,
                    bottom: -$dialog.height()
                })
                .show();

            // initiate image capture 
            _captureImageOntoCanvas().done(function() {
                // if autoprocess is enabled begin processing for OCR
                // if (OPTIONS.visualCopyAutoProcess) {
                _processOCRTranslate();
                // }
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
                _setZIndex();
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
                if (sender.tab) {
                    return true;
                }
                if (request.evt === 'isavailable') {
                    sendResponse({
                        farewell: 'isavailable:OK'
                    });
                    return true;
                }
                if (request.evt === 'enableselection') {
                    // enable only if resources are loaded and available
                    $ready.done(function() {
                        OCRTranslator.enable();
                    });
                }
                // ACK back
                sendResponse({
                    farewell: 'enableselection:OK'
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
                .on('click', '.ocrext-ocr-quickselect', function() {
                    var $el = $(this);
                    /*if($el.hasClass('selected')){
                        return false;
                    }*/
                    $el.siblings().removeClass('selected');
                    $el.addClass('selected');
                    setOptions({
                        visualCopyOCRLang: $(this).attr('data-lang')
                    }).done(function() {
                        onOCRRedo();
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
            $('.ocrext-title span').text(appName);
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
            $('.ocrext-quickselect-btn-container .ocrext-btn').removeClass('disabled').removeAttr('disabled');
            return this;
        },

        // spinner logic
        disableContent: function() {
            $('.ocrext-spinner').addClass('is-active');
            $('.ocrext-content').addClass('ocrext-disabled');
            $('.ocrext-btn-container .ocrext-btn').addClass('disabled').attr('disabled', 'disabled');
            $('.ocrext-quickselect-btn-container .ocrext-btn').addClass('disabled').attr('disabled', 'disabled');
            return this;
        },

        // Utility to set the status - progress, error and success are supported
        // pass noAutoClose as true if the status message must be persisted beyond 10s
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
        },

        hideTranslate: function() {

        },

        showTranslate: function() {

        }
    };

    OCRTranslator.init();
});