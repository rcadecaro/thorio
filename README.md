# thor.io ( working title ) 
thor.io ( working title )  - a tiny experimental realtime framework for nodeJS.  Influenced by XSockets.NET. The purpose of the project is to experiment with the concepts of the brilliant XSockets.NET framework in general in a node.js environment. I strongly recommend all to have a closer look at XSockets.NET on ( [http://xsockets.net)](http://xsockets.net)  

##Introduction

TBD


##Depencencies 

package.json

     "dependencies": {
       "express": "^4.13.4",
       "express-ws": "^1.0.0"
      }


##Serve using express & express-ws (node.js)

Set up a controller ( thorio.controller ) and a  thor.io engine

###server.js

    var express = require("express"); app = express();
    var ThorIO = require("./thor-io.js").ThorIO;
    
var FooController = (function () {
   var fooController = function(client) {
        this.alias = "foo"; // mandatory member
        this.client = client; // mandatory member
        this.age = 1;
   }
    
    // send a message to all clients connected to foo
    fooController.prototype.all = function(data,controller,topic) {
        this.invokeToAll({ message: data.message,created: data.created, age: this.age }, "say", this.alias);
    };
    
    // send a message to callee  
    fooController.prototype.say = function (data, controller, topic) {
        this.invoke({message: data.message, created: data.created,age: this.age }, "say", this.alias);
    };
    
    // send to all clients with an .age greater or equal to 10
    fooController.prototype.sayTo = function (data, controller, topic) {
        var expression = function(pre) {
            return pre.foo.age >= 10;
        };
        this.invokeTo(expression,
            {message: data.message, created: data.created,age: this.age }, "say", this.alias);
    }
    return fooController;
})();
    
    
    var thorIO = new ThorIO.Engine([{alias:"foo",instance: FooController}]);

    var expressWs = require("express-ws")(app);
    
    app.use('/test', express.static('test'));
    app.ws("/", function (ws, req) {
          thorIO.addConnection(ws);
    });
    
    app.listen(process.env.port || 1337);



##Connect and use using the XSockets.NET JavaScript API


####index.html

Note has a depencency to the XSockets JavaScript API  ( found in the example/client folder ) or at the offical resources of XSockets.NET


        var doc = document, ws, foo;

        var say = function (what) {
            foo.invoke("say", { what: what || "hello world callee" });
        };

        var all = function (what) {
            foo.invoke("all", { what: what || "hello world to all!" });
        };

        var sayto = function (what) {
            foo.invoke("sayto", { what: what || "hello world to some..." });
        };

        var setAge = function (age) {
            foo.setProperty("age", age || 12);
        }

        doc.addEventListener("DOMContentLoaded", function () {

            ws = new XSockets.WebSocket("ws://localhost:1337", ["foo"], {
                foo: "bar"
            });
            foo = ws.controller("foo");

            foo.onopen = function (ci) {
                console.log("foo controller open", ci);
            };

            foo.on("say", function (message) {
                console.log("say - ", message);
            });

            foo.on("all", function (message) {
                console.log("all -", message);
            });
        });

##Documentation

Hopefully i will be able to set up and describe the thing on the WikiPages during the next comming days / week ( written the 8th of Match 2016 ).


