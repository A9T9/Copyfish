$(function() {
    'use strict';
    var DEFAULT_OCR_LANG = 'eng';
    var DEFAULT_TO_LANG = 'en';
    var DEFAULT_AUTO_PROCESS = true;
    var DEFAULT_AUTO_TRANSLATE = true;
    chrome.storage.sync.get({
        visualCopyOCRLang: DEFAULT_OCR_LANG,
        visualCopyTranslateLang: DEFAULT_TO_LANG,
        visualCopyAutoProcess: DEFAULT_AUTO_PROCESS,
        visualCopyAutoTranslate: DEFAULT_AUTO_TRANSLATE
    }, function(items) {
        $('#input-lang').val(items.visualCopyOCRLang);
        $('#output-lang').val(items.visualCopyTranslateLang);

        // uncheck if saved is false and current state is checked
        if ((!items.visualCopyAutoProcess && $('.auto-process').hasClass('is-checked')) ||
            (items.visualCopyAutoProcess && !$('.auto-process').hasClass('is-checked'))) {
            $('#switch-auto-process').click();
        }

        if ((!items.visualCopyAutoTranslate && $('.auto-translate').hasClass('is-checked')) ||
            (items.visualCopyAutoTranslate && !$('.auto-translate').hasClass('is-checked'))) {
            $('#switch-auto-translate').click();
        }
    });
    $('body')
        .on('click', '.btn-save', function() {
            chrome.storage.sync.set({
                visualCopyOCRLang: $('#input-lang').val(),
                visualCopyTranslateLang: $('#output-lang').val(),
                visualCopyAutoProcess: $('.auto-process').hasClass('is-checked'),
                visualCopyAutoTranslate: $('.auto-translate').hasClass('is-checked')
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
            if (!$('.auto-process').hasClass('is-checked')) {
                $('#switch-auto-process').click();
            }
            if (!$('.auto-translate').hasClass('is-checked')) {
                $('#switch-auto-translate').click();
            }
        });
});