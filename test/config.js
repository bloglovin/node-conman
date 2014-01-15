//
// # Test config
//

var hapi   = require('hapi');
var assert = require('assert');
var config = require('..');

var mockPath = __dirname + '/mock';

suite('Config Plugin', function configSuite() {

  // Internal file loading works.
  test('Correctly loads files', function internalLoadFiles(done) {
    var files = [mockPath + '/a.yaml', mockPath + '/b.yaml'];
    var fn = config._loadFiles(mockPath, files);
    fn(function loadFilesDone(err, files) {
      assert(!err);
      assert.equal(files.length, 2);
      assert(files[0].data);
      assert(files[1].file);
      assert.equal(files[1].data[0], 'b');
      done();
    });
  });

  // Internal sorting of files works
  // config.yaml should be last, rest in order they were loaded.
  test('Correctly sorts files', function internalSorting(done) {
    var files = [
      { file: __dirname + '/mock/config.yaml',
        data: 'd: bar\n\n'
      },
      { file: __dirname + '/mock/d.yaml',
        data: 'd: \'foo\'\n\n'
      },
      { file: __dirname + '/mock/b.yaml',
        data: 'b:\n  bar: [foo, baz]\n\n'
      },
      { file: __dirname + '/mock/a.yaml',
        data: 'a:\n  foo: bar\n\n'
      }
    ];

    config._sortFiles(files, function sortingDone(err, files) {
      assert(!err);
      assert.equal(files[0].file, __dirname + '/mock/d.yaml');
      assert.equal(files[1].file, __dirname + '/mock/b.yaml');
      assert.equal(files[2].file, __dirname + '/mock/a.yaml');
      assert.equal(files[3].file, __dirname + '/mock/config.yaml');
      done();
    });
  });

  // Internal YAML parsing works
  test('Correctly parses YAML', function internalParseYAML(done) {
    var files = [
      { file: __dirname + '/mock/config.yaml',
        data: 'd: bar\n\n'
      },
      { file: __dirname + '/mock/d.yaml',
        data: 'd: \'foo\'\n\n'
      },
      { file: __dirname + '/mock/b.yaml',
        data: 'b:\n  bar: [foo, baz]\n\n'
      },
      { file: __dirname + '/mock/a.yaml',
        data: 'a:\n  foo: bar\n\n'
      }
    ];

    config._parseYaml(files, function yamlParseDone(err, files) {
      assert(!err);
      assert.equal(files[0].d, 'bar');
      assert.equal(files[1].d, 'foo');
      assert.equal(files[2].b.bar[0], 'foo');
      assert.equal(files[3].a.foo, 'bar');
      done();
    });
  });

  // Invalid YAML causes error
  test('Invalid YAML causes error', function internalParseYAML(done) {
    var files = [
      { file: __dirname + '/mock/config.yaml',
        data: '[ d &* bar\n\n'
      }
    ];

    config._parseYaml(files, function yamlParseDone(err, files) {
      assert(err);
      done();
    });
  });

  // Internal merging of files works
  test('Correctly merges configurations', function mergeConfigs(done) {
    var data = [
      { a: 'foo' },
      { b: 'bar' },
      { a : 'bar' },
      { x: 123 }
    ];

    config._merge(data, function mergeDone(err, merged) {
      assert(!err);
      assert.equal(merged.a, 'bar');
      assert.equal(merged.b, 'bar');
      assert.equal(merged.x, 123);
      done();
    });
  });

  // Hapi integration
  test('Intergrates with Hapi', function hapiIntegration(done) {
    var server = new hapi.Server(0);
    var opts = { configPath: __dirname + '/mock' };
    server.route({
      method: 'GET',
      path: '/',
      handler: function (request, reply) {
        var val = server.plugins.conman.get('a');
        reply(val);
      }
    });

    server.pack.require('../', opts, function req(err) {
      assert(!err);
      server.start(function () {
        server.inject({ method: 'GET', url: '/'}, function r(res) {
          assert.equal(res.result.foo, 'bar');
          done();
        });
      });
    });
  });

  // Invalid path returns error
  test('Invalid path', function invalidPath(done) {
    new config.config('foobar', function invalidPathDone(err, conf) {
      assert(err);
      done();
    });
  });

  // Get works as expected
  test('Getting values works', function getting(done) {
    var p = __dirname + '/mock';
    var c = new config.config(p, function loaded(err, config) {
      assert(!err);
      assert.equal(c.get('d'), 'bar');
      assert.equal(c.get('foo', 'bar'), 'bar');
      assert.equal(c.get('null'), null);
      assert.equal(c.get('a.foo'), 'bar');
      assert.equal(c.get('bar.foo.thing'), 'beep');
      assert.equal(c.get('bar.foo.thang'), null);
      assert.equal(c.get('bar.foo.thing.thang'), null);
      done();
    });
  });

});

