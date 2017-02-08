(function () {
    'use strict';

    var path = require('path');
    var fs = require('fs');
    var express = require('express');
    var makeRequest = require('request');
    var _ = require('underscore');
    var nconf = require('nconf');
    var cmsApp = express();

    var handleCmsPageRequest = function (request, response) {
        var integrationRequest = {
            url: nconf.get('integrationJsonUrl'),
            json: true
        };

        console.log('cms: index requested', request.path);
        console.log('cms: make integration json request', integrationRequest.url);
        makeRequest(integrationRequest, function (error, appsngenResponse) {
            if (error || appsngenResponse.statusCode !== 200) {
                console.log('cms: unable to receive integration json', error || appsngenResponse.statusCode);
                response.status(500);
                response.end();
            } else {
                console.log('cms: integration json received');
                fs.readFile(path.join(__dirname, 'index.template'), function (error, templateBuffer) {
                    if (error) {
                        console.log('cms: unable to read index template', error);
                        response.status(500);
                    } else {
                        console.log('cms: rendering template');
                        response.set('Content-Type', 'text/html');
                        response.status(200);
                        response.write(_.template(templateBuffer.toString())(appsngenResponse.body));
                        console.log('cms: template written to response');
                    }

                    response.end();
                });
            }
        });
    };

    nconf.file(path.join(__dirname, 'config.json'));
    cmsApp.get('/', handleCmsPageRequest);
    cmsApp.listen(nconf.get('serverPort'), nconf.get('serverHost'), function (error) {
        if (error) {
            console.log(error);
        } else {
            console.log('cms: http://' + nconf.get('serverHost') + ':' + nconf.get('serverPort'));
        }
    });
}());
