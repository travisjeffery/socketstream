var asset, assets, coffee, fs, fsUtils, minifyJS, pathlib, send, uglifyjs;

fs = require('fs');

pathlib = require('path');

uglifyjs = require('uglify-js');

if (process.env['SS_DEV']) coffee = require('coffee-script');

asset = require('../asset');

fsUtils = require('../../utils/file');

assets = {
  libs: [],
  modules: {},
  initCode: []
};

exports.send = send = function(type, name, content, options) {
  if (options == null) options = {};
  if (coffee && options.coffee) content = coffee.compile(content);
  switch (type) {
    case 'code':
      return assets.initCode.push(content);
    case 'lib':
    case 'library':
      return assets.libs.push({
        name: name,
        content: content,
        options: options
      });
    case 'mod':
    case 'module':
      if (assets.modules[name]) {
        throw new Error('System module name already exists');
      } else {
        return assets.modules[name] = {
          content: content,
          options: options
        };
      }
  }
};

exports.load = function() {
  var modDir;
  ['json.min.js', 'console_log.min.js', 'browserify.js'].forEach(function(fileName) {
    var code, path, preMinified;
    path = pathlib.join(__dirname, '/libs/' + fileName);
    code = fs.readFileSync(path, 'utf8');
    preMinified = fileName.indexOf('.min') >= 0;
    return send('lib', fileName, code, {
      minified: preMinified
    });
  });
  modDir = pathlib.join(__dirname, '/modules');
  return fsUtils.readDirSync(modDir).files.forEach(function(fileName) {
    var code, extension, modName, sp;
    code = fs.readFileSync(fileName, 'utf8');
    sp = fileName.split('.');
    extension = sp[sp.length - 1];
    modName = fileName.substr(modDir.length + 1);
    return send('mod', modName, code, {
      coffee: extension === 'coffee'
    });
  });
};

exports.serve = {
  js: function(options) {
    var code, mod, name, output, _ref;
    if (options == null) options = {};
    output = assets.libs.map(function(code) {
      return options.compress && !code.options.minified && minifyJS(code.content) || code.content;
    });
    _ref = assets.modules;
    for (name in _ref) {
      mod = _ref[name];
      code = asset.wrapModule(name, mod.content);
      if (options.compress && !mod.options.minified) code = minifyJS(code);
      output.push(code);
    }
    return output.join("\n");
  },
  initCode: function() {
    return assets.initCode.join(" ");
  }
};

minifyJS = function(originalCode) {
  var ast, jsp, pro;
  jsp = uglifyjs.parser;
  pro = uglifyjs.uglify;
  ast = jsp.parse(originalCode);
  ast = pro.ast_mangle(ast);
  ast = pro.ast_squeeze(ast);
  return pro.gen_code(ast) + ';';
};
