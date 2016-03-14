# thor.io ( working title ) 
thor.io ( working title )  - a tiny experimental realtime framework for nodeJS.  Influenced by XSockets.NET. The purpose of the project is to experiment with the concepts of the brilliant XSockets.NET framework in general in a node.js environment. I strongly recommend you all to have a closer look at XSockets.NET on ([http://xsockets.net)](http://xsockets.net).  

##Introduction


See https://github.com/MagnusThor/thorio/wiki for more info


##Depencencies 

package.json

     "dependencies": {
       "express": "^4.13.4",
       "express-ws": "^1.0.0"
      }


##Serve using express & express-ws (node.js)

Set up a controller ( thorio.controller ) and a thor.io engine

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
    
    // send a message to callee (client that invokes )

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

Creating a connection to an endpoint and a controller (fooController) using the `ThorIOClient.Factory `. The example also sends, listen and modifies properties on the endpoint and the fooController ( see server.js above)
 
Note has a depencency to the ThorIO Client JavaScript API ([ https://github.com/MagnusThor/thorio/tree/master/src/client]( https://github.com/MagnusThor/thorio/tree/master/src/client) )

    var doc = document;
    var client;
    var addMessage = function(message) {
		var li = doc.createElement("li");
		var mark = doc.createElement("mark");
		mark.textContent = message.created;
		var span = doc.createElement("span");
		span.textContent = message.message;
		li.appendChild(mark);
		li.appendChild(span);
		doc.querySelector("#messages").appendChild(li);
    };
  
    doc.addEventListener("DOMContentLoaded", function() {

	var endpoint = location.host.indexOf("localhost") > -1 ? "ws://localhost:1337" : "ws://thorio.azurewebsites.net:80";

	client = new ThorIOClient.Factory(endpoint, ["foo"]);
	client.onopen = function(foo) {
		addMessage({
			message: "Connected to endpoint...",
			created: new Date()
		});
		// onopen provides an array of Controllers i.e foo, as foo is provided
		// the .Factory
		foo.connect(); // connect to to endpoint - thor.io server
		foo.onopen = function(message) {
			addMessage({
				message: "Connected to fooController",
				created: new Date()
			});
			foo.setProperty("age", 11);
			addMessage({
				message: "Setting .age to 11 using setProperty ( see code ) ",
				created: new Date()
			});
		};
		doc.querySelector("#age").addEventListener("change", function() {
			foo.setProperty("age", parseInt(this.value));
		});
		doc.querySelector("#message").addEventListener("keydown", function(event) {
			if (event.keyCode === 13) {
				event.preventDefault();
				foo.invoke("sayTo", {
					message: this.value,
					created: new Date()
				});
				this.value = "";
			};
		});
		//foo.say = function (message) {
		//    console.log("say on  foo", message);
		//};
		foo.on("say", function(message) {
			addMessage(message);
		});
	};
    });

There is a running example on [http://thorio.azurewebsites.net/test](http://thorio.azurewebsites.net/test) , you will find the code (client) in the test folder of the repo

##Documentation

There is a first version of the dox available here - https://github.com/MagnusThor/thorio/wiki

