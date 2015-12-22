$(function() {
    'use strict';
    var DEFAULT_OCR_name = 'eng';
    var DEFAULT_TO_name = 'en';
    // var DEFAULT_AUTO_PROCESS = true;
    var DEFAULT_AUTO_TRANSLATE = true;
    var DEFAULT_OCR_FONTSIZE = '16px';
    var DEFAULT_POP_DICT = false;
    var checkBoxes = {
        visualCopyAutoTranslate: ['.auto-translate', DEFAULT_AUTO_TRANSLATE],
        visualCopySupportDicts: ['.popup-dicts', DEFAULT_POP_DICT]
    };
    var ocrnameArray = [{
        'lang': 'ce',
        'name': 'Czech',
        'short': 'CS'
    }, {
        'lang': 'chs',
        'name': 'ChineseSimplified',
        'short': '繁'
    }, {
        'lang': 'cht',
        'name': 'ChineseTraditional',
        'short': '简'
    }, {
        'lang': 'dan',
        'name': 'Danish',
        'short': 'DA'
    }, {
        'lang': 'dut',
        'name': 'Dutch',
        'short': 'NL'
    }, {
        'lang': 'eng',
        'name': 'English',
        'short': 'EN'
    }, {
        'lang': 'fin',
        'name': 'Finnish',
        'short': 'FI'
    }, {
        'lang': 'fre',
        'name': 'French',
        'short': 'FR'
    }, {
        'lang': 'ger',
        'name': 'German',
        'short': 'DE'
    }, {
        'lang': 'gre',
        'name': 'Greek',
        'short': 'EL'
    }, {
        'lang': 'hun',
        'name': 'Hungarian',
        'short': 'HU'
    }, {
        'lang': 'ita',
        'name': 'Italian',
        'short': 'IT'
    }, {
        'lang': 'jpn',
        'name': 'Japanese',
        'short': 'JP'
    }, {
        'lang': 'kor',
        'name': 'Korean',
        'short': 'KO'
    }, {
        'lang': 'nor',
        'name': 'Norwegian',
        'short': 'NN'
    }, {
        'lang': 'pol',
        'name': 'Polish',
        'short': 'PL'
    }, {
        'lang': 'por',
        'name': 'Portuguese',
        'short': 'PT'
    }, {
        'lang': 'rus',
        'name': 'Russian',
        'short': 'RU'
    }, {
        'lang': 'spa',
        'name': 'Spanish',
        'short': 'ES'
    }, {
        'lang': 'swe',
        'name': 'Swedish',
        'short': 'SV'
    }, {
        'lang': 'tur',
        'name': 'Turkish',
        'short': 'TR'
    }];

    var htmlStrArr = $(ocrnameArray).map(function(i, val) {
        return '<option value="' + val.lang + '">' + val.name + '</option>';
    });
    $('#input-lang').html(htmlStrArr.toArray().join(' '));
    htmlStrArr.splice(0, htmlStrArr.length);

    htmlStrArr = $(ocrnameArray).map(function(i, val) {
        return '<option value="' + val.lang + '" data-short="' + val.short + '">' + val.name + '-' + val.short + '</option>';
    });
    $('.lang-quickselect').each(function(i, node) {
        $(node).append(htmlStrArr.toArray().join(' '));
    });
    htmlStrArr.splice(0, htmlStrArr.length);

    chrome.storage.sync.get({
        visualCopyOCRname: DEFAULT_OCR_name,
        visualCopyTranslatename: DEFAULT_TO_name,
        // visualCopyAutoProcess: DEFAULT_AUTO_PROCESS,
        visualCopyAutoTranslate: DEFAULT_AUTO_TRANSLATE,
        visualCopyOCRFontSize: DEFAULT_OCR_FONTSIZE,
        visualCopySupportDicts: DEFAULT_POP_DICT,
        visualCopyQuickSelectLangs:[]
    }, function(items) {
        $('#input-lang').val(items.visualCopyOCRname);
        $('#output-lang').val(items.visualCopyTranslatename);
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
                $('#input-lang-' + i).val(language);
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
                visualCopyOCRname: $('#input-name').val(),
                visualCopyTranslatename: $('#output-name').val(),
                visualCopyOCRFontSize: $('#ocr-fontsize').val(),
                // visualCopyAutoProcess: $('.auto-process').hasClass('is-checked'),
                visualCopyAutoTranslate: $('.auto-translate').hasClass('is-checked'),
                visualCopySupportDicts: $('.popup-dicts').hasClass('is-checked'),
                visualCopyQuickSelectLangs: quickSelectLangs
            }, function() {
                // Update status to let user know options were saved.
                $('.status-text').addClass('visible');
                setTimeout(function() {
                    $('.status-text').removeClass('visible');
                }, 5000);
            });
        })
        .on('click', '.btn-reset', function() {
            $('#input-name').val(DEFAULT_OCR_name);
            $('#output-name').val(DEFAULT_TO_name);
            $('#ocr-fontsize').val(DEFAULT_OCR_FONTSIZE);
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