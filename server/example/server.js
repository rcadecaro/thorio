var express = require("express"); app = express();
var ThorIO = require("./thor-io.js").ThorIO;

// An example ThorIO.Controller : implements ThorIO.Extensions 

var ExampleController = (function() {
    var exampleController = function (client) {
        this.alias = "example";// mandatory member
        this.client = client; // mandatory member
    }
    return exampleController;
});

var FooController = (function () {
   var fooController = function(client) {
        this.alias = "foo"; // mandatory member
        this.client = client; // mandatory member

       this.age = 1;
   }
    
    // send a message to all clients connected to foo
    fooController.prototype.all = function(data,controller,topic) {
        this.invokeToAll({ what: data.what, age: this.age }, "all", this.alias);
    };
    // send a message to callee  
    fooController.prototype.say = function (data, controller, topic) {
        this.invoke({ what: data.what, age: this.age }, "say", this.alias);
    };
    
    // send to all clients with an .age greater or equal to 10
    fooController.prototype.sayto = function (data, controller, topic) {
        var expression = function(pre) {
            return pre.foo.age >= 10;
        };
        this.invokeTo(expression,
            { what: data.what, age: this.age }, "say", this.alias);
    }


    return fooController;
})();


var thorIO = new ThorIO.Engine([{alias:"foo",instance: FooController}]);
var expressWs = require("express-ws")(app);

app.use(function (req, res, next) {
	return next();
});

app.get("/", function (req, res, next) {
	res.end();
});

app.ws("/", function (ws, req) {
    thorIO.addConnection(ws);
});

app.listen(process.env.port || 1337);



