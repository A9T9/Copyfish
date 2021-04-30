let messageDialog = (function () {
    let funBlock = {
        init: function () {
            let self = this;
            $(function () {
                $('#downloadHelper').on('click', function () {
                    self.downloadHelperApp();
                });
                $('#downloadReadMore,#readMoreLink').on('click', function () {
                    self.readMore();
                });
                $('body').on('click', '#takeDesktopScreenshot', function () {
                    self.desktopScreenshot();
                });
                $('body').on('click', '#tryWebScreenshot', function () {
                    self.webScreenshot();
                });
                $('body').on('click', '#cancelPopup', function () {
                    self.closePopup();
                });
                self.notLoadedDialog();
            });
        },
        desktopScreenshot: function () {
           
        },
        webScreenshot: function () {
           
        },
        notLoadedDialog: function () {
            let param = this.parseUrlParam('forLoadingPopup');
            if (param == 'on') {
                let message = `
                If this message does not disappear, try reloading the page. Or use the desktop screenshot feature.
                <div class="button-row btn-center">
                <span>
                    <button id='cancelPopup'
                        class="cp-show-dialog-button ocrext-btn mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect mdl-button--accent"
                        title="">
                        Close
                    </button>
                </span>
                </div>
                `;
                $('#cp-dialog-description').html(message);
            }
        },
        parseUrlParam: function (param) {
            try {
                let url = new URL(window.location.href);
                return url.searchParams.get(param);
            }
            catch (err) {
                return '';
            }
        },
        downloadHelperApp: function () {
            this.closePopup();
            window.open('https://ui.vision/rpa/x/download', '_blank');
        },
        readMore: function () {
            this.closePopup();
            window.open('https://ocr.space/rd/copyfish?help=desktop', '_blank');
        },
        closePopup: function () {
            window.close();
        }
    }
    funBlock.init();
    return funBlock;
})();
