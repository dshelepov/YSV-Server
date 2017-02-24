(function init()
{
    'use strict';

    function replaceAll(input, search, replace) {
        return input.split(search).join(replace);
    }

    function reloadDocument(html) {
        $("html")[0].innerHTML = html;
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

    loadPage("example_page.html");

    // TODO: in HTTP server, if not served by AJAX, redirect to index with arg
    // TODO: intercept navigate away and reload instead
    // TODO: bw compat with existing pages (graceful on non-tempates)
    // ???TODO: listen to hash changes
})();