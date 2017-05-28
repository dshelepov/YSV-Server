(function init() {
    'use strict';

    // variable name that will indicate the requested template in a page
    /*const*/ var TEMPLATE_KEY = "{{_TEMPLATE}}";

    // attribute name that will indicate that a given element is meant to populate a templated field
    /*const*/ var META_KEY = "data-key";

    // attribute name that will indicate that a given element should be replaced by a downloaded template fragment
    /*const*/ var META_SRC = "data-src";

    // how many resolve passes will be run on the final templated page
    /*const*/ var POPULATE_PASS_COUNT = 5;

    // relative url of the current page loaded
    var currentPageLoaded = null;

    // replaces all instances of $search in $input with $replace
    function replaceAll(input, search, replace) {
        return input.split(search).join(replace);
    }

    // initializes the frame
    function initialize() {
        $("html").on("click", "a", function (event) {
            function isLinkInternal(element) {
                return (element.host === window.location.host);
            }

            if (isLinkInternal(this)) {
                var lowerPath = this.pathname.toLowerCase();

                if (lowerPath.endsWith(".html") || lowerPath.endsWith(".htm")) {
                    event.preventDefault();
                    navigatePush(this.pathname);
                }
            }
        });

        window.onpopstate = function (event) {
            navigate(document.location.pathname);
        };

        var anchorMap = $.uriAnchor.makeAnchorMap();
        var newPage = anchorMap.page;
        if (typeof newPage === "string" && newPage !== currentPageLoaded) {
            navigateReplace(newPage);
        }
    }

    // loads the page from a given URL
    function loadPage(url) {
        // fully replaces currently loaded document with new markup
        function reloadDocument(html) {
            $("html")[0].innerHTML = html;
        }

        // callback for when page at current url has been downloaded
        function onPageDownloaded(data) {
            // given a collection of jQuery elements, finds the set of template fill values defined within those 
            // elements.
            //
            // RETURNS: map keyed by template key name of template values with schema:
            //  {
            //      isIndirect: (bool) -- if true, actual fill value needs to be downloaded from source
            //      value: (string) -- fill value;  may not be set for isIndirect
            //      source: (string) -- local href representing where to fetch actual value from;  defined only iff 
            //          isIndirect
            //  }
            function findVars(jqElems) {
                var vars = {};

                function harvestVar(index, elem) {
                    var jqElem = $(elem);
                    var key = jqElem.attr(META_KEY);
                    var src = jqElem.attr(META_SRC);
                    var isIndirect = typeof src === "string";

                    vars[key] = { isIndirect: isIndirect };

                    if (isIndirect) {
                        vars[key].source = src;
                    } else {
                        vars[key].value = jqElem.html();
                    }
                }

                var query = "[" + META_KEY + "]";

                var jqTopLevelHits = jqElems.filter(query);
                jqTopLevelHits.each(harvestVar);

                var jqNestedHits = jqElems.find(query);
                jqNestedHits.each(harvestVar);

                return vars;
            }

            // given a map of template fill values, resolves all indirect values by downloading them, upon which will
            // call onResolveComplete
            function resolveIndirectVars(vars, onResolveComplete/*()*/) {
                function loadIndirect(url, onLoadComplete/*(data)*/) {
                    url = url + "?" + Math.random();
                    $.get(url, function (data) {
                        onLoadComplete(data);
                    }).fail(function () {
                        onLoadComplete('ERROR: resource ' + url + " not found.");
                    });
                }

                var pendingRequests = 0;

                for (var key in vars) {
                    if (vars.hasOwnProperty(key) && vars[key].isIndirect) {
                        if (typeof vars[key] === "undefined" || vars[key] === "") {
                            vars[key].value = "[" + META_SRC + "] not set for key [" + key + "]; cannot download";
                        } else {
                            pendingRequests++;

                            (function (capturedKey) {
                                loadIndirect(vars[capturedKey].source, function (data) {
                                    vars[capturedKey].value = data;
                                    pendingRequests--;

                                    if (pendingRequests == 0) {
                                        onResolveComplete();
                                    }
                                });
                            })(key);
                        }
                    }
                }

                if (pendingRequests == 0) {
                    onResolveComplete();
                }
            }

            // given a map of templated values, loads the template and populates with available values from the map.
            // If there is no template specified, leaves the main page untouched.
            function finalizeLoad(model, rawPage) {
                if (typeof model[TEMPLATE_KEY].value !== "undefined") {
                    var template = model[TEMPLATE_KEY].value;

                    for (var i = 0; i < POPULATE_PASS_COUNT; i++) {
                        for (var key in model) {
                            if (model.hasOwnProperty(key)) {
                                template = replaceAll(template, key, model[key].value);
                            }
                        }
                    }

                    reloadDocument(template);
                } else {
                    reloadDocument(rawPage);
                };

                history.replaceState({}, document.title, currentPageLoaded);
            }

            var jqPage = $(data);
            var vars = findVars(jqPage);

            resolveIndirectVars(vars, function () {
                finalizeLoad(vars, data);
            });
        }

        var urlMod = url + "?" + Math.random();
        $.get(urlMod, onPageDownloaded).fail(function () {
            reloadDocument('ERROR: resource ' + url + " not found.");
        });
    }

    // attempts to navigate to a local page.  If it's the same page as current, does nothing.
    //
    // RETURNS: false is path is the sames as current page, otherwise true
    function navigate(path) {
        if (path !== currentPageLoaded) {
            loadPage(path);
            currentPageLoaded = path;

            return true;
        }
        return false;
    }

    // attempts to navigate to a local page, creating a new navigation history entry if successful
    function navigatePush(path) {
        if (navigate(path)) {
            history.pushState({}, path, path);
        }
    }

    // attempts to navigate to a local page, replacing the current history entry if successful
    function navigateReplace(path) {
        if (navigate(path)) {
            history.replaceState({}, path, path);
        }
    }

    initialize();

    // TODO: demo
})();