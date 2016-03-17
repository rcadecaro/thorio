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

Set up a ThorIO.Engine

###server.js


	var express = require("express"); app = express();
	var ThorIO = require("./thor-io.js").ThorIO;
	var myControllers = require("./Controllers/Controllers.js").MyControllers
	
	var thorIO = new ThorIO.Engine([{ alias: "foo", instance: myControllers.FooController }]);
	
	var expressWs = require("express-ws")(app);
	
	app.use('/test', express.static('test'));
	
	app.ws("/", function (ws, req) {
	thorIO.addConnection(ws);
	});
	
	app.listen(process.env.port || 1337);



###Controllers.js

A simple ThorIO.Controller


	var MyControllers = {};

	MyControllers.FooController = (function () {
	    var fooController = function (client) {
	        this.alias = "foo"; // mandatory member
	        this.client = client; // mandatory member
	        this.age = 1;
	    }
	    
	    // optional memmber
	    fooController.prototype.onclose = function (timestamp) {
	        this.invoke({ message: "onclose fired on foo", created: timestamp.toString(), age: this.age }, "say", this.alias);
	    },
	    // optional member
	    fooController.prototype.onopen = function (timestamp) {
	        this.invoke({ message: "onopen fired on foo", created: timestamp.toString(), age: this.age }, "say", this.alias);
	    },
	    // send a message to all clients connected to foo
	    fooController.prototype.all = function (data, controller, topic) {
	        this.invokeToAll({ message: data.message, created: data.created, age: this.age }, "say", this.alias);
	    };
	    // send a message to callee  
	    fooController.prototype.say = function (data, controller, topic) {
	        this.invoke({ message: data.message, created: data.created, age: this.age }, "say", this.alias);
	    };    
	    // send to all clients with an .age greater or equal to 10
	    fooController.prototype.sayTo = function (data, controller, topic) {
	        var expression = function (pre) {
	            return pre.foo.age >= 10;
	        };
	        this.invokeTo(expression,
	            { message: data.message, created: data.created, age: this.age }, "say", this.alias);
	        this.publishToAll({ a:1 }, "bar", this.alias);
	    };
    return fooController;
	})();
	// exports
	exports.MyControllers = MyControllers;
  

##Connect and use using the ThorIO.Client JavaScript API

Make sure you got this file referenced

       https://github.com/MagnusThor/thorio/blob/master/src/client/thorio.client.latest.js

####client.js

Create a connection to an endpoint and a controller (**controller.js** above) using the `ThorIOClient.Factory ` & `ThorIO.Channel`, send, recieve and more....

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
    	client = new ThorIOClient.Factory("ws://localhost:1337", ["foo"]);
    	client.onopen = function(foo) {
    		doc.querySelector("#close").addEventListener("click", function() {
    			foo.close();
    		});
    		addMessage({
    			message: "Connected to endpoint...",
    			created: new Date()
    		});
    		foo.connect();
    		foo.onclose = function(message) {
    			addMessage({
    				message: "Disconnected to fooController",
    				created: new Date()
    			});
    		};
    		foo.onopen = function(message) {
    			addMessage({
    				message: "Connected to fooController",
    				created: new Date()
    			});
    			addMessage({
    				message: "adding a subscription to 'bar'.",
    				created: new Date()
    			});
    			foo.subscribe("bar", function() {
    				addMessage({
    					message: "got a message on bar...",
    					created: new Date()
    				});
    			});
    			foo.setProperty("age", 11);
    			addMessage({
    				message: "Setting .age to 11 using setProperty ( see code ) ",
    				created: new Date()
    			});
    		};
    		doc.querySelector("#unsubscribe").addEventListener("click", function() {
    			foo.unsubscribe("bar");
    			addMessage({
    				message: "removing subscription to 'bar'.",
    				created: new Date()
    			});
    		});
    		doc.querySelector("#age").addEventListener("input", function() {
    			if (!Number.isInteger(parseInt(this.value))) return;
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
    		foo.on("say", function(message) {
    			addMessage(message);
    		});
    	};
    });


#### index.html

		<h1>Example</h1>
		<hr />
		<div>
			<input type="text" id="message" placeholder="Say something..."
			/>
			<input type="number" id="age" min="1" max="99"
				value="11" /> * if age ( number field )
			is less than 10 message will be filtered
			away, as the server controller just sends
			to clients where age >= 10 ..
		
		</div>
		<ul id="messages"></ul>
		
		<button id="close">Close connection to 'foo'</button>
		<button id="unsubscribe">Unsubscribe topic 'bar'</button>


##Example 
   
There is a running example on [http://thorio.azurewebsites.net/test](http://thorio.azurewebsites.net/test) , you will find the code (client) in the test folder of the repo

##Documentation

There is a first version of the dox available here - https://github.com/MagnusThor/thorio/wiki
