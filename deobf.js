var UglifyJS = require("uglify-js");
var fs = require("fs");

var target = {
    file: "source.js",
}

target.code = fs.readFileSync(target.file, "utf8");

var ast = UglifyJS.parse(target.code, {
        filename: target.file
});

ast.figure_out_scope();
ast.compute_char_frequency();


var string_functions = {
};

var before = function(node){


    var name, expression, count_inner_defined;

    if (node instanceof UglifyJS.AST_VarDef){
        
        name = node.name.name;
        expression = node.value && node.value.expression;

        if (expression){
            count_inner_defined = expression.enclosed && expression.enclosed.length;

            // find all functions that have 10 internal variable definitions, that is our string generator functions
            if (count_inner_defined === 10){
                string_functions[name] = node.print_to_string();
            }
        }
    }
}


var after  = function(node){

    var name, code, fn, arg, str;

    if (node instanceof UglifyJS.AST_Binary){
        // fix simple math
        if(node.right.TYPE === "Number"){
            if((node.left.TYPE === "Number" || (node.left.TYPE === "UnaryPrefix" && node.left.expression.TYPE == "Number"))){
                arg = eval(node.print_to_string());
                return new UglifyJS.AST_Number({
                    value: arg
                });        
            }
        }
    }


    if (node instanceof UglifyJS.AST_Call) {

        name = node.expression.name;
        // fix simple evals
        if(name === "eval"){
            if(node.args[0] instanceof UglifyJS.AST_String){
                return  UglifyJS.parse(node.args[0].value);
            }
        }

        // if the call was to a string generating function, extract arguments, and evaluate function
        // then replace the call with a string
        code = string_functions[name]
        if(code){
            fn = eval(code);
            arg = node.args[0].getValue();
            str = fn(arg);

            return new UglifyJS.AST_String({
                value: str
            });
        }

    }

    if (node instanceof UglifyJS.AST_Var){
        name = node.definitions[0].name.name;
        if (string_functions[name]){
            // lets kill the string generating function
            return new UglifyJS.AST_EmptyStatement();
        }
    }

};



var transformer = new UglifyJS.TreeTransformer(before, after); 

var pretty_ast = ast.transform(transformer); 

console.log(pretty_ast.print_to_string({ beautify: true }));