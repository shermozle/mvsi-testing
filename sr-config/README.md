# Pinned remote config

The Session Replay plugin fetches `<configServerUrl>/<apiKey>?config_group=browser` at init.
The masking demo page points `configServerUrl` at this folder so the fetch returns the file
named after the API key: a copy of the project's remote config taken when the project had
no central privacy settings. That lets the page show what the SDK does on its own at each
level. The tenant-control page uses Amplitude's live endpoint instead.
