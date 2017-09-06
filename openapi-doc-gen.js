var fs = require('fs');
var SwaggerParser = require('swagger-parser');
var marked = require('marked');
var Handlebars = require('handlebars');
var pdf = require('html-pdf');

function getFileUrl(path) {
    return 'file:///' + __dirname.split("\\").join("/") + "/" + (path || "");
}

Handlebars.registerHelper('fileUrl', function(context) {
    return getFileUrl(context);
});

Handlebars.registerHelper('is', function(context, options) {
    return (context == options.hash.o) ? options.fn(this) : "";
});

Handlebars.registerHelper('brace', function(context) {
    return '{{' + context + '}}';
});

Handlebars.registerHelper('json', function(context) {
    return JSON.stringify(context);
});

Handlebars.registerHelper('markdown', function(context) {
    return new Handlebars.SafeString(marked(context));
});

Handlebars.registerHelper('exampleQuery', function(context) {
    var queryValues = [];
    for (var i = 0; i < context.length; i++) {
        if(context[i]["in"] == "query") {
            queryValues.push(context[i].name + "=" + Handlebars.helpers.example(context[i])
                .replace(/"/g,"")
                .replace(/(\r\n|\n|\r)/gm,"")
                .replace("[ ", "[")
                .replace(" ]", "]")
            );
        }
    }
    
   return (queryValues.length) ? '?' + queryValues.join('&') : '';
});

Handlebars.registerHelper('example', function(context) {
    
    function exampleNumeric(ctx) {
        if (ctx == undefined || ctx == null) {
            return {};
        } else if(ctx.format == "int32") {
            return 0;
        } else if(ctx.format == "int64") {
            return 0;
        } else if(ctx.format == "float") {
            return 0.5;
        } else if(ctx.format == "double") {
            return 0.5;
        } else {
            return 0;
        }
    }
    
    function exampleString(ctx) {
        if (ctx == undefined || ctx == null) {
            return {};
        } else if(ctx.format == "byte") {
            return "ZGF0YQ==";
        } else if(ctx.format == "binary") {
            return "10101001";
        } else if(ctx.format == "date") {
            return "2016-07-05";
        } else if(ctx.format == "date-time") {
            return "2016-07-05T16:20:30.655Z";
        } else if(ctx.format == "password") {
            return "";
        } else if(ctx.enum) {
            return ctx.enum.join('|');
        } else {
            return "";
        }
    }
    
    function exampleObject(ctx) {

        if(ctx.properties) {
            var ex = {};
            for(var prop in ctx.properties) {
                if(ctx.properties.hasOwnProperty(prop)) {
                    ex[prop] = exampleSchema(ctx.properties[prop]);
                }
            }
            return ex;
        }
        
        return ctx;
    };
    
    function exampleArray(ctx) {
       return [exampleSchema(ctx.items)];
    }
    
    function exampleSchema(ctx) {
        if (ctx == undefined || ctx == null) {
            return {};
        } else if(ctx.type == "object") {
            return exampleObject(ctx);
        } else if(ctx.type == "array") {
            return exampleArray(ctx);
        } else if(ctx.type == "string") {
            return exampleString(ctx);
        } else if(ctx.type == "integer") {
            return exampleNumeric(ctx);
        } else if(ctx.type == "number") {
            return exampleNumeric(ctx);
        } else if(ctx.type == "boolean") {
            return true;
        } else if(ctx.type == "file") {
            return "";
        } else {
            return ctx;
        }
    }
    
    return JSON.stringify(exampleSchema(context), null, ' ');
});

var readFileAsync = function (file){
    return new Promise(function(resolve,reject){
        fs.readFile(file, 'utf8', function (err,data) {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
};

var writeFileAsync = function(file, contents) {
    return new Promise(function(resolve,reject){
        fs.writeFile(file, contents, function(err) {
            if(err) {
                reject(err);
            }

            resolve(contents);
        })
    });
};

var createPdfAsync = function(htmlString, options, outputFile) {
    return new Promise(function(resolve,reject){
        pdf.create(htmlString, options).toFile(outputFile, function(err, res) {
            if (err)
            {
                console.log('Error generating pdf:');
                return reject(err);
            }
            resolve(res.filename); 
        });
    });
};

var generate = function(definitionFile, templateFile) {

    SwaggerParser.dereference(definitionFile)
        .then(function(api) {
        return readFileAsync(templateFile)
                .then(function(template){
                    api.buildFolder = getFileUrl();
                    return { definition: api, template: template }
                });
        })
        .then(function(api) {

        var template = Handlebars.compile(api.template);
        var html = template(api.definition);

        return writeFileAsync("./output.html", html)
            .catch(function(err){
                console.log('Error generating html:');
                console.log(err);
            })
            .then(function(html) {
                console.log("Html output generated");

                var options = {
                    "format": 'Letter',
                    "base": getFileUrl(),
                    "border": {
                        "top": "0mm", 
                        "right": "15mm",
                        "bottom": "0mm",
                        "left": "15mm"
                    },
                    "header": {
                        "height": "28mm",
                    },
                    "footer": {
                        "height": "20mm",
                    },
                };

                return createPdfAsync(html, options, './output.pdf')
                    .catch(function(err){
                        console.log('Error generating pdf:');
                        console.log(err);
                    })
                    .then(function(filename) {
                        console.log('Pdf output generated (' + filename + ')'); 
                    })
            });
        })
        .catch(function(err) {
            console.log("Error generating output:");
            console.log(err);
        });
};

module.exports = generate