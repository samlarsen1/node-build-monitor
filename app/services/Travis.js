var request = require('request'),
    async = require('async');

module.exports = function () {
    var self = this,
        requestBuilds = function (callback) {
            request({
                'url': self.api_base + '/builds?access_token=' + self.configuration.token,
                'json' : true
                },
                function(error, response, body) {
                    callback(error, body);
            });
        },
        requestBuild = function (build, callback) {
            request({
                'url': self.api_base + '/builds/' + build.id + '?access_token=' + self.configuration.token,
                'json' : true
                },
                function(error, response, body) {
                  if (error) {
                    callback(error);
                    return;
                  }

                  callback(error, simplifyBuild(body));
                });
        },
        queryBuilds = function (callback) {
            requestBuilds(function (error, body) {
                if (error) {
                  callback(error);
                  return;
                }

                async.map(body, requestBuild, function (error, results) {
                    callback(error, results);
                });
            });
        },
        parseDate = function (dateAsString) {
            return new Date(dateAsString);
        },
        getStatus = function (result, state) {
            if (state === 'started') return "Blue";
            if (state === 'created') return "Blue";
            if (state === 'canceled') return "Gray";
            if (result === null || result === 1) return "Red";
            if (result === 0) return "Green";

            return null;
        },
        simplifyBuild = function (res) {
            return {
                id: self.configuration.slug + '|' + res.number,
                project: self.configuration.slug,
                number: res.number,
                isRunning: res.state === 'started',
                startedAt: parseDate(res.started_at),
                finishedAt: parseDate(res.finished_at),
                requestedFor: res.author_name,
                status: getStatus(res.result, res.state),
                statusText: res.state,
                reason: res.event_type,
                hasErrors: false,
                hasWarnings: false,
                url: 'https://' + self.configuration.url + '/' + self.configuration.slug + '/builds/' + res.id
            };
        };

    self.configure = function (config) {
        self.configuration = config;

        self.configuration.url = self.configuration.url || 'travis-ci.org';
        self.configuration.token = self.configuration.token || '';
        self.configuration.is_enterprise = self.configuration.is_enterprise || false;

        if (typeof self.configuration.caPath !== 'undefined') {
            request = request.defaults({
                agentOptions: {
                    ca: require('fs').readFileSync(self.configuration.caPath).toString().split("\n\n")
                }
            });
        }

        self.api_base = 'https://';
        if (self.configuration.is_enterprise)
          self.api_base += self.configuration.url + '/api';
        else
          self.api_base += 'api.' + self.configuration.url;
        self.api_base += '/repos/' + self.configuration.slug;
    };

    self.check = function (callback) {
        queryBuilds(callback);
    };
};
