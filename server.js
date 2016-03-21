var express = require("express"); app = express();
var ThorIO = require("./index.js").ThorIO;
var myControllers = require("./Controllers/Controllers.js").MyControllers

var thorIO = new ThorIO.Engine(
    [
        { alias: "p2p", instance: myControllers.PeerController },
        { alias: "foo", instance: myControllers.FooController }
    ]
    );

var expressWs = require("express-ws")(app);

app.use('/test', express.static('test'));

app.ws("/", function (ws, req) {
    thorIO.addConnection(ws);
});

app.listen(process.env.port || 1337);



