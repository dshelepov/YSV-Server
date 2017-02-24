// Copyright (C) Daniel Shelepov.  All rights reserved.
var express = require('express');

var app = express();
app.use(express.static(__dirname + '/public', { maxAge: 1000 * 60 * 60 }));
app.listen(process.env.PORT || 80);

