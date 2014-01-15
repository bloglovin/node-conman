# Conman

Configuration manager for Hapi.js.

```javascript
var Hapi = require('hapi');

var server = new Hapi.Server(80);
server.require('conman', { configPath: '/path/to/configs' }, function (err) {
  if (err) {
    throw err;
  }
});
```

In handler:
```javascript
var value = server.plugins.conman.get('key.of.config.item', 'default value');
```

## Configs

The configs is a group of YAML files. When initializing _Conman_ all the files
in `configPath` will be loaded and merged into one object. A file named
`config.yaml` will always be loaded last. This allow overriding stuff in
production or development.

Objects in your configuration can be traversed using a keypath where keys are
separated by `.`. If value was not found in config `defaultValue` or `null`
will be returned.

