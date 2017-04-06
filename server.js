(function () {
    'use strict';

    var path = require('path');
    var fs = require('fs');
    var http = require('http');
    var express = require('express');
    var makeRequest = require('request');
    var _ = require('underscore');
    var nconf = require('nconf');
    var opn = require('opn');
    var cmsApp = express();
    var cmsHost, cmsPort, cmsUrl, cmsServer;

    var handleCmsPageRequest = function (request, response) {
        var integrationRequest, preferenceName;
        var token = nconf.get('accessToken');
        var preferences = nconf.get('preferences');
        var url = nconf.get('integrationJsonUrl') +
            '?token=' + encodeURIComponent(token) +
            '&parent=' + encodeURIComponent(cmsUrl);

        for (preferenceName in preferences) {
            if (preferences.hasOwnProperty(preferenceName)) {
                url += '&' + encodeURIComponent(preferenceName) + '=' + encodeURIComponent(preferences[preferenceName]);
            }
        }

        integrationRequest = {
            url:  url,
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

    var doNotOpenLink = process.argv.filter(function (arg) {
        return arg = '--silent';
    }).length > 0;

    var overrideParentArgs = process.argv.filter(function (arg) {
        return arg.startsWith('--parent=');
    });
    var overriddenParent = overrideParentArgs[0] && overrideParentArgs[0].split('=')[1];

    cmsApp.get('/', handleCmsPageRequest);
    cmsApp.use('/assets', express.static(path.join(__dirname, 'assets')));

    nconf.file(path.join(__dirname, 'config.json'));
    cmsHost = nconf.get('serverHost');
    cmsPort = nconf.get('serverPort');
    cmsUrl = overriddenParent || 'http://' + cmsHost + ':' + cmsPort;

    cmsServer = http.createServer(cmsApp);
    cmsServer.listen(cmsPort, cmsHost);
    cmsServer.on('listening', function () {
        console.log('cms: ' + cmsUrl);

        if (doNotOpenLink === false) {
            opn(cmsUrl);
        }
    });
    cmsServer.on('error', function (error) {
        console.log('cms: unable to start server', cmsUrl, error);
    });
}());
