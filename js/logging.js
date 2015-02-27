'use strict';

/**
 * this module does a number of things:
 * - first it overrides the built in angular exception handling, so that any exceptions that would normally be logged
 *   to the console, are POSTed via Ajax to a serverside service. It does the cross browser, by using stacktrace.js
 * - second it exposes an applicationLoggingService that can be injected into any angular module. This service exposes
 *   and 'error' and 'debug' methods which if called will log to the console but also send those messages to a serverside
 *   service.
 */
var loggingModule = angular.module('talis.services.logging', []);

/**
 * Create a service that gives us a nice Angular-esque wrapper around the
 * stackTrace.js pintStackTrace() method. We use a service because calling
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
 * Override Angular's built in exception handler, and tell it to use our new
 * exceptionLoggingService
 */
loggingModule.provider(
    "$exceptionHandler",{
        $get: function(exceptionLoggingService){
            return(exceptionLoggingService);
        }
    }
);

/**
 * Exception Logging Service, currently only used by the $exceptionHandler
 * but logs to the console and uses the stacktraceService to generate a browser independent stacktrace
 * which is POSTed to server side clientlogging service.
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
              try{
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
              } catch (loggingError){
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
        return({
            error: function(message, desc){
                if (LOGGING_CONFIG.LOGGING_TYPE !== 'none') {
                  // preserve default behaviour
                  $log.error.apply($log, [message]);
                }

                // check if the config says we should log to the remote, and also if a remote endpoint was specified
                if (LOGGING_CONFIG.LOGGING_TYPE === 'remote' && LOGGING_CONFIG.REMOTE_LOGGING_ENDPOINT) {
                  // send server side
                  $.ajax({
                      type: "POST",
                      url: LOGGING_CONFIG.REMOTE_LOGGING_ENDPOINT,
                      contentType: "application/json",
                      data: angular.toJson({
                          url: $window.location.href,
                          message: message,
                          type: "error",
                          desc: desc
                      })
                  });
                }
            },
            debug: function(message, desc){
                if (LOGGING_CONFIG.LOGGING_LEVEL !== 'error') {
                  if (LOGGING_CONFIG.LOGGING_TYPE !== 'none') {
                    $log.log.apply($log, [message]);
                  }

                  // check if the config says we should log to the remote, and also if a remote endpoint was specified
                  if (LOGGING_CONFIG.LOGGING_TYPE === 'remote' && LOGGING_CONFIG.REMOTE_LOGGING_ENDPOINT) {
                    $.ajax({
                        type: "POST",
                        url: LOGGING_CONFIG.REMOTE_LOGGING_ENDPOINT,
                        contentType: "application/json",
                        data: angular.toJson({
                            url: $window.location.href,
                            message: message,
                            type: "debug",
                            desc: desc
                        })
                    });
                  }
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
