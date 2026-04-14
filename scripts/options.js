window.browser = (function () {
  return window.msBrowser ||
  window.browser ||
  window.chrome;
})();

$(function () {
  var configSetting = {};
  let dialogOverlay = window.__copyFishHtmlDialog__;
  let $readyMsgDialog = _bootStrapMessageDialog()
  $.ajaxSetup({ cache: false });
  'use strict';
  let engine, OPTIONS,ocrnameArrayForLOcal;

  function getOS() {
    var userAgent = window.navigator.userAgent,
    platform = window.navigator.platform,
    macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K'],
    windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE'],
    iosPlatforms = ['iPhone', 'iPad', 'iPod'],
    os = null;

    if (macosPlatforms.indexOf(platform) !== -1) {
      os = 'Mac OS';
    } else if (iosPlatforms.indexOf(platform) !== -1) {
      os = 'iOS';
    } else if (windowsPlatforms.indexOf(platform) !== -1) {
      os = 'Windows';
    } else if (/Android/.test(userAgent)) {
      os = 'Android';
    } else if (!os && /Linux/.test(platform)) {
      os = 'Linux';
    }

    return os;
  }
  function getScreenshotVersion() {
    createNMPromise("getVersion").
    then(result => {
      $('.status-box.xmodule-span span:first-of-type').text(`Installed (${result.version})`).css({ color: "#008000" });
      $('.status-box.xmodule-span a:first-of-type').text('Check for update');
    });
  }
  function _bootStrapMessageDialog() {
    let $dfd = $.Deferred();
    if ($('#cfish-popup-message-dialog').length) {
      $dfd.resolve();
      return $dfd;
    }
    //dialogOverlay && dialogOverlay.init();
    $.when(
      $.get(browser.runtime.getURL('/message-dialog.html')),
      
      ).done(function (messageDialogHtml) {
        $('body').append(messageDialogHtml);
        $dfd.resolve();
      })
      .fail(function (err) {
        $dfd.reject();
        logError('Failed to initialize', err);
      });

      return $dfd;
    }
    function testScreenshot() {
      createNMPromise("testScreenshot").
      then(result => {
        var resultText = $('.status-box.xmodule-span span:nth-of-type(2)');
        var enableLink = $('.status-box.xmodule-span a:nth-of-type(2)');
        var shutterText = $('#xmodule-shutter');
        if (result.result) {
          resultText.text('Enabled').css({ color: "#008000", opacity: 0 }).animate({ opacity: 1 }, 1000);
          enableLink.css({ display: "none" });
          shutterText.css({ display: "" });
        }
        else {
          resultText.text('Disabled').css({ color: "red", opacity: 0 }).animate({ opacity: 1 }, 1000);
          if (result.error === 'shutter') {
            enableLink.css({ display: "none" });
            shutterText.css({ display: "initial" });
          }
          else {
            enableLink.css({ display: "" });
            shutterText.css({ display: "" });
          }
        }
      }).
      catch(() => {
        $('.status-box.xmodule-span span:nth-of-type(2)').text('Disabled').css({ color: "red", opacity: 0 }).animate({ opacity: 1 }, 1000);
        $('.status-box.xmodule-span a:nth-of-type(2)').css({ display: "none" });
      });
    }
    $.getJSON(browser.runtime.getURL('config/config.json'))
    .done(function (appConfig) {
      var suppressSaves;
      var defaults = appConfig.defaults;
      var ocrnameArray = appConfig.ocr_languages;
      ocrnameArrayForLOcal=ocrnameArray;
      var statusTimeout;
      var checkBoxes = {
        visualCopySupportDicts: [ '.popup-dicts', defaults.visualCopySupportDicts ],
        useTableOcr: [ '.table-ocr', defaults.useTableOcr ],
        useDefaultDesktopOcr: [ '.usedesktop-ocr', defaults.useDefaultDesktopOcr ],
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
      // htmlStrArr.splice(0, htmlStrArr.length);

      // fetch options while defaulting them when unavailable
      browser.storage.sync.get({
        visualCopyOCRLang: defaults.visualCopyOCRLang,
        visualCopyOCRFontSize: defaults.visualCopyOCRFontSize,
        visualCopySupportDicts: defaults.visualCopySupportDicts,
        useTableOcr: defaults.useTableOcr || '',
        useDefaultDesktopOcr: defaults.useDefaultDesktopOcr,
        copyAfterProcess: defaults.copyAfterProcess,
        copyType: defaults.copyType,
        visualCopyTextOverlay: 1, // make it default always on defaults.visualCopyTextOverlay,
        openGrabbingScreenHotkey: defaults.openGrabbingScreenHotkey,
        closePanelHotkey: defaults.closePanelHotkey,
        copyTextHotkey: defaults.copyTextHotkey,
        ocrEngine: defaults.ocrEngine,
        status: defaults.status,
      }, function (items) {

        items.visualCopyTextOverlay = 1;
        OPTIONS = items;
        console.log(items)
        engine = items.ocrEngine;
        if (items.ocrEngine === "OcrSpaceSecond"){
         $('#OcrSpaceSecond').click();
       }
        if (items.ocrEngine === "OcrSpaceThird"){
         $('#OcrSpaceThird').click();
       }
       if (items.status === 'PRO') {
        $('.show_status').each(function (index, el) {
          $(this).text(items.status);
        });
        $('#OcrLocal').removeAttr('disabled').parents().removeClass('is-disabled');
        $(".upgrade_status").show();
      } else if (items.status === 'PRO+') {

        $('.show_status').each(function (index, el) {
          $(this).text(items.status);
        });
        $(".upgrade_status").hide();
        $('#OcrLocal').removeAttr('disabled').parents().removeClass('is-disabled');
      } else if (items.status === 'Free Plan') {
        const $OcrSpace = $('#OcrSpace');
        if (!$OcrSpace.attr('checked')) {
            //items.ocrEngine === "OcrSpaceSecond" ? $('#OcrSpaceSecond').click() : $('#OcrSpace').click();
            $('#'+items.ocrEngine).click()
            setTimeout(() => {
              $('.status-text').removeClass('visible');
            }, 100)
          }
          $(".upgrade_status").show();

        } else if (items.status === 'Subscription expired') {
          $(".upgrade_status").show();
          const $OcrSpace = $('#OcrSpace');
          if (!$OcrSpace.attr('checked')) {
            //items.ocrEngine === "OcrSpaceSecond" ? $('#OcrSpaceSecond').click() : $('#OcrSpace').click();
            $('#'+items.ocrEngine).click()
            setTimeout(() => {
              $('.status-text').removeClass('visible');
            }, 100)
          }
          $('.show_status').each(function (index, el) {
            $(this).text(items.status);
          });
        }
        //radio buttons values
        $(`#${items.ocrEngine}`).attr('checked', 'checked').parent().addClass('is-checked');

        //copy options
        $(`.copy-options[value=${items.copyType}]`).attr('checked', 'checked').closest('label').addClass('is-checked');

        if (!items.copyAfterProcess) $('.copy-options').each((i, el) => $(el).prop('disabled', true).closest('label').addClass('is-disabled'));

        // don't persist any triggered changes
        suppressSaves = true;

        if (items.ocrEngine === "OcrSpace") {
          $('#input-lang').val(items.visualCopyOCRLang);
        }

        $('#ocr-fontsize').val(items.visualCopyOCRFontSize);
        /*set checkbox state(s)*/
        $.each(checkBoxes, function (key, value) {
          if ((!items[ key ] && $(value[ 0 ]).hasClass('is-checked')) ||
            (items[ key ] && !$(value[ 0 ]).hasClass('is-checked'))) {
            $('#switch-' + value[ 0 ].substr(1)).click();
        }
      });
        // hotkey
        $('#openHotkey').val(items.openGrabbingScreenHotkey);
        $('#closeHotkey').val(items.closePanelHotkey);
        $('#copyHotkey').val(items.copyTextHotkey);
        suppressSaves = false;
      });


$('body')
.on('change', function (e) {
  var $target = $(e.target);
  var localOcrLangs = [];

  if (suppressSaves) {
    return true;
  }
  if ($target.is('#input-lang')) {
    setChromeSyncStorage({
      visualCopyOCRLang: $('#input-lang').val()
    });
  } else if ($target.is('#ocr-fontsize')) {
    setChromeSyncStorage({
      visualCopyOCRFontSize: $target.val()
    });
  } else if ($target.is('#switch-popup-dicts')) {
    setChromeSyncStorage({
      visualCopySupportDicts: $target.parent().hasClass('is-checked')
    });
  } else if ($target.is('#switch-table-ocr')) {
    setChromeSyncStorage({
      useTableOcr: $target.parent().hasClass('is-checked')
    });
  }  else if ($target.is('#switch-usedesktop-ocr')) {
    setChromeSyncStorage({
      useDefaultDesktopOcr: $target.parent().hasClass('is-checked')
    });
  }else if ($target.is('#switch-copy-auto')) {
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
      } else if ($target.is("#OcrLocal")) {
            //get languages json from exe command line
            /*check OS type first*/ 
            const osType = getOS();
            if (osType == "Linux" ) {
              var msg = 'Local OCR not supported for Linux!!';

              let buttons = [
              {
                label: 'Ok',
                cb: () => { dialogOverlay.closeDialog(); }
              }
              ];
              dialogOverlay.hardClose();
              $("#OcrLocal").attr('LocalOcrFound','NO');
              setTimeout(function () {
                dialogOverlay.showDialog('Copyfish', msg, buttons);
              }, 1000);

              return;

            }
            browser.runtime.sendMessage({
              evt: 'getLocalOCRLangauges'
            }).then(function (response) {
              const resultLangs = response.result;
              var ocrnameArray = ocrnameArrayForLOcal;
              if (!resultLangs) {
                $("#OcrLocal").attr('LocalOcrFound','NO');
                var msg = 'Error 101: XModule OCR not found. -> Did you install the XModules yet? If you did - and still see this error - please report the issue to tech support.';

                let buttons = [
                {
                  label: 'Ok',
                  cb: () => { dialogOverlay.closeDialog(); }
                }
                ];
                dialogOverlay.hardClose();
                setTimeout(function () {
                  dialogOverlay.showDialog('Copyfish', msg, buttons);
                }, 1000);

                return;
              }
              $('.second-engine-text').remove();
              $('.input-language').removeClass('disabled-background')

              var htmlStrArr = $(ocrnameArray).map(function (i, val) {
                if(jQuery.inArray(val.lang, resultLangs) !== -1){
                  return '<option value="' + val.lang + '">' + val.name + '</option>';
                }
              });
              setChromeSyncStorage({
                localOcrLangs: resultLangs
              });

              $('#input-lang').prop('disabled', false).html(htmlStrArr.toArray().join(' '));
              htmlStrArr.splice(0, htmlStrArr.length);

            // render the quick select checkboxes
            htmlStrArr = $(ocrnameArray).map(function (i, val) {
              return '<option value="' + val.lang + '" data-short="' + val.short + '">' + val.name + '-' + val.short + '</option>';
            });


            htmlStrArr.splice(0, htmlStrArr.length);

            browser.storage.sync.get([ 'visualCopyOCRLang' ], function ({ visualCopyOCRLang }) {
              $('#input-lang').val(visualCopyOCRLang);
              setChromeSyncStorage({
                ocrEngine: 'OcrLocal',
                visualCopyOCRLang: $('#input-lang').val(),
              });
            });

          })
          }
          else if ($target.is("#OcrSpace")) {

            var ocrnameArray = appConfig.ocr_languages;
            $('.second-engine-text').remove();
            $('.input-language').removeClass('disabled-background')
            // render the Input Language select box
            var htmlStrArr = $(ocrnameArray).map(function (i, val) {
              return '<option value="' + val.lang + '">' + val.name + '</option>';
            });

            $('#input-lang').prop('disabled', false).html(htmlStrArr.toArray().join(' '));
            htmlStrArr.splice(0, htmlStrArr.length);

            if (engine !== "OcrSpaceSecond") {
              setChromeSyncStorage({
                ocrEngine: $target.val(),
                visualCopyOCRLang: $('#input-lang').val(),
              });
            } else {
              setChromeSyncStorage({
                ocrEngine: $target.val()
              });
              browser.storage.sync.get([ 'visualCopyOCRLang' ], function ({ visualCopyOCRLang }) {
                $('#input-lang').val(visualCopyOCRLang);
              });
            }

          } else if ($target.is("#OcrSpaceSecond")) {

            $('#input-lang').text('');
            $('#input-lang').after("<span class='second-engine-text' style='color: #b1b1b1;position: absolute;margin-left: -390px;margin-top: 2px'>Autodetect Language</span>").prop('disabled', false);

            $('.input-language').addClass('disabled-background')

            engine = 'OcrSpaceSecond';

            setChromeSyncStorage({
              ocrEngine: $target.val()
            });
          } else if ($target.is("#OcrSpaceThird")) {

            $('#input-lang').text('');
            $('#input-lang').after("<span class='second-engine-text' style='color: #b1b1b1;position: absolute;margin-left: -390px;margin-top: 2px'>Autodetect Language</span>").prop('disabled', false);

            $('.input-language').addClass('disabled-background')

            engine = 'OcrSpaceThird';

            setChromeSyncStorage({
              ocrEngine: $target.val()
            });
          } else if ($target.is("#OcrLocal")) {
            setChromeSyncStorage({
              ocrEngine: $target.val()
            });
            $('.second-engine-text').remove();
            $('.input-language').removeClass('disabled-background')
            engine = 'OcrLocal';
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
            htmlStrArr.splice(0, htmlStrArr.length);

            // reset Input Language Quickselect if OcrIsChanged
            setChromeSyncStorage({
              visualCopyOCRLang: "auto",
            });
            // reset Input Language Quickselect if OcrIsChanged
          }
        })
        /*.on('click', '.btn-save', function() {
            var quickSelectLangs = [];
            browser.storage.sync.set({
                visualCopyOCRLang: $('#input-lang').val(),
                visualCopyOCRFontSize: $('#ocr-fontsize').val(),
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
            $('#ocr-fontsize').val(defaults.visualCopyOCRFontSize);
            $.each(checkBoxes, function (key, value) {
              if ((!value[ 1 ] && $(value[ 0 ]).hasClass('is-checked')) ||
                (value[ 1 ] && !$(value[ 0 ]).hasClass('is-checked'))) {
                $('#switch-' + value[ 0 ].substr(1)).click();
            }
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

  //get xmodule version
  getScreenshotVersion();
  testScreenshot();
  browser.runtime.sendMessage({ evt: "fileaccessGetVersion" });
  browser.runtime.sendMessage({ evt: "fileaccessTest" });
  browser.storage.sync.set({ localOcrInstalled: false });
  browser.runtime.sendMessage({ evt: "fileaccessGetVersionLocal" });
  browser.runtime.sendMessage({ evt: "fileaccessTestOcrLocal" });


  browser.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {

      if (request.evt === "fileaccess_module_version") {
        console.log(request.version)
        if (request.version) {
          $('.status-box.fileaccess_module-span span:first-of-type').text(`Installed (${request.version})`).css({ color: "#008000" });
          $('.status-box.fileaccess_module-span a').text('Check for update');
          
        }
      }else if(request.evt === "fileaccess_module_version_local"){
        $('.status-box.local_fileaccess_module-span span:first-of-type').text(`Installed`).css({ color: "#008000" });
        $('.status-box.local_fileaccess_module-span a').text('Check for update');
        browser.storage.sync.set({ localOcrInstalled: true });
      }
      else if (request.evt === "fileaccess_module_test") {
        if (request.result) {
          $('.status-box.status-box.fileaccess_module-span span:nth-of-type(2)').text('Enabled').css({ color: "#008000", opacity: 0 }).
          animate({ opacity: 1 }, 1000);
        }
        else {
          $('.status-box.status-box.fileaccess_module-span span:nth-of-type(2)').text('Disabled').css({ color: "red", opacity: 0 }).
          animate({ opacity: 1 }, 1000);
        }
      } else if (request.evt === "fileaccess_module_test_local") {
        if (request.result) {
          $('.status-box.local_fileaccess_module-span span:nth-of-type(2)').text('Enabled').css({ color: "#008000", opacity: 0 }).
          animate({ opacity: 1 }, 1000);
        }
        else {
          $('.status-box.local_fileaccess_module-span span:nth-of-type(2)').text('Disabled').css({ color: "red", opacity: 0 }).
          animate({ opacity: 1 }, 1000);
        }
      } else if (request.evt === "not_installed") {

        alert(`status updated: not Installed`)

      } else if (request.message === 'showXmoduleOption') {
        let $target = $('#xmodule-item');
        $('html, body').stop().animate({
          'scrollTop': $target.offset().top - $(window).height() / 3
        }, 500, 'swing', function () {
          //lets add a div in the background
          $target.css({ border: '0 solid #ff0000' }).animate({
            borderWidth: 3
          }, 1200, function () {
            $target.animate({
              borderWidth: 0
            }, 600);
          });

        });
      }
      else if (request.message === 'reloadPage') {

        location.reload()
      }

    });

  $('#check-update-xmodule').click(() =>
    $('.status-box.xmodule-span span:nth-of-type(2)').text('Testing...').delay(500).queue(next => {
      testScreenshot();
      next();
    })
    );

  $('.status-box.xmodule-span a:nth-of-type(2)').click(e => {
    e.preventDefault();
    createNMPromise("enableScreenshot");
  });

  $('#check-update-fileaccess').click(() => {
    $('.status-box.fileaccess_module-span span:nth-of-type(2)').text('Testing...').delay(500).
    queue(next => {
      browser.runtime.sendMessage({ evt: "fileaccessTest" });
      next();
    });
  });

  $('#check-update-fileaccess-local').click(() => {
    $('.status-box.local_fileaccess_module-span span:nth-of-type(2)').text('Testing...').delay(500).
    queue(next => {
      browser.runtime.sendMessage({ evt: "fileaccessTestOcrLocal" });
      next();
    });
  });

  const multipleKeySchema =
  {
    validKeyFound: false,
    urlSchema: [
    {
      url: 'https://license1.ocr.space/api/status?licensekey=',
      legacy: false
    },
    {
      url: 'https://ui.vision/xcopyfish/',
      legacy: true
    }
    ]
  };
  function checkKey(keyData, singleEntity = multipleKeySchema.urlSchema[ 0 ], iteration = 0) {
    try {
      checkLicenseKey(keyData, singleEntity.url, singleEntity.legacy).done(function (result) {
        iteration++;
        //  console.log('first here');
      }).fail(function (err) {
        //    console.log(err, iteration);
        iteration++;
        // if error found and we have any entity left to verify then check..
        if (iteration < multipleKeySchema.urlSchema.length) {
          // clear old message and make space for other messages ...
          $('#status_msg').text("");
          checkKey(keyData, multipleKeySchema.urlSchema[ iteration ], iteration);
        }
      });
    } catch (err) {

    }
  }

  function checkLicenseKey(keyData, urlApi = 'https://ui.vision/xcopyfish/', legacy = true) {
    // const urlApi = 'https://ui.vision/xcopyfish/';
    let $dfd = $.Deferred();
    let key = keyData;
    let keyChar = key.substr(1, 9);
    if (key.length === 20) {
      if (key.charAt(1) === 'p') {
        $.get(legacy ? urlApi + keyChar + ".json" : urlApi + key.toUpperCase(), function (data, status, xhr) {
          if (xhr.status == 200) {
            const ifSuccessRes = function (key) {
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

                        $('#OcrLocal').removeAttr('disabled').click().parents().removeClass('is-disabled');

                $('#status_msg_success').text("PRO plan activated");

                setTimeout(function () {
                  $('#status_msg_success').text("");
                }, 3000);
                let enable = $('#switch-auto-translate').parent().hasClass('is-checked');
                if (enable) {
                  $('#switch-auto-translate').click();
                }
                $('#switch-auto-translate').prop('disabled', true).closest('label').addClass('is-disabled');
                $(".upgrade_status").show();
                        /* Intnly commented*/
                // $.get(urlApi + keyChar + ".json", function (data, status, xhr) {
                //   browser.storage.sync.set({
                //     status: 'PRO',
                //     google_ocr_api_url: data.google_ocr_api_url,
                //     google_ocr_api_key: data.google_ocr_api_key
                //   });
                // });
              }
            }
            if (legacy) {
              ifSuccessRes(key);
              browser.storage.sync.set({
                status: 'PRO',
                google_ocr_api_url: data.google_ocr_api_url || '',
                google_ocr_api_key: data.google_ocr_api_key || ''
              });
              $('#copy_text').attr('checked', 'checked').closest('label').addClass('is-checked');
              $dfd.resolve(data);
            } else {
              if (data && data.status && data.status == 'on') {
                // valid key found.
                ifSuccessRes(key);
                browser.storage.sync.set({
                  status: 'PRO',
                  google_ocr_api_url: data.data1a || '',
                  google_ocr_api_key: data.data1b || ''
                });
                $('#copy_text').attr('checked', 'checked').closest('label').addClass('is-checked');
                $dfd.resolve(data);
              } else if (data && data.status && data.status == 'off') {
                browser.storage.sync.set({ "key": key });
                browser.runtime.sendMessage({ evt: "checkKey" });
                // invalid key or key not found...
                $('#status_msg').text("Subscription Expired");
                setTimeout(function () {
                  $('#status_msg').text("");
                }, 3000);
                $dfd.resolve(data);
              } else {
                // invalid key or key not found...
                $('#status_msg').text("Invalid key");
                setTimeout(function () {
                  $('#status_msg').text("");
                }, 3000);
                $dfd.reject(data);
              }
            }
          } else {
            $dfd.reject(data);
          }
        }).fail(function (data, status, xhr) {
          if ((data && data.status == 200) || !data) {
            $('#status_msg').text("Invalid key");
            setTimeout(function () {
              $('#status_msg').text("");
            }, 3000);
          } else if (data && data.status == 404) {
            $('#status_msg').text("Invalid key");
            //$('#status_msg').text("License server can not be reached. Please try again later");
            setTimeout(function () {
              $('#status_msg').text("");
            }, 3000);
          }
          $dfd.reject(data);
          // $.get(urlApi + "onlinetest.json", function (data) {

          // }).fail(function (data, status, xhr) {
          //   if (data.status == 200) {
          //     $('#status_msg').text("Invalid key");
          //     setTimeout(function () {
          //       $('#status_msg').text("");
          //     }, 3000);

          //   } else if (data.status == 404) {
          //     $('#status_msg').text("License server can not be reached. Please try again.");
          //     setTimeout(function () {
          //       $('#status_msg').text("");
          //     }, 3000);
          //   }

          // })

        });
        $('.keyChecker_input').val('');
      } else if (key.charAt(1) === 't') {
        $.get(legacy ? urlApi + keyChar + ".json" : urlApi + key.toUpperCase(), function (data, status, xhr) {
          if (xhr.status == 200) {
            const successFn = function (key) {
              browser.storage.sync.set({ "key": key });
              browser.runtime.sendMessage({ evt: "checkKey" });
              $('.show_status').each(function (index, el) {
                $(this).text('PRO+');
              });
              $('.copy-options').each((i, el) => $(el).prop('disabled', false).closest('label').removeClass('is-disabled'))
              $('#copy_text').attr('checked', 'checked').closest('label').addClass('is-checked');
                    $('#OcrLocal').removeAttr('disabled').click().parents().removeClass('is-disabled');

              $('#switch-auto-translate').removeAttr('disabled').click().parents().removeClass('is-disabled');
              $('#status_msg_success').text("PRO+ plan activated");
              setTimeout(function () {
                $('#status_msg_success').text("");
              }, 3000);
              $(".upgrade_status").hide();
            }
            if (legacy) {
              $dfd.resolve(data);
              successFn(key);
              browser.storage.sync.set({
                status: 'PRO+',
                google_ocr_api_url: data.google_ocr_api_url || '',
                google_ocr_api_key: data.google_ocr_api_key || '',
              });

              /* temp disabled may be not required
              $.get(urlApi + keyChar + ".json", function (data, status, xhr) {
                browser.storage.sync.set({
                  status: 'PRO+',
                  google_ocr_api_url: data.google_ocr_api_url,
                  google_ocr_api_key: data.google_ocr_api_key,
                  });
              });
              */
            } else {
              // new api call
              if (data && data.status && data.status == 'on') {
                // valid key found.
                successFn(key);
                browser.storage.sync.set({
                  status: 'PRO+',
                  google_ocr_api_url: data.data1a || '',
                  google_ocr_api_key: data.data1b || '',
                });
              } else if (data && data.status && data.status == 'off') {
                browser.storage.sync.set({ "key": key });
                browser.runtime.sendMessage({ evt: "checkKey" });
                // invalid key or key not found...
                $('#status_msg').text("Subscription Expired");
                setTimeout(function () {
                  $('#status_msg').text("");
                }, 3000);
                $dfd.resolve(data);
              } else {
                // invalid key or key not found...
                $('#status_msg').text("Invalid key");
                setTimeout(function () {
                  $('#status_msg').text("");
                }, 3000);
                $dfd.reject(data);
              }
            }
          }
          else {
            $dfd.reject(data);
          }
        }).fail(function (data, status, xhr) {
          if ((data && data.status == 200) || !data) {
            $('#status_msg').text("Invalid key");
            setTimeout(function () {
              $('#status_msg').text("");
            }, 3000);
          } else if (data && data.status == 404) {
            $('#status_msg').text("Invalid key");
            //$('#status_msg').text("License server can not be reached. Please try again later");
            setTimeout(function () {
              $('#status_msg').text("");
            }, 3000);
          }
          // $.get(urlApi + "onlinetest.json", function (data) {

          // }).fail(function (data, status, xhr) {
          //   if (data.status == 200) {
          //     $('#status_msg').text("Invalid key");
          //     setTimeout(function () {
          //       $('#status_msg').text("");
          //     }, 3000);
          //   } else if (data.status == 404) {
          //     $('#status_msg').text("License server can not be reached. Please try again later");
          //     setTimeout(function () {
          //       $('#status_msg').text("");
          //     }, 3000);
          //   }

          // })
          $dfd.reject(data);
        });
        $('.keyChecker_input').val('');
      } else {
        $dfd.reject('invalid_key');
        $('#status_msg').text('Invalid key');
        setTimeout(function () {
          $('#status_msg').text("");
        }, 3000);
        $('.keyChecker_input').val('');
      }


    } else {
      //if key.length !== 15
      $dfd.reject('invalid_key');
      $('#status_msg').text('Invalid key');
      setTimeout(function () {
        $('#status_msg').text("");
      }, 3000);
    }
    return $dfd;
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

$(document).on('click', '#manage-shortcuts', function (e) {
  e.preventDefault();
  var newURL = "chrome://extensions/configureCommands";
  chrome.tabs.create({ url: newURL });``
});
    
});
