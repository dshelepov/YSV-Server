(function init() {
    'use strict';

    // variable name that will indicate the requested template in a page
    /*const*/ var TEMPLATE_NAME = "_TEMPLATE";

    // token indicating the end of a key definition in a template.
    /*const*/ var KEY_END_TOKEN = "<!--/-->";

    // variable name identifier in template declaration
    /*const*/ var KEY_NAME = "k";

    // content source identifier in template declaration
    /*const*/ var SOURCE_NAME = "src";

    // template substitution pattern, $NAME is replaced with variable name
    /*const*/ var VAR_SUBSTITUION_TEMPLATE = "{{$NAME}}";

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
            // given a raw HTML stream, find the set of template fill values defined in that HTML.
            //
            // RETURNS: map keyed by template key name of template values with schema:
            //  {
            //      isIndirect: (bool) -- if true, actual fill value needs to be downloaded from source
            //      value: (string) -- fill value;  may not be set for isIndirect
            //      source: (string) -- local href representing where to fetch actual value from;  defined only iff 
            //          isIndirect
            //  }
            function findVars(html) {
                /*const*/ var KEY_BEGIN_REGEX = /<!--((?!-->).)+-->/;
                /*const*/ var BEGIN_COMMENT = "<!--";
                /*const*/ var END_COMMENT = "-->";
                /*const*/ var VALUE_NAME = "value";

                var vars = {};

                function harvestDeclaration(rawCandidateDeclaration) {
                    rawCandidateDeclaration = rawCandidateDeclaration.substring(
                        BEGIN_COMMENT.length, rawCandidateDeclaration.length - END_COMMENT.length
                    );

                    var parsedJson = null;
                    try {
                        parsedJson = JSON.parse(rawCandidateDeclaration);
                    } catch (exception) {
                        return null;
                    }

                    if (typeof parsedJson[KEY_NAME] === "string") {
                        return parsedJson;
                    } else {
                        return null;
                    }
                }

                function harvestVar(declaration) {
                    var newVar = {};

                    var source = declaration[SOURCE_NAME];

                    newVar.isIndirect = typeof source === "string";
                    if (newVar.isIndirect) {
                        newVar.source = source;
                    } else {
                        newVar.value = declaration[VALUE_NAME];
                    }

                    vars[declaration[KEY_NAME]] = newVar;
                }

                var remainingHtml = html;

                while (true) {
                    var commentStart = remainingHtml.search(KEY_BEGIN_REGEX);
                    if (commentStart < 0) {
                        break;
                    }

                    remainingHtml = remainingHtml.substring(commentStart);
                    // comment start is now at 0

                    var afterComment = remainingHtml.search(END_COMMENT) + END_COMMENT.length;

                    var declaration = harvestDeclaration(remainingHtml.substring(0, afterComment));
                    if (declaration !== null) {
                        var keyContentEnd = remainingHtml.search(KEY_END_TOKEN);
                        if (keyContentEnd >= 0) {
                            declaration[VALUE_NAME] = remainingHtml.substring(afterComment, keyContentEnd);

                            remainingHtml = remainingHtml.substring(keyContentEnd + KEY_END_TOKEN.length);
                        } else {
                            declaration = null;
                        }
                    }

                    if (declaration === null) {
                        remainingHtml = remainingHtml.substring(afterComment);
                    } else {
                        harvestVar(declaration);
                    }
                }

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
                var templateTuple = model[TEMPLATE_NAME];
                if (typeof templateTuple !== "undefined" && typeof templateTuple.value !== "undefined") {
                    var template = templateTuple.value;

                    for (var i = 0; i < POPULATE_PASS_COUNT; i++) {
                        for (var key in model) {
                            if (model.hasOwnProperty(key)) {
                                var substitutionToken = replaceAll(VAR_SUBSTITUION_TEMPLATE, "$NAME", key);
                                template = replaceAll(template, substitutionToken, model[key].value);
                            }
                        }
                    }

                    reloadDocument(template);
                } else {
                    reloadDocument(rawPage);
                };

                history.replaceState({}, document.title, currentPageLoaded);
            }

            var vars = findVars(data);

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
})();