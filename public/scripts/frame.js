(function init()
{
    'use strict';

    var currentPageLoaded = null;

    function replaceAll(input, search, replace) {
        return input.split(search).join(replace);
    }

    function reloadDocument(html) {
        $("html")[0].innerHTML = html;
    }

    function initialize() {
        $(window).bind('hashchange', onHashChange);

        $("html").on("click", "a", function (event) {
            function isLinkInternal(element) {
                return (element.host === window.location.host);
            }

            if (isLinkInternal(this)) {
                var lowerPath = this.pathname.toLowerCase();

                if (lowerPath.endsWith(".html") || lowerPath.endsWith(".htm")) {
                    event.preventDefault();

                    $.uriAnchor.setAnchor({
                        page: this.pathname.substr(1)   // remove leading '/'
                    });
                }
            }
        });

        onHashChange();
    }

    function loadTemplate(url, model) {
        url = url + "?" + Math.random();
        $.get(url, function (data) {
            var template = data;

            for (var key in model) {
                if (model.hasOwnProperty(key)) {
                    template = replaceAll(template, key, model[key]);
                }
            }

            reloadDocument(template);
        });
    }

    function loadPage(url) {
        function findVars(jqElems) {
            var metakey = "data-key";
            var vars = {};

            function harvestVar(index, elem) {
                var jqElem = $(elem);
                var key = jqElem.attr(metakey);
                var value = jqElem.html();

                vars[key] = value;
            }
            
            var query = "[" + metakey + "]";

            var jqTopLevelHits = jqElems.filter(query);
            jqTopLevelHits.each(harvestVar);

            var jqNestedHits = jqElems.find(query);
            jqNestedHits.each(harvestVar);

            return vars;
        }

        var urlMod = url + "?" + Math.random();
        $.get(urlMod, function (data) {
            var jqPage = $(data);

            var templateKey = "$_TEMPLATE";
            var vars = findVars(jqPage);
            if (typeof vars[templateKey] !== "undefined") {
                loadTemplate(vars[templateKey], vars);
            } else {
                reloadDocument('ERROR: could not find ' + templateKey + ' on page ' + url);
            }
        }).fail(function () {
            reloadDocument('ERROR: resource ' + url + " not found.");
        });
    }

    function onHashChange() {
        var anchorMap = $.uriAnchor.makeAnchorMap();
        var newPage = anchorMap.page;

        if (typeof newPage !== "undefined" && newPage !== currentPageLoaded) {
            loadPage(newPage);
            currentPageLoaded = newPage;
        }
    }

    initialize();

    // TODO: bw compat with existing pages (graceful on non-tempates)
    // TODO: make sure styles are unloaded/reloaded correctly
    // TODO: nested templates
    // TODO: demo
})();