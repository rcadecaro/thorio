var ThorIO = {
    Utils: {
        newGuid: function () {
            function s4() {
                return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
            }
            return s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();
        },
        extend: function (obj, extObj) {
            if (arguments.length > 2) {
                for (var a = 1; a < arguments.length; a++) {
                    this.extend(obj, arguments[a]);
                }
            } else {
                for (var i in extObj) {
                    if (extObj.hasOwnProperty(i)) {
                        obj[i] = extObj[i];
                    }
                }
            }
            return obj;
        },
         findBy : function (what,pre) {
            var arr = what;
            var result = [];
            for (var i = 0; i < arr.length; i++) {
                if (pre(arr[i]))
                    result.push(arr[i]);
            };
            return result;
        }
    }
};

ThorIO.Extensions = {
    getConnections: function(controller) {
        return this.client.getConnections(controller);
    },
    // send a message to the client the invoked (callee)
    invoke: function(data, topic, controller) {
        this.client.ws.send(new ThorIO.Message(topic, data, controller).toString());
    },
    // send a message to all clients connected to this controller
    invokeToAll: function(data, topic, controller) {
        this.client.getConnections(controller).forEach(function(connection) {
            connection.ws.send(new ThorIO.Message(topic, data, controller).toString());
        });
    },
    invokeTo: function(expression,data, topic, controller) {
        var filtered = ThorIO.Utils.findBy(this.client.getConnections(controller), expression);
        filtered.forEach(function (connection) {
            connection.ws.send(new ThorIO.Message(topic, data, controller).toString());
        });

    },
      
};



ThorIO.Engine = (function () {
    var self;
    var engine = function (controllers/**/) {
        self = this;
        this.connections = [];
        // todo: implement check for nessessary properties needed on a controller;
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
            return pre === message.C;
        });
        if (!hasController) {
            var controllerInstance = new resolvedController.instance(client);
            controllerInstance = ThorIO.Utils.extend(controllerInstance, ThorIO.Extensions);
            client[resolvedController.alias] = controllerInstance;
            // "2" represents a onopen message
            var connectionInfo = new ThorIO.Message("2", client.clientInformation(resolvedController.alias), resolvedController.alias);
            client.ws.send(connectionInfo.toString());

            client.controllerInstances.push(resolvedController.alias);
        }
        else {
            // todo: refactor , and throw errors
            var _method = message.T;
            try {
                var method = client[message.C][_method];

                method.apply(client[message.C],
                    [JSON.parse(message.D),message.C,message.T]
                );
             
            }
			catch (e) {
                if (_method.startsWith("$set_")) {
                    try {
                        _method = _method.replace("$set_", "");
                        var propValue = JSON.parse(message.D);
                        client[message.C][_method] = propValue;
                    }
					catch (e) {
                        console.log(e);
                    }
                }
                else {
                    console.log(e);
                }
            }
        }
    };
    engine.prototype.addConnection = function (connection) {
        connection.on("close", this.onclose);
        connection.on("message", this.onmessage);
        this.connections.push(new ThorIO.Connection(connection, this.connections));
    };
    return engine;
})();
ThorIO.Message = (function () {
    function message(topic, object, controller) {
        this.T = topic;
        this.D = object;
        this.C = controller;
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
ThorIO.Connection = (function () {

    var connections = undefined;

    var ctor = function (ws, connections) {
       
        var uuid = ThorIO.Utils.newGuid();
        this.id = uuid; // CI
        this.ws = ws;
        this.ws.uuid = uuid;
        this.controllerInstances = [];
        this.persistentId = this.getPrameter("persistentId") || ThorIO.Utils.newGuid();

        this.getConnections = function(controller) {
            var filtered = connections.filter(function(instance) {
                    return instance.hasOwnProperty(controller)
                }
            );
            return filtered;
        };

    };
    

 
    ctor.prototype.getRequest = function () {
        return this.ws.upgradeReq;
    };
    ctor.prototype.getPrameter = function (key) {
        var value = this.ws.upgradeReq.query[key];
        return value;
    };
    ctor.prototype.getPrameters = function () {
        return this.ws.upgradeReq;
    };
    ctor.prototype.clientInformation = function (controller) {
        return {
            CI: this.id,
            PI: this.persistentId,
            C: controller
        };
    };
    return ctor;
})();
exports.ThorIO = ThorIO;