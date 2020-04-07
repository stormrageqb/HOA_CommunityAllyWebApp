var Ally;
(function (Ally) {
    /**
     * The controller for the widget that lets members send e-mails to the group
     */
    var LocalNewsFeedController = /** @class */ (function () {
        /**
         * The constructor for the class
         */
        function LocalNewsFeedController($http, siteInfo, $timeout) {
            this.$http = $http;
            this.siteInfo = siteInfo;
            this.$timeout = $timeout;
            this.isLoading = false;
        }
        /**
         * Called on each controller after all the controllers on an element have been constructed
         */
        LocalNewsFeedController.prototype.$onInit = function () {
            // Load the news with a slight delay to help the page load faster
            this.isLoading = true;
            var innerThis = this;
            this.$timeout(function () { return innerThis.loadNewsStories(); }, 200);
        };
        /**
         * Refresh the local news feed
         */
        LocalNewsFeedController.prototype.loadNewsStories = function () {
            //window.location.host is subdomain.domain.com
            var subDomain = HtmlUtil.getSubdomain(window.location.host);
            // A little test to help the automated tests run faster
            var isTestSubdomain = subDomain === "qa" || subDomain === "localtest";
            isTestSubdomain = false;
            if (isTestSubdomain)
                return;
            this.isLoading = true;
            var localNewsUri;
            var queryParams;
            if (this.siteInfo.privateSiteInfo.country === "US") {
                localNewsUri = "https://localnewsally.azurewebsites.net/api/LocalNews";
                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    chicagoWard: this.siteInfo.publicSiteInfo.chicagoWard,
                    zipCode: this.siteInfo.publicSiteInfo.zipCode,
                    cityNeighborhood: this.siteInfo.publicSiteInfo.localNewsNeighborhoodQuery,
                    city: this.siteInfo.privateSiteInfo.groupAddress.city,
                    state2Char: this.siteInfo.privateSiteInfo.groupAddress.state
                };
            }
            else {
                localNewsUri = "https://localnewsally.azurewebsites.net/api/LocalNews/International/MajorCity";
                queryParams = {
                    clientId: "1001A194-B686-4C45-80BC-ECC0BB4916B4",
                    countryCode: this.siteInfo.privateSiteInfo.country,
                    city: this.siteInfo.privateSiteInfo.groupAddress.city
                };
            }
            var innerThis = this;
            this.$http.get(localNewsUri, {
                cache: true,
                params: queryParams
            }).then(function (httpResponse) {
                innerThis.isLoading = false;
                innerThis.localNewStories = httpResponse.data;
            });
        };
        LocalNewsFeedController.$inject = ["$http", "SiteInfo", "$timeout"];
        return LocalNewsFeedController;
    }());
    Ally.LocalNewsFeedController = LocalNewsFeedController;
})(Ally || (Ally = {}));
CA.angularApp.component("localNewsFeed", {
    templateUrl: "/ngApp/common/local-news-feed.html",
    controller: Ally.LocalNewsFeedController
});
