// Copyright (C) Daniel Shelepov.  All rights reserved.
var express = require('express');

var app = express();

var WEB_ROOT = "/public";
var FRAME_PAGE_PATH = "/index.html";

var router = express.Router();
router.use(function (req, res, next) {
    //console.log(req.url);
    var ajaxHeader = req.header("X-Requested-With");
    if ((typeof ajaxHeader !== "string" || ajaxHeader.toLowerCase() !== "xmlhttprequest")
        && (req.url.endsWith(".html") || req.url.endsWith(".htm"))
        && req.url.toLowerCase() != FRAME_PAGE_PATH.toLowerCase()
    ) {
        var redirectPage = req.url.startsWith('/') ? req.url.substr(1) : req.url;
        res.redirect(FRAME_PAGE_PATH + "#!page=" + redirectPage);
    } else {
        next();
    }
});

app.use(router);
app.use(express.static(__dirname + WEB_ROOT, { maxAge: 1000 * 60 * 60 }));

app.listen(process.env.PORT || 80);

