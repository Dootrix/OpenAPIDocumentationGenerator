var openApiDocGen = require('./openapi-doc-gen.js');

var definitionFile = process.argv.length > 2 ? process.argv[2] : "./definition.yaml";
var templateFile = process.argv.length > 3 ? process.argv[3] : "./template.mustache";

openApiDocGen(definitionFile, templateFile);