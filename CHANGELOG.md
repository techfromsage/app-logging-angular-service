## 2.1.3 (2016-10-26)

Bug fix:

  - Only log 'desc' param to console if set.

## 2.1.2 (2016-10-25)

Bug fix:

  - Log 'message' and 'desc' params correctly via the logger.

## 2.1.1 (2016-02-24)

Bug fix:

  - If overriding the logging threshold dynamically, also pass this value back to the remote logging URL.

## 2.1.0 (2016-02-23)

Features:

  - Allow override of the logging threshold by calling applicationLoggingService.setLoggingThreshold(level)

## 2.0.0 (2016-02-19)

Features:

  - Support all trace, debug, info, warn and error levels.
  - Use LOGGING_THRESHOLD instead of LOGGING_LEVEL in the config object for clarity, default is info level.

Bugfixes:

  - Use the correct console.xxx version to get the correct icons in the browser console for the log level requested.

## 1.x.x

Initial version
