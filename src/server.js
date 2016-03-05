var express = require("express"); app = express();
var ThorIO = require("./thor-io.js").ThorIO;

// an example Controller
var FooController = (function () {

    var self;
    var controller = function () {
        self = this;
        this.size = 4;
    };

    controller.prototype.say = function (message) {
        var size = self.size;
       
	    this.invokeToAll({
            size: size,
            eyeColor: self.eyecolor
	    }, "say","foo");
	}
    controller.prototype.saytoothers = function (message) {
        this.invokeToAll(message.D, "say2", "foo");
	};
	controller.prototype.eyecolor = "blue";
    return controller;
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



