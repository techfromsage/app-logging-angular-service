'use strict';

/**
 * This module does a number of things:
 *
 * - It overrides the built in Angular exception handling, so that any exceptions that would normally be logged
 *   to the console, are POSTed via AJAX to a server-side service. It does the cross-browser, by using stacktrace.js
 *
 * - It exposes an applicationLoggingService that can be injected into any Angular module. This service exposes
 *   'trace', 'debug', 'info', 'warn' and 'error' methods which will log to the console but also send those messages
 *   to a server-side service.
 */
var loggingModule = angular.module('talis.services.logging', []);

/**
 * Create a service that gives us a nice Angular-esque wrapper around the
 * stackTrace.js printStackTrace() method. We use a service because calling
 * methods in the global context is not the 'angular way'
 */
loggingModule.factory(
    "stacktraceService",
    function(){
        return({
            print: printStackTrace
        });
    }
);

/**
 * Override Angular's built in exception handler, and tell it to use our new exceptionLoggingService
 */
loggingModule.provider(
    "$exceptionHandler",{
        $get: function(exceptionLoggingService){
            return(exceptionLoggingService);
        }
    }
);

/**
 * Exception Logging Service, currently only used by the $exceptionHandler but logs to the console and uses the
 * stacktraceService to generate a browser independent stacktrace which is POSTed to server side clientlogging
 * service.
 */
loggingModule.factory(
    "exceptionLoggingService",
    ["$log","$window", "stacktraceService", "LOGGING_CONFIG", function($log, $window, stacktraceService, LOGGING_CONFIG){
        function error( exception, cause){
            if (LOGGING_CONFIG.LOGGING_TYPE !== 'none') {
                // preserve default behaviour i.e. dump to browser console
                $log.error.apply($log, arguments);
            }

            // check if the config says we should log to the remote, and also if a remote endpoint was specified
            if (LOGGING_CONFIG.LOGGING_TYPE === 'remote' && LOGGING_CONFIG.REMOTE_LOGGING_ENDPOINT) {
                // now log server side.
                try {
                    var errorMessage = exception.toString();
                    var stackTrace = stacktraceService.print({e: exception});

                    // use AJAX not an angular service because if something has gone wrong
                    // angular might be fubar'd
                    $.ajax({
                        type: "POST",
                        url: LOGGING_CONFIG.REMOTE_LOGGING_ENDPOINT,
                        contentType: "application/json",
                        data: angular.toJson({
                            url: $window.location.href,
                            message: errorMessage,
                            type: "exception",
                            stackTrace: stackTrace,
                            cause: ( cause || "")
                        })
                    });
                } catch (loggingError) {
                    $log.warn("Error logging failed");
                    $log.log(loggingError);
                }
            }
        }
        return( error );
    }]
);

/**
 * Application Logging Service added to give us a way of logging error / debug statements from the client to the server.
 * For example a 502 gateway error on a http call wont thrown a browser exception, but we may want to have that logged on
 * server specifically eg:  $http.get().error( function(){ call applicationloggingservice here })
 */
loggingModule.factory(
    "applicationLoggingService",
    ["$log","$window", "LOGGING_CONFIG", function($log, $window, LOGGING_CONFIG){
        var arrLoggingLevels = ['trace', 'debug', 'info', 'warn', 'error'];
        var loggingThreshold = LOGGING_CONFIG.LOGGING_THRESHOLD || 'info';
        var iLoggingThreshold = arrLoggingLevels.indexOf(loggingThreshold);

        /*
         * If we've told applicationLoggingService to override the logging threshold set in config then also pass
         * it back to the remote client logging URL.
         */
        var overrideLoggingThreshold = false;

        var isLoggingEnabledForSeverity = function(severity) {
            var iRequestedLevel = arrLoggingLevels.indexOf(severity);
            if (iRequestedLevel === -1) {
                // Invalid level requested
                return false;
            }

            return (iRequestedLevel >= iLoggingThreshold);
        }

        var log = function(severity, message, desc) {
            if (!isLoggingEnabledForSeverity(severity)) {
                return;
            }

            if (LOGGING_CONFIG.LOGGING_TYPE !== 'none') {
                // preserve default behaviour
                var angularLogSeverity = severity;
                if (angularLogSeverity === 'trace') {
                    // Angular $log doesn't support trace so we use 'log' instead.
                    angularLogSeverity = 'log';
                }

                $log[angularLogSeverity](message, desc);
            }

            // check if the config says we should log to the remote, and also if a remote endpoint was specified
            if (LOGGING_CONFIG.LOGGING_TYPE === 'remote' && LOGGING_CONFIG.REMOTE_LOGGING_ENDPOINT) {
                // send server side
                $.ajax({
                    type: "POST",
                    url: LOGGING_CONFIG.REMOTE_LOGGING_ENDPOINT,
                    contentType: "application/json",
                    data: angular.toJson({
                        type: severity,
                        url: $window.location.href,
                        message: message,
                        desc: desc,
                        overrideLoggingThreshold: overrideLoggingThreshold
                    })
                });
            }
        };

        return({
            trace: function(message, desc) {
                log('trace', message, desc);
            },
            debug: function(message, desc) {
                log('debug', message, desc);
            },
            info: function(message, desc) {
                log('info', message, desc);
            },
            warn: function(message, desc) {
                log('warn', message, desc);
            },
            error: function(message, desc) {
                log('error', message, desc);
            },
            setLoggingThreshold: function(level) {
                /*
                 * Normally the logger would use the logging threshold passed in on the config hash but an
                 * application may want to override this dynamically, e.g. to enable a different logging
                 * threshold for a given user.
                 */
                if (arrLoggingLevels.indexOf(level) !== -1) {
                    iLoggingThreshold = arrLoggingLevels.indexOf(level);
                    overrideLoggingThreshold = true;
                }
            }
        });
    }]
);

loggingModule.factory(
    "userErrorReport",
    ['$window','$rootScope','LOGGING_CONFIG',function($window,$rootScope,LOGGING_CONFIG) {
        return({
            send: function(userMessage,error) {
                var payload = {
                    url: $window.location.href,
                    systemError: error,
                    userMessage: userMessage
                };
                if ($rootScope.user != null) payload.user = $rootScope.user.profile;

                // check if the config says we should log to the remote, and also if a remote endpoint was specified
                if (LOGGING_CONFIG.LOGGING_TYPE === 'remote' && LOGGING_CONFIG.REMOTE_ERROR_REPORT_ENDPOINT) {
                    $.ajax({
                        type: "POST",
                        url: LOGGING_CONFIG.REMOTE_ERROR_REPORT_ENDPOINT,
                        contentType: "application/json",
                        data: angular.toJson(payload)
                    });
                }
            }
        });
    }]
);
