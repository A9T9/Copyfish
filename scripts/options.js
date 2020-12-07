window.browser = (function () {
  return window.msBrowser ||
    window.browser ||
    window.chrome;
})();

$(function () {
  $.ajaxSetup({ cache: false });
  'use strict';
  let engine, OPTIONS;
  $.getJSON(browser.extension.getURL('config/config.json'))
    .done(function (appConfig) {
      var suppressSaves;
      var defaults = appConfig.defaults;
      var ocrnameArray = appConfig.ocr_languages;
      var statusTimeout;

      var checkBoxes = {
        visualCopyAutoTranslate: [ '.auto-translate', defaults.visualCopyAutoTranslate ],
        visualCopySupportDicts: [ '.popup-dicts', defaults.visualCopySupportDicts ],
        copyAfterProcess: [ '.copy-auto', defaults.copyAfterProcess ],
        visualCopyTextOverlay: [ '.text-overlay', defaults.visualCopyTextOverlay ]
      };


      //free plan
      $('.show_status').each(function (index, el) {
        $(this).text(defaults.status);
      });

      var setChromeSyncStorage = function (obj) {
        browser.storage.sync.set(obj, function () {
          // Update status to let user know options were saved.
          $('.status-text').addClass('visible');
          clearTimeout(statusTimeout);
          statusTimeout = setTimeout(function () {
            $('.status-text').removeClass('visible');
          }, 5000);
        });
      };
      // // render the Input Language select box
      // var htmlStrArr = $(ocrnameArray).map(function (i, val) {
      // 	return '<option value="' + val.lang + '">' + val.name + '</option>';
      // });
      //
      //
      //
      // $('#input-lang').html(htmlStrArr.toArray().join(' '));
      // htmlStrArr.splice(0, htmlStrArr.length);
      //
      // // render the quick select checkboxes
      // htmlStrArr = $(ocrnameArray).map(function (i, val) {
      // 	return '<option value="' + val.lang + '" data-shhort="' + val.short + '">' + val.name + '-' + val.short + '</option>';
      // });
      // $('.lang-quickselect').each(function (i, node) {
      // 	$(node).append(htmlStrArr.toArray().join(' '));
      // });
      // htmlStrArr.splice(0, htmlStrArr.length);

      // fetch options while defaulting them when unavailable
      browser.storage.sync.get({
        visualCopyOCRLang: defaults.visualCopyOCRLang,
        visualCopyTranslateLang: defaults.visualCopyTranslateLang,
        visualCopyAutoTranslate: defaults.visualCopyAutoTranslate,
        visualCopyOCRFontSize: defaults.visualCopyOCRFontSize,
        visualCopySupportDicts: defaults.visualCopySupportDicts,
        copyAfterProcess: defaults.copyAfterProcess,
        copyType: defaults.copyType,
        visualCopyQuickSelectLangs: defaults.visualCopyQuickSelectLangs,
        visualCopyTextOverlay: defaults.visualCopyTextOverlay,
        openGrabbingScreenHotkey: defaults.openGrabbingScreenHotkey,
        closePanelHotkey: defaults.closePanelHotkey,
        copyTextHotkey: defaults.copyTextHotkey,
        ocrEngine: defaults.ocrEngine,
        transitionEngine: defaults.transitionEngine,
        status: defaults.status

      }, function (items) {
        OPTIONS = items;
        console.log('settings', items);
        //pro status
        engine = items.ocrEngine;
        if (items.ocrEngine === "OcrSpaceSecond") $('#OcrSpaceSecond').click();
        if (items.status === 'PRO') {
          $('.show_status').each(function (index, el) {
            $(this).text(items.status);
          });
          $('#OcrGoogle').removeAttr('disabled').parents().removeClass('is-disabled');
        } else if (items.status === 'PRO+') {

          $('.show_status').each(function (index, el) {
            $(this).text(items.status);
          });

          $('#copy_translation').removeAttr('disabled').parents().removeClass('is-disabled');
          $('#copy_both').removeAttr('disabled').parents().removeClass('is-disabled');
          $('#OcrGoogle').removeAttr('disabled').parents().removeClass('is-disabled');
          $('#YandexTranslator').removeAttr('disabled').parents().removeClass('is-disabled');
          $('#GoogleTranslator').removeAttr('disabled').parents().removeClass('is-disabled');
          $('#switch-auto-translate').removeAttr('disabled').parents().removeClass('is-disabled');
        } else if (items.status === 'Free Plan') {
          const $OcrSpace = $('#OcrSpace');
          if (!$OcrSpace.attr('checked')) {
            items.ocrEngine === "OcrSpaceSecond" ? $('#OcrSpaceSecond').click() : $('#OcrSpace').click();
            setTimeout(() => {
              $('.status-text').removeClass('visible');
            }, 100)

          }

        }
        //radio buttons values
        $(`#${items.ocrEngine}`).attr('checked', 'checked').parent().addClass('is-checked');

        //copy options
        $(`.copy-options[value=${items.copyType}]`).attr('checked', 'checked').closest('label').addClass('is-checked');

        if (!items.copyAfterProcess) $('.copy-options').each((i, el) => $(el).prop('disabled', true).closest('label').addClass('is-disabled'));

        //get  translationEngine value   in chrome storage and check it
        $(`#${items.transitionEngine}`).attr('checked', 'checked').parent().addClass('is-checked');

        if (items.transitionEngine == "GoogleTranslator") {
          //render translate api language
          var translateArray = appConfig.google_languages;
          var translateLangArray = $(translateArray).map(function (i, val) {
            let langCode = Object.keys(val)[ 0 ];

            return '<option value="' + langCode + '">' + val[ langCode ] + '</option>';
          });

          $('#output-lang').html(translateLangArray.toArray().join(' '));

        } else if (items.transitionEngine == "YandexTranslator") {

          //render translate api language
          var translateArray = appConfig.yandex_languages;
          var translateLangArray = $(translateArray).map(function (i, val) {
            let langCode = Object.keys(val)[ 0 ];

            return '<option value="' + langCode + '">' + val[ langCode ] + '</option>';
          });

          $('#output-lang').html(translateLangArray.toArray().join(' '));
        }
        if (items.ocrEngine == "OcrGoogle") {

          var ocrnameArray = appConfig.ocr_google_languages;
          // render the Input Language select box
          var htmlStrArr = $(ocrnameArray).map(function (i, val) {
            return '<option value="' + val.lang + '">' + val.name + '</option>';
          });

          $('#input-lang').html(htmlStrArr.toArray().join(' '));
          htmlStrArr.splice(0, htmlStrArr.length);

          // render the quick select checkboxes
          htmlStrArr = $(ocrnameArray).map(function (i, val) {
            return '<option value="' + val.lang + '" data-short="' + val.short + '">' + val.name + '-' + val.short + '</option>';
          });
          $('.lang-quickselect').each(function (i, node) {
            $(node).append(htmlStrArr.toArray().join(' '));
          });
          htmlStrArr.splice(0, htmlStrArr.length);
        } else if (items.ocrEngine == "OcrSpace") {

          //render translate api language
          var translateArray = appConfig.yandex_languages;
          var translateLangArray = $(translateArray).map(function (i, val) {
            let langCode = Object.keys(val)[ 0 ];

            return '<option value="' + langCode + '">' + val[ langCode ] + '</option>';
          });

          $('#output-lang').html(translateLangArray.toArray().join(' '));


          var ocrnameArray = appConfig.ocr_languages;
          // render the Input Language select box
          var htmlStrArr = $(ocrnameArray).map(function (i, val) {
            return '<option value="' + val.lang + '">' + val.name + '</option>';
          });

          $('#input-lang').html(htmlStrArr.toArray().join(' '));
          htmlStrArr.splice(0, htmlStrArr.length);
          // render the quick select checkboxes
          htmlStrArr = $(ocrnameArray).map(function (i, val) {
            return '<option value="' + val.lang + '" data-short="' + val.short + '">' + val.name + '-' + val.short + '</option>';
          });
          $('.lang-quickselect').each(function (i, node) {
            $(node).append(htmlStrArr.toArray().join(' '));
          });
          htmlStrArr.splice(0, htmlStrArr.length);
        }

        // don't persist any triggered changes
        suppressSaves = true;

        if (items.ocrEngine === "OcrSpace") {
          $('#input-lang').val(items.visualCopyOCRLang);
        }

        $('#output-lang').val(items.visualCopyTranslateLang);
        $('#ocr-fontsize').val(items.visualCopyOCRFontSize);
        /*set checkbox state(s)*/
        $.each(checkBoxes, function (key, value) {
          console.log(items[ key ], value[ 0 ], 123123)
          if ((!items[ key ] && $(value[ 0 ]).hasClass('is-checked')) ||
            (items[ key ] && !$(value[ 0 ]).hasClass('is-checked'))) {
            $('#switch-' + value[ 0 ].substr(1)).click();
          }
        });
        if (!items.visualCopyQuickSelectLangs.length) {
          $('.lang-quickselect').each(function (i, node) {
            $(node).val('none');
          });
        } else {
          $.each(items.visualCopyQuickSelectLangs, function (i, language) {
            $('#input-lang-' + (i + 1)).val(language);
          });
        }
        // hotkey
        $('#openHotkey').val(items.openGrabbingScreenHotkey);
        $('#closeHotkey').val(items.closePanelHotkey);
        $('#copyHotkey').val(items.copyTextHotkey);
        suppressSaves = false;
      });

      $('body')
        .on('change', function (e) {
          var $target = $(e.target);
          var quickSelectLangs = [];
          if (suppressSaves) {
            return true;
          }
          if ($target.is('#input-lang')) {
            setChromeSyncStorage({
              visualCopyOCRLang: $('#input-lang').val()
            });
          } else if ($target.is('#output-lang')) {
            setChromeSyncStorage({
              visualCopyTranslateLang: $target.val()
            });
          } else if ($target.is('#ocr-fontsize')) {
            setChromeSyncStorage({
              visualCopyOCRFontSize: $target.val()
            });
          } else if ($target.is('#output-lang')) {
            setChromeSyncStorage({
              visualCopyOCRLang: $target.val()
            });
          } else if ($target.is('#switch-auto-translate')) {
            setChromeSyncStorage({
              visualCopyAutoTranslate: $target.parent().hasClass('is-checked')
            });
          } else if ($target.is('#switch-popup-dicts')) {
            setChromeSyncStorage({
              visualCopySupportDicts: $target.parent().hasClass('is-checked')
            });
          } else if ($target.is('#switch-copy-auto')) {
            let optionStatus = $target.parent().hasClass('is-checked')
            if (!optionStatus) $('.copy-options').each((i, el) => $(el).prop('disabled', true).closest('label').addClass('is-disabled'))
            else if (OPTIONS.status !== "PRO+") $('#copy_text').prop('disabled', false).closest('label').removeClass('is-disabled')
            else $('.copy-options').each((i, el) => $(el).prop('disabled', false).closest('label').removeClass('is-disabled'))

            setChromeSyncStorage({
              copyAfterProcess: optionStatus
            });
          } else if ($target.is('.copy-options')) {
            setChromeSyncStorage({
              copyType: $target.val()
            });
          } else if ($target.is('#switch-text-overlay')) {
            setChromeSyncStorage({
              visualCopyTextOverlay: $target.parent().hasClass('is-checked')
            });
          } else if ($target.is('.lang-quickselect')) {
            $('.lang-quickselect').each(function (i, node) {
              quickSelectLangs.push($(node).val());
            });
            setChromeSyncStorage({
              visualCopyQuickSelectLangs: quickSelectLangs
            });
          } else if ($target.is("#openHotkey")) {
            setChromeSyncStorage({
              openGrabbingScreenHotkey: +$target.val()
            });
          } else if ($target.is("#closeHotkey")) {
            setChromeSyncStorage({
              closePanelHotkey: +$target.val()
            });
          } else if ($target.is("#copyHotkey")) {
            setChromeSyncStorage({
              copyTextHotkey: +$target.val()
            });
          } else if ($target.is("#OcrSpace")) {

            var ocrnameArray = appConfig.ocr_languages;
            $('.second-engine-text').remove();
            $('.input-language,.input-language-quickselect').removeClass('disabled-background')
            // render the Input Language select box
            var htmlStrArr = $(ocrnameArray).map(function (i, val) {
              return '<option value="' + val.lang + '">' + val.name + '</option>';
            });

            $('#input-lang').prop('disabled', false).html(htmlStrArr.toArray().join(' '));
            htmlStrArr.splice(0, htmlStrArr.length);

            // render the quick select checkboxes
            htmlStrArr = $(ocrnameArray).map(function (i, val) {
              return '<option value="' + val.lang + '" data-short="' + val.short + '">' + val.name + '-' + val.short + '</option>';
            });

            $('.lang-quickselect').each(function (i, node) {
              $(node).children('option').not(':first').remove();
              $(node).append(htmlStrArr.toArray().join(' '));
            });

            htmlStrArr.splice(0, htmlStrArr.length);
            // reset Input Language Quickselect if OcrIsChanged
            console.log(engine, 12312)
            if (engine !== "OcrSpaceSecond") {
              setChromeSyncStorage({
                ocrEngine: $target.val(),
                visualCopyOCRLang: "eng",
                visualCopyQuickSelectLangs: [ "none", "none", "none" ]
              });
            } else {
              setChromeSyncStorage({
                ocrEngine: $target.val()
              })

              browser.storage.sync.get([ 'visualCopyOCRLang', 'visualCopyQuickSelectLangs' ], function ({ visualCopyOCRLang, visualCopyQuickSelectLangs }) {
                $('#input-lang').val(visualCopyOCRLang);

                visualCopyQuickSelectLangs.map((lng, index) => {
                  $('.lang-quickselect').eq(index).val(lng)
                });

              });
            }

            // reset Input Language Quickselect if OcrIsChanged
            $('.lang-quickselect').each(function (i, node) {
              $(node).val('none');
            }).prop('disabled', false);

          } else if ($target.is("#OcrSpaceSecond")) {

            $('#input-lang').text('');
            $('#input-lang').after("<span class='second-engine-text' style='color: #b1b1b1;position: absolute;margin-left: -390px;margin-top: 2px'>Autodetect Latin Characters</span>").prop('disabled', false);
            $('.lang-quickselect').each(function (i, node) {
              $(node).val('none');
            }).prop('disabled', true);

            $('.input-language,.input-language-quickselect').addClass('disabled-background')

            engine = 'OcrSpaceSecond';

            setChromeSyncStorage({
              ocrEngine: $target.val()
            });
          } else if ($target.is("#OcrGoogle")) {
            setChromeSyncStorage({
              ocrEngine: $target.val()
            });
            $('.second-engine-text').remove();
            $('.input-language,.input-language-quickselect').removeClass('disabled-background')
            //render translate api language
            engine = 'OcrGoogle';
            var translateArray = appConfig.google_languages;
            var translateLangArray = $(translateArray).map(function (i, val) {
              let langCode = Object.keys(val)[ 0 ];

              return '<option value="' + langCode + '">' + val[ langCode ] + '</option>';
            });
            setChromeSyncStorage({
              visualCopyTranslateLang: 'en'
            });

            $('#output-lang').html(translateLangArray.toArray().join(' '));
            var ocrnameArray = appConfig.ocr_google_languages;

            // render the Input Language select box
            var htmlStrArr = $(ocrnameArray).map(function (i, val) {
              return '<option value="' + val.lang + '">' + val.name + '</option>';
            });

            $('#input-lang').prop('disabled', false).html(htmlStrArr.toArray().join(' '));
            htmlStrArr.splice(0, htmlStrArr.length);

            // render the quick select checkboxes
            htmlStrArr = $(ocrnameArray).map(function (i, val) {
              return '<option value="' + val.lang + '" data-short="' + val.short + '">' + val.name + '-' + val.short + '</option>';
            });
            $('.lang-quickselect').each(function (i, node) {
              $(node).children('option').not(':first').remove();
              $(node).append(htmlStrArr.toArray().join(' '));
            }).prop('disabled', false);
            htmlStrArr.splice(0, htmlStrArr.length);

            // reset Input Language Quickselect if OcrIsChanged
            setChromeSyncStorage({
              visualCopyOCRLang: "avto",
              visualCopyQuickSelectLangs: [ "none", "none", "none" ]
            });
            // reset Input Language Quickselect if OcrIsChanged
            $('.lang-quickselect').each(function (i, node) {
              $(node).val('none');
            });
          } else if ($target.is("#YandexTranslator")) {
            setChromeSyncStorage({
              transitionEngine: $target.val()
            });

            //render translate api language
            var translateArray = appConfig.yandex_languages;
            var translateLangArray = $(translateArray).map(function (i, val) {
              let langCode = Object.keys(val)[ 0 ];

              return '<option value="' + langCode + '">' + val[ langCode ] + '</option>';
            });

            $('#output-lang').html(translateLangArray.toArray().join(' '));
            setChromeSyncStorage({
              visualCopyTranslateLang: 'en'
            });

          } else if ($target.is("#GoogleTranslator")) {
            setChromeSyncStorage({
              transitionEngine: $target.val()
            });

            //render translate api language
            var translateArray = appConfig.google_languages;
            var translateLangArray = $(translateArray).map(function (i, val) {
              let langCode = Object.keys(val)[ 0 ];

              return '<option value="' + langCode + '">' + val[ langCode ] + '</option>';
            });

            $('#output-lang').html(translateLangArray.toArray().join(' '));
            setChromeSyncStorage({
              visualCopyTranslateLang: 'en'
            });

          } else if ($target.is("#DeepTranslator")) {
            setChromeSyncStorage({
              transitionEngine: $target.val()
            });

            //render translate api language
            var translateArray = appConfig.deepapi_languages;
            var translateLangArray = $(translateArray).map(function (i, val) {
              let langCode = Object.keys(val)[ 0 ];

              return '<option value="' + langCode + '">' + val[ langCode ] + '</option>';
            });

            $('#output-lang').html(translateLangArray.toArray().join(' '));
            setChromeSyncStorage({
              visualCopyTranslateLang: 'en'
            });

          }
        })
        /*.on('click', '.btn-save', function() {
            var quickSelectLangs = [];
            $('.lang-quickselect').each(function(i, node) {
                var $node = $(node);
                quickSelectLangs.push($node.val());
            });
            browser.storage.sync.set({
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
        })*/
        .on('click', '.btn-reset', function () {
          $('#input-lang').val(defaults.visualCopyOCRLang);
          $('#output-lang').val(defaults.visualCopyTranslateLang);
          $('#ocr-fontsize').val(defaults.visualCopyOCRFontSize);
          $.each(checkBoxes, function (key, value) {
            if ((!value[ 1 ] && $(value[ 0 ]).hasClass('is-checked')) ||
              (value[ 1 ] && !$(value[ 0 ]).hasClass('is-checked'))) {
              $('#switch-' + value[ 0 ].substr(1)).click();
            }
          });

          $('.lang-quickselect').each(function (i, node) {
            $(node).val('none');
          });
        })
        .on('submit', 'form[name=mc-embedded-subscribe-form]', function (e) {
          var $this = $(this);
          var url = $this.attr('action') + "&" + $this.serialize();
          window.open(url);
          e.preventDefault();
        });
    });

  // check file access status
  browser.storage.sync.get([ 'fileAccessStatus' ], function (result) {
    const fileAccessStatus = result.fileAccessStatus;

    if (fileAccessStatus) {
      $('.file-access-status-done').css('display', 'block');
    } else if (!fileAccessStatus) {
      $('.file-access-status-error').css('display', 'block');
    }
  });
  //key checker
  $('.keyChecker_btn').click(function (event) {
    checkKey($('.keyChecker_input').val().toLowerCase());
  });

  let xmodule_version;
  //get xmodule version
  browser.runtime.sendMessage({ evt: "getVersion" });
  browser.runtime.sendMessage({ evt: "fileaccessGetVersion" });

  browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

      if (request.evt === "x_module_version") {
        console.log(request.version)
        if (request.version) {
          $('.status-box.xmodule-span span').text(`Installed (${request.version})`).css({ color: "#008000" });
          $('.status-box.xmodule-span a').text('Check for update');

          if (xmodule_version) {
            xmodule_version = false;
            alert(`status updated: Installed (${request.version})`)
          }
        }

      } else if (request.evt === "fileaccess_module_version") {
        console.log(request.version)
        if (request.version) {
          $('.status-box.fileaccess_module-span span').text(`Installed (${request.version})`).css({ color: "#008000" });
          $('.status-box.fileaccess_module-span a').text('Check for update');

          if (xmodule_version) {
            xmodule_version = false;
            alert(`status updated: Installed (${request.version})`)
          }
        }

      } else if (request.evt === "not_installed") {

        alert(`status updated: not Installed`)

      } else if (request.message === 'showXmoduleOption') {
        let $target = $('#xmodule-item');
        $('html, body').stop().animate({
          'scrollTop': $target.offset().top - $(window).height() / 3
        }, 500, 'swing', function () {
          // lets add a div in the background
          $target.css({ border: '0 solid #ff0000' }).animate({
            borderWidth: 3
          }, 1200, function () {
            $target.animate({
              borderWidth: 0
            }, 600);
          });

        });
      } else if (request.message === 'reloadPage') {

        location.reload()
      }

    });

  $('#check-update-xmodule').click(() => {
    browser.runtime.sendMessage({ evt: "getVersion", check: true });
    xmodule_version = true;
  });

  $('#check-update-fileaccess').click(() => {
    browser.runtime.sendMessage({ evt: "fileaccessGetVersion", check: true });
    xmodule_version = true;
  });

  function checkKey(keyData) {
    let key = keyData;
    let keyChar = key.substr(1, 9);
    if (key.length === 20) {

      if (key.charAt(1) === 'p') {

        $.get("https://a9t9.com/xcopyfish/" + keyChar + ".json", function (data, status, xhr) {
          if (xhr.status == 200) {
            browser.storage.sync.set({ "key": key });

            browser.runtime.sendMessage({ evt: "checkKey" });

            if ($('.show_status').text() === 'PROPRO') {
              $('#status_msg').text("PRO plan already activated");

              setTimeout(function () {
                $('#status_msg').text("");
              }, 3000);
            } else {
              $('.show_status').each(function (index, el) {
                $(this).text('PRO');
              });

              $('.copy-options:not(#copy_text)').each((i, el) => $(el).prop('disabled', true).closest('label').addClass('is-disabled'))

              $('#OcrGoogle').removeAttr('disabled').click().parents().removeClass('is-disabled');

              $('#status_msg_success').text("PRO plan activated");

              setTimeout(function () {
                $('#status_msg_success').text("");
              }, 3000);

              $.get("https://a9t9.com/xcopyfish/" + keyChar + ".json", function (data, status, xhr) {
                browser.storage.sync.set({ status: 'PRO', google_ocr_api_url: data.google_ocr_api_url, google_ocr_api_key: data.google_ocr_api_key });
              });

            }

            $('#copy_text').attr('checked', 'checked').closest('label').addClass('is-checked');
          }
        }).fail(function (data, status, xhr) {

          $.get("https://a9t9.com/xcopyfish/onlinetest.json", function (data) {

          }).fail(function (data, status, xhr) {
            if (data.status == 200) {
              $('#status_msg').text("Invalid key");
              setTimeout(function () {
                $('#status_msg').text("");
              }, 3000);

            } else if (data.status == 404) {
              $('#status_msg').text("License server can not be reached. Please try again.");
              setTimeout(function () {
                $('#status_msg').text("");
              }, 3000);
            }

          })

        })

        $('.keyChecker_input').val('');


      } else if (key.charAt(1) === 't') {

        $.get("https://a9t9.com/xcopyfish/" + keyChar + ".json", function (data, status, xhr) {
          if (xhr.status == 200) {
            browser.storage.sync.set({ "key": key });
            browser.runtime.sendMessage({ evt: "checkKey" });
            $('.show_status').each(function (index, el) {
              $(this).text('PRO+');
            });
            $('.copy-options').each((i, el) => $(el).prop('disabled', false).closest('label').removeClass('is-disabled'))
            $('#copy_text').attr('checked', 'checked').closest('label').addClass('is-checked');
            $('#OcrGoogle').removeAttr('disabled').click().parents().removeClass('is-disabled');
            $('#YandexTranslator').removeAttr('disabled').parents().removeClass('is-disabled');
            $('#GoogleTranslator').removeAttr('disabled').click().parents().removeClass('is-disabled');
            $('#switch-auto-translate').removeAttr('disabled').click().parents().removeClass('is-disabled');
            $('#output-lang').removeAttr('disabled');

            $('#status_msg_success').text("PRO+ plan activated");
            setTimeout(function () {
              $('#status_msg_success').text("");
            }, 3000);
            $.get("https://a9t9.com/xcopyfish/" + keyChar + ".json", function (data, status, xhr) {
              browser.storage.sync.set({ status: 'PRO+', google_ocr_api_url: data.google_ocr_api_url, google_ocr_api_key: data.google_ocr_api_key, google_trs_api_url: data.google_trs_api_url, google_trs_api_key: data.google_trs_api_key });

            });

          }
        }).fail(function (data, status, xhr) {

          $.get("https://a9t9.com/xcopyfish/onlinetest.json", function (data) {

          }).fail(function (data, status, xhr) {
            if (data.status == 200) {
              $('#status_msg').text("Invalid key");
              setTimeout(function () {
                $('#status_msg').text("");
              }, 3000);
            } else if (data.status == 404) {
              $('#status_msg').text("License server can not be reached. Please try again later");
              setTimeout(function () {
                $('#status_msg').text("");
              }, 3000);
            }

          })

        })
        $('.keyChecker_input').val('');
      } else {

        $('#status_msg').text('Invalid key');
        setTimeout(function () {
          $('#status_msg').text("");
        }, 3000);
        $('.keyChecker_input').val('');
      }


    } else {
      //if key.length !== 15
      $('#status_msg').text('Invalid key');
      setTimeout(function () {
        $('#status_msg').text("");
      }, 3000);
    }
    //		$('.keyChecker_input').val('');
  }










  $('.keyChecker_input').keypress(function (e) {
    if (e.which == 13) { //Enter key pressed
      $('.keyChecker_btn').click(); //Trigger search button click event
    } else if (e.which == 32) {
      //disable space button
      return e.which !== 32;
    }
  });

  //check plan button code

  $('#check-status-btn').click(function (e) {
    browser.runtime.sendMessage({ evt: "checkKey" });
  })

  //trim text in past in password field
  $(document).on('paste', '.keyChecker_input', function (e) {
    e.preventDefault();
    // prevent copying action
    const text = e.originalEvent.clipboardData.getData('Text')
    let withoutSpaces = text.trim();

    $(this).val(withoutSpaces);

  });
  //trim text in drop in password field
  $(document).on('drop', '.keyChecker_input', function (e) {
    e.preventDefault();
    // prevent copying action
    const text = e.originalEvent.dataTransfer.getData('Text')
    let withoutSpaces = text.trim();

    $(this).val(withoutSpaces);

  });

});
