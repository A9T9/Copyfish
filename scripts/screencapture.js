'use strict';
var ScreenCap = {
    init: function() {
        var img = new Image();
        var $can = $('#main-canvas');
        var ctx = $can.get(0).getContext('2d');
        this.title = chrome.i18n.getMessage('appName') + ' - ' + chrome.i18n.getMessage('screenCapture');
        $('title,.title').text(this.title);
        $('.placeholder').text(chrome.i18n.getMessage('screenCaptureWaitMessage'));
        chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
            if(sender.tab){
                return true;
            }
            if (request.evt === 'desktopcapture') {
                // enable only if resources are loaded and available
                $can.attr({
                    height: request.height,
                    width: request.width
                });
                img.onload = function() {
                    ctx.drawImage(img, 0, 0, request.width, request.height);
                    sendResponse({
                        farewell: 'desktopcapture:OK'
                    });
                    chrome.runtime.sendMessage({
                        evt:'ready'
                    },function(res){

                    });
                    $('.placeholder')
                        .text(chrome.i18n.getMessage('screenCaptureNotify'))
                        .addClass('notify');
                };
                img.src = request.dataURL;

            }
            // ACK back
            return true;
        });
    },


};

$(ScreenCap.init);