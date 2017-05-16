(function init()
{
    'use strict';

    function replaceAll(input, search, replace) {
        return input.split(search).join(replace);
    }

    function reloadDocument(html) {
        $("html")[0].innerHTML = html;
    }

    function initialize() {
        $(window).bind('hashchange', onHashChange);

        $("html").on("click", "a", function () {
            function isLinkInternal(element) {
                return (element.host === window.location.host);
            }

            if (isLinkInternal(this)) {
                var lowerPath = this.pathname.toLower();

                if (lowerPath.endsWith(".html") || lowerPath.endsWith(".htm")) {
                    $.uriAnchor.setAnchor({
                        page: this.pathname
                    });

                    return false;
                }
            }

            return true;
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
        });
    }

    function onHashChange() {
        var anchorMap = $.uriAnchor.makeAnchorMap();

        if (typeof anchorMap.page !== "undefined") {
            loadPage(anchorMap.page);
        }
    }

    initialize();

    // TODO: don't reload if same page
    // TODO: bw compat with existing pages (graceful on non-tempates)
    // TODO: make sure styles are unloaded/reloaded correctly
    // TODO: nested templates
    // TODO: demo
})();