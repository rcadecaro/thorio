// todo: namespace the thingys
var ThorIO = (function () {
    var self;
    var engine = function (controllers) {
        self = this;
        this.connections = [];
        this.controllers = controllers;
    };
    engine.prototype.onclose = function () {
        var sender = this;
        var clientIndex = self.connections.findIndex(function (pre) {
            return pre.ws.uuid = sender.uuid;
        });
        self.connections.splice(clientIndex, 1);
    };
    engine.prototype.onmessage = function (str) {
        var sender = this;
        var obj = JSON.parse(str);
        var message = new ThorIOMessage(obj.T, obj.D, obj.C);
        var resolvedController = self.controllers.find(function (pre) {
            return pre.alias === message.C;
        });
        var client = self.connections.find(function (pre) {
            return pre.ws.uuid === sender.uuid;
        });
        var hasController = client.controllerInstances.find(function (pre) {
            return pre.alias === message.C;
        });
        if (!hasController) {
            var instance = new resolvedController.instance(resolvedController.alias);
            client.controllerInstances.push({
                alias: resolvedController.alias,
                instance: instance
            });
            var connectionInfo = new ThorIOMessage("2", client.clientInformation(resolvedController.alias), resolvedController.alias);
            client.ws.send(connectionInfo.toString());
        }
        else {
            hasController.instance[message.T].apply(client.extensions, [
                JSON.parse(message)
            ]);
        }
    };
    engine.prototype.addConnection = function (connection) {
        connection.on("close", this.onclose);
        connection.on("message", this.onmessage);
        this.connections.push(new ThorIOClient(connection, this.connections));
    };
    return engine;
})();
var ThorIOMessage = (function () {
	function message(topic, object, controller) {
		this.T = topic ? topic.toLowerCase() : undefined;
		this.D = object;
		this.C = controller ? controller.toLowerCase() : undefined;
		this.JSON = {
			T: topic,
			D: JSON.stringify(object),
			C: controller
		};
	};
	message.prototype.toString = function () {
		return JSON.stringify(this.JSON);
	};
	return message;
})();
var ThorIOClient = (function () {
	function newGuid() {
		function s4() {
			return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
		}
		return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
	};
	var ctor = function (ws, connections) {
		var uuid = newGuid();
		this.id = uuid;
		this.ws = ws;
		this.ws.uuid = uuid;
		this.controllerInstances = [];
		this.connections = connections;

	    this.extensions = {
	        invokeToAllExceptMe: function() {

		}.bind(connections),

	        invoke: (function(d, t, c) {
	            this.send(new ThorIOMessage(t, d, c).toString());
		}).bind(ws),

	        invokeToAll: (function(d, t, c) {
	            connections.forEach(function(connection) {
	                connection.extensions.invoke(d, t, c);
	            });
		}).bind(connections),

	    invokeTo: function(pre,d,t,c) {

		}.bind(ws)
		};
	    this.foo = "bar";
	};
	ctor.prototype.clientInformation = function (controller) {
		return {
			CI: this.id,
			PI: "",
			C: controller
		};
	}
	return ctor;
})();

exports.ThorIO = ThorIO;