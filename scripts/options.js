$(function() {
    'use strict';
    var DEFAULT_OCR_LANG = 'eng';
    var DEFAULT_TO_LANG = 'en';
    // var DEFAULT_AUTO_PROCESS = true;
    var DEFAULT_AUTO_TRANSLATE = true;
    var DEFAULT_OCR_FONTSIZE = '16px';
    var DEFAULT_POP_DICT = false;
    var checkBoxes = {
        visualCopyAutoTranslate: ['.auto-translate',DEFAULT_AUTO_TRANSLATE],
        visualCopySupportDicts: ['.popup-dicts',DEFAULT_POP_DICT]
    };
    chrome.storage.sync.get({
        visualCopyOCRLang: DEFAULT_OCR_LANG,
        visualCopyTranslateLang: DEFAULT_TO_LANG,
        // visualCopyAutoProcess: DEFAULT_AUTO_PROCESS,
        visualCopyAutoTranslate: DEFAULT_AUTO_TRANSLATE,
        visualCopyOCRFontSize: DEFAULT_OCR_FONTSIZE,
        visualCopySupportDicts: DEFAULT_POP_DICT
    }, function(items) {
        $('#input-lang').val(items.visualCopyOCRLang);
        $('#output-lang').val(items.visualCopyTranslateLang);
        $('#ocr-fontsize').val(items.visualCopyOCRFontSize);
        /*set checkbox state(s)*/
        $.each(checkBoxes, function(key, value) {
            if ((!items[key] && $(value[0]).hasClass('is-checked')) ||
                (items[key] && !$(value[0]).hasClass('is-checked'))) {
                $('#switch-' + value[0].substr(1)).click();
            }
        });
    });
    $('body')
        .on('click', '.btn-save', function() {
            chrome.storage.sync.set({
                visualCopyOCRLang: $('#input-lang').val(),
                visualCopyTranslateLang: $('#output-lang').val(),
                visualCopyOCRFontSize: $('#ocr-fontsize').val(),
                // visualCopyAutoProcess: $('.auto-process').hasClass('is-checked'),
                visualCopyAutoTranslate: $('.auto-translate').hasClass('is-checked'),
                visualCopySupportDicts: $('.popup-dicts').hasClass('is-checked')
            }, function() {
                // Update status to let user know options were saved.
                $('.status-text').addClass('visible');
                setTimeout(function() {
                    $('.status-text').removeClass('visible');
                }, 5000);
            });
        })
        .on('click', '.btn-reset', function() {
            $('#input-lang').val(DEFAULT_OCR_LANG);
            $('#output-lang').val(DEFAULT_TO_LANG);
            $('#ocr-fontsize').val(DEFAULT_OCR_FONTSIZE);
            $.each(checkBoxes, function(key, value) {
                if ((!value[1] && $(value[0]).hasClass('is-checked')) ||
                    (value[1] && !$(value[0]).hasClass('is-checked'))) {
                    $('#switch-' + value[0].substr(1)).click();
                }
            });
        });
});