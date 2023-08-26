/// <reference path="../../Scripts/typings/angularjs/angular.d.ts" />
/// <reference path="../Services/html-util.ts" />
var Ally;
(function (Ally) {
    var InfoItem = /** @class */ (function () {
        function InfoItem() {
        }
        return InfoItem;
    }());
    Ally.InfoItem = InfoItem;
    /**
     * The controller for the frequently asked questions widget
     */
    var FAQsController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function FAQsController($http, $rootScope, siteInfo, $cacheFactory, fellowResidents) {
            this.$http = $http;
            this.$rootScope = $rootScope;
            this.siteInfo = siteInfo;
            this.$cacheFactory = $cacheFactory;
            this.fellowResidents = fellowResidents;
            this.isBodyMissing = false;
            this.canManage = false;
            this.headerText = "Information and Frequently Asked Questions (FAQs)";
            this.editingInfoItem = new InfoItem();
            if (AppConfig.appShortName === "home")
                this.headerText = "Home Notes";
        }
        /**
        * Called on each controller after all the controllers on an element have been constructed
        */
        FAQsController.prototype.$onInit = function () {
            var _this = this;
            this.hideDocuments = this.$rootScope["userInfo"].isRenter && !this.siteInfo.privateSiteInfo.rentersCanViewDocs;
            this.canManage = this.siteInfo.userInfo.isAdmin || this.siteInfo.userInfo.isSiteManager;
            // Make sure committee members can manage their data
            if (this.committee && !this.canManage)
                this.fellowResidents.isCommitteeMember(this.committee.committeeId).then(function (isCommitteeMember) { return _this.canManage = isCommitteeMember; });
            this.faqsHttpCache = this.$cacheFactory.get("faqs-http-cache") || this.$cacheFactory("faqs-http-cache");
            this.retrieveInfo();
            // Hook up the rich text editor
            Ally.HtmlUtil2.initTinyMce("tiny-mce-editor", 500).then(function (e) { return _this.tinyMceEditor = e; });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Populate the info section
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.retrieveInfo = function () {
            var _this = this;
            this.isLoadingInfo = true;
            if (!this.getUri) {
                this.getUri = "/api/InfoItem";
                if (this.committee)
                    this.getUri = "/api/InfoItem/Committee/" + this.committee.committeeId;
            }
            this.$http.get(this.getUri, { cache: this.faqsHttpCache }).then(function (httpResponse) {
                _this.isLoadingInfo = false;
                _this.infoItems = httpResponse.data;
                // Make <a> links open in new tabs
                setTimeout(function () {
                    for (var i = 0; i < _this.infoItems.length; ++i)
                        RichTextHelper.makeLinksOpenNewTab("info-item-body-" + i);
                }, 500);
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Scroll to an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.scrollToInfo = function (infoItemIndex) {
            document.getElementById("info-item-title-" + infoItemIndex).scrollIntoView();
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user edits an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onStartEditInfoItem = function (infoItem) {
            // Clone the object
            this.editingInfoItem = jQuery.extend({}, infoItem);
            this.tinyMceEditor.setContent(this.editingInfoItem.body);
            // Scroll down to the editor
            window.scrollTo(0, document.body.scrollHeight);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to add a new info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onSubmitItem = function () {
            var _this = this;
            this.editingInfoItem.body = this.tinyMceEditor.getContent();
            this.isBodyMissing = HtmlUtil.isNullOrWhitespace(this.editingInfoItem.body);
            var validateable = $("#info-item-edit-form");
            validateable.validate();
            if (!validateable.valid() || this.isBodyMissing)
                return;
            if (this.committee)
                this.editingInfoItem.committeeId = this.committee.committeeId;
            this.isLoadingInfo = true;
            var onSave = function () {
                _this.isLoadingInfo = false;
                _this.tinyMceEditor.setContent("");
                _this.editingInfoItem = new InfoItem();
                // Switched to removeAll because when we switched to the new back-end, the cache
                // key is the full request URI, not just the "/api/InfoItem" form
                //this.faqsHttpCache.remove( this.getUri );
                _this.faqsHttpCache.removeAll();
                _this.retrieveInfo();
            };
            var onError = function () {
                _this.isLoadingInfo = false;
                alert("Failed to save your information. Please try again and if this happens again contact support.");
            };
            // If we're editing an existing info item
            if (typeof (this.editingInfoItem.infoItemId) == "number")
                this.$http.put("/api/InfoItem", this.editingInfoItem).then(onSave);
            // Otherwise create a new one
            else
                this.$http.post("/api/InfoItem", this.editingInfoItem).then(onSave);
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to delete an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.onDeleteInfoItem = function (infoItem) {
            var _this = this;
            if (!confirm('Are you sure you want to delete this information?'))
                return;
            this.isLoadingInfo = true;
            this.$http.delete("/api/InfoItem/" + infoItem.infoItemId).then(function () {
                _this.isLoadingInfo = false;
                _this.faqsHttpCache.removeAll();
                _this.retrieveInfo();
                var shouldClearEdit = typeof (_this.editingInfoItem.infoItemId) == "number" && _this.editingInfoItem.infoItemId === infoItem.infoItemId;
                if (shouldClearEdit) {
                    _this.editingInfoItem = new InfoItem();
                    _this.tinyMceEditor.setContent("");
                }
            });
        };
        ///////////////////////////////////////////////////////////////////////////////////////////////
        // Occurs when the user wants to cancel editing of an info item
        ///////////////////////////////////////////////////////////////////////////////////////////////
        FAQsController.prototype.cancelInfoItemEdit = function () {
            this.editingInfoItem = new InfoItem();
            this.tinyMceEditor.setContent("");
        };
        FAQsController.$inject = ["$http", "$rootScope", "SiteInfo", "$cacheFactory", "fellowResidents"];
        return FAQsController;
    }());
    Ally.FAQsController = FAQsController;
    var RichTextHelper = /** @class */ (function () {
        function RichTextHelper() {
        }
        RichTextHelper.showFileUploadAlert = function (reason, detail) {
            var msg = "";
            if (reason === "unsupported-file-type")
                msg = "Unsupported format " + detail;
            else
                console.log("error uploading file", reason, detail);
            $('<div class="alert"> <button type="button" class="close" data-dismiss="alert">&times;</button>' +
                '<strong>File upload error</strong> ' + msg + ' </div>').prependTo('#alerts');
        };
        RichTextHelper.makeLinksOpenNewTab = function (elemId) {
            window.setTimeout(function () {
                // Make links in the welcome message open in a new tab
                $("a", "#" + elemId).each(function (index, elem) {
                    // Let local links modify the current tab
                    var isLocalLink = elem.href && (elem.href[0] === "#" || elem.href.indexOf(AppConfig.baseTld) > -1);
                    if (!isLocalLink)
                        $(elem).attr("target", "_blank");
                });
            }, 100);
        };
        return RichTextHelper;
    }());
    Ally.RichTextHelper = RichTextHelper;
})(Ally || (Ally = {}));
CA.angularApp.component("faqs", {
    bindings: {
        committee: "<?"
    },
    templateUrl: "/ngApp/common/FAQs.html",
    controller: Ally.FAQsController
});
