application-logging-angular-service
===================================

An AngularJS service to submit client side logs to the server (uses AJAX POST).

Exposes the following, all of which require the logging config object:

- exceptionLoggingService
- applicationLoggingService
- userErrorReport

The config object to be passed to each service has the following properties:

- LOGGING_TYPE (can be local|remote|none)
  - local: log to local console only
  - remote: log to local console and remote endpoint
  - none: perform no logging
- REMOTE_LOGGING_ENDPOINT: the full URL to the endpoint where log messages are sent via AJAX POST
- REMOTE_ERROR_REPORT_ENDPOINT: the full URL to the endpoint where user error reports will be sent via AJAX POST
- LOGGING_LEVEL (can be debug|error)
  - debug: log both debug and error messages
  - error: only log error messages (debug messages are not logged)

The config object should be declared as an AngularJS constant named LOGGING_CONFIG.

Example use of LOGGING_CONFIG:

```javascript
// config object for application logger
config.LOGGING_CONFIG = { 
  LOGGING_TYPE: 'local', 
  REMOTE_LOGGING_ENDPOINT: config.TDC_ENDPOINT + "/clientlogger", 
  REMOTE_ERROR_REPORT_ENDPOINT: config.TDC_ENDPOINT + "/usererrorreport", 
  LOGGING_LEVEL: "debug" };
```
