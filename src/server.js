var express = require("express"); app = express();
var ThorIO = require("./thor-io.js").ThorIO;

// an example Controller
var FooController = (function () { 
	// ctor
    var controller = function() {
    };

    controller.prototype.say = function(message) {
	    this.invokeToAll(message.D, "say","foo");
	}
    controller.prototype.saytoothers = function (message) {
        this.invokeToAll(message.D, "say2", "foo");
	};
	controller.prototype.eyColor = "blue";
    return controller;
})();



var thorIO = new ThorIO([{alias:"foo",instance: FooController}]);

var expressWs = require("express-ws")(app);

app.use(function (req, res, next) {
	
	req.testing = "testing";
	return next();
});

app.get("/", function (req, res, next) {
	console.log("get route", req.testing);
	res.end();
});

app.ws("/", function (ws, req) {
    thorIO.addConnection(ws);
});

app.listen(process.env.port || 1337);



