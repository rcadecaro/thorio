var ThorIO = {
    Utils: {
        newGuid: function() {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
        }
    }
};
ThorIO.Engine = (function () {
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
        var message = new ThorIO.Message(obj.T, obj.D, obj.C);
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
            var connectionInfo = new ThorIO.Message("2", client.clientInformation(resolvedController.alias), resolvedController.alias);
            client.ws.send(connectionInfo.toString());
        }
        else {
            // todo: refactor , and throw errors
            var _method = message.T;
            try {
                hasController.instance[_method].apply(client.extensions, [
                    JSON.parse(message)
                ]); 
            } catch (e) {
                if(_method.startsWith("set_")){
                    try {
                        _method = _method.replace("set_", "");
                        var propValue = JSON.parse(message.D).value;
                        hasController.instance[_method] = propValue

                    } catch (e) {
                        console.log(e);
                    } 
                } else {
                    console.log(e);
                }
               
              
            } 
           

        }
    };
    engine.prototype.addConnection = function (connection) {
        connection.on("close", this.onclose);
        connection.on("message", this.onmessage);
        this.connections.push(new ThorIO.Client(connection, this.connections));
    };
    return engine;
})();
ThorIO.Message = (function () {
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
ThorIO.Client = (function () {
	
	var ctor = function (ws, connections) {
		var uuid = ThorIO.Utils.newGuid();
        this.id = uuid; // CI
     
		this.ws = ws;
		this.ws.uuid = uuid;
		this.controllerInstances = [];
        this.connections = connections;
	    this.extensions = {
	        invokeToAllExceptMe: function(d,t,c) {

		}.bind(connections),
	        invoke: (function(d, t, c) {
	            this.send(new ThorIO.Message(t, d, c).toString());
		}).bind(ws),
	        invokeToAll: (function(d, t, c) {
	            connections.forEach(function(connection) {
	                connection.extensions.invoke(d, t, c);
	            });
		}).bind(connections),
	      invokeTo: function(pre,d,t,c) {

		}.bind(ws)
        };

       // this.pid =  this.getParameter("peristentId") || ThorIO.Utils.newGuid(); // PI

	    this.persistentId = this.getPrameter("persistentId") || ThorIO.Utils.newGuid();

	};
    ctor.prototype.getRequest = function() {
        return this.ws.upgradeReq;
    }
    ctor.prototype.getPrameter = function(key) {
      //  if (!ws.upgradeReq.query.hasOwnProperty(key)) return undefined;
        var value = this.ws.upgradeReq.query[key];
        return value;
    };
    ctor.prototype.getPrameters = function() {
        return this.ws.upgradeReq;
    };
	ctor.prototype.clientInformation = function (controller) {
		return {
			CI: this.id,
			PI: this.persistentId,
			C: controller
		};
	}
	return ctor;
})();

exports.ThorIO = ThorIO;