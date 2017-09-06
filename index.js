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

SwaggerParser.dereference("./definition.yaml")
  .then(function(api) {
        
    var source = `
    <!DOCTYPE html>
    <html lang="en">
        <head>
            <base href="`+getFileUrl()+`/"/>
            <link rel="stylesheet" href="node_modules/bootstrap/dist/css/bootstrap.css">
            <link rel="stylesheet" href="main.css">
        </head>
        <body>
            <div class="container">

                <h1>{{info.title}}</h1>

                <p>{{markdown info.description}}</p>
                
                <hr class="chapterSeparator"/>
                
                <h1>Endpoints</h1>
                {{#each paths}}
                
                <section>
                    <h2>{{@key}}</h2>
                    {{#each this}}
                    
                    <div class="group">
                        <h3>{{@key}}</h3>
                        <p class="url">{{@root.schemes.[0]}}://{{@root.host}}{{@root.basePath}}{{@../key}}{{exampleQuery parameters}}</p>
                    </div>
                    
                    <p>{{description}}</p>
                    
                    <div class="group">
                        <h4>Parameters</h4>
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Description</th>
                                    <th>Type</th>
                                    <th>In</th>
                                </tr>
                            </thead>
                            <tbody>
                                {{#each parameters}}
                                <tr>
                                    <td>{{name}}</td>
                                    <td>
                                        {{description}}
                                        {{#is in o="body"}}<pre>{{example schema}}</pre>{{/is}}
                                    </td>
                                    <td>
                                        {{#if format}}{{format}}{{/if}}
                                        {{#unless format}}{{type}}{{/unless}}
                                    </td>    
                                    <td>{{in}}</td>
                                </tr>
                                {{/each}}
                            </tbody>
                        </table>
                    </div>
                    
                    {{#each responses}}
                        
                        <div class="group">
                            {{#if @first}}
                            <h4>Responses</h4>
                            {{/if}}
                            
                            <div class="panel panel-default">
                                <div class="panel-heading">
                                    <h3 class="panel-title">{{@key}} <small>{{description}}</small></h3>
                                </div>
                                <div class="panel-body">
                                    <pre>{{example schema}}</pre>
                                </div>
                            </div>
                        </div>
                    {{/each}}
                {{/each}}
                </section>
                {{/each}}
            </div>
            <div id="pageHeader" style="font-family:'Helvetica Neue', Helvetica, Arial, 'sans-serif';">
                <p style="display: block;background:url('{{fileUrl "logo.jpg"}}') no-repeat top right;background-size:contain;">
                    Example Web Services Reference
                </p>
                <hr/>
            </div>
            <div id="pageFooter" style=\'font-family:"Helvetica Neue", Helvetica, Arial, "sans-serif";\'>
                <div style="width:50%;float:left;">&#169; Example Ltd</div>
                <div style="width:50%;float:left;text-align:right">{{brace "page"}}</div>
            </div>
        </body>
    </html>`;
    
    var template = Handlebars.compile(source);
    
    var html = template(api);

    fs.writeFile("./output.html", html, function(err) {
        if(err) {
            console.log('Error generating html:');
            return console.log(err);
        }

        console.log("Html output generated (" + __dirname + "\\output.html)");
    });
    
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

    pdf.create(html, options).toFile('./output.pdf', function(err, res) {
        if (err)
        {
            console.log('Error generating pdf:');
            return console.log(err);
        }
        console.log('Pdf output generated (' + res.filename + ')'); 
    });
  });