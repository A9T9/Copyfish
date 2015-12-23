$(function() {
    'use strict';
    $.getJSON(chrome.extension.getURL('config/config.json'))
        .done(function(appConfig) {
            var defaults = appConfig.defaults;
            var ocrnameArray = appConfig.ocr_languages;

            var checkBoxes = {
                visualCopyAutoTranslate: ['.auto-translate', defaults.visualCopyAutoTranslate],
                visualCopySupportDicts: ['.popup-dicts', defaults.visualCopySupportDicts],
                visualCopyTextOverlay:['.text-overlay',defaults.visualCopyTextOverlay]
            };

            // render the Input Language select box
            var htmlStrArr = $(ocrnameArray).map(function(i, val) {
                return '<option value="' + val.lang + '">' + val.name + '</option>';
            });
            $('#input-lang').html(htmlStrArr.toArray().join(' '));
            htmlStrArr.splice(0, htmlStrArr.length);

            // render the quick select checkboxes
            htmlStrArr = $(ocrnameArray).map(function(i, val) {
                return '<option value="' + val.lang + '" data-short="' + val.short + '">' + val.name + '-' + val.short + '</option>';
            });
            $('.lang-quickselect').each(function(i, node) {
                $(node).append(htmlStrArr.toArray().join(' '));
            });
            htmlStrArr.splice(0, htmlStrArr.length);

            // fetch options while defaulting them when unavailable
            chrome.storage.sync.get({
                visualCopyOCRLang: defaults.visualCopyOCRLang,
                visualCopyTranslateLang: defaults.visualCopyTranslateLang,
                visualCopyAutoTranslate: defaults.visualCopyAutoTranslate,
                visualCopyOCRFontSize: defaults.visualCopyOCRFontSize,
                visualCopySupportDicts: defaults.visualCopySupportDicts,
                visualCopyQuickSelectLangs: defaults.visualCopyQuickSelectLangs,
                visualCopyTextOverlay: defaults.visualCopyTextOverlay
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
                if (!items.visualCopyQuickSelectLangs.length) {
                    $('.lang-quickselect').each(function(i, node) {
                        $(node).val('none');
                    });
                } else {
                    $.each(items.visualCopyQuickSelectLangs, function(i, language) {
                        $('#input-lang-' + (i + 1)).val(language);
                    });
                }
            });

            $('body')
                .on('click', '.btn-save', function() {
                    var quickSelectLangs = [];
                    $('.lang-quickselect').each(function(i, node) {
                        var $node = $(node);
                        quickSelectLangs.push($node.val());
                    });
                    chrome.storage.sync.set({
                        visualCopyOCRLang: $('#input-lang').val(),
                        visualCopyTranslateLang: $('#output-lang').val(),
                        visualCopyOCRFontSize: $('#ocr-fontsize').val(),
                        visualCopyAutoTranslate: $('.auto-translate').hasClass('is-checked'),
                        visualCopySupportDicts: $('.popup-dicts').hasClass('is-checked'),
                        visualCopyQuickSelectLangs: quickSelectLangs,
                        visualCopyTextOverlay: $('.text-overlay').hasClass('is-checked')
                    }, function() {
                        // Update status to let user know options were saved.
                        $('.status-text').addClass('visible');
                        setTimeout(function() {
                            $('.status-text').removeClass('visible');
                        }, 5000);
                    });
                })
                .on('click', '.btn-reset', function() {
                    $('#input-lang').val(defaults.visualCopyOCRLang);
                    $('#output-lang').val(defaults.visualCopyTranslateLang);
                    $('#ocr-fontsize').val(defaults.visualCopyOCRFontSize);
                    $.each(checkBoxes, function(key, value) {
                        if ((!value[1] && $(value[0]).hasClass('is-checked')) ||
                            (value[1] && !$(value[0]).hasClass('is-checked'))) {
                            $('#switch-' + value[0].substr(1)).click();
                        }
                    });

                    $('.lang-quickselect').each(function(i, node) {
                        $(node).val('none');
                    });
                });
        });
});