var ThorIO = {
    Utils:{
        hasProp : function(obj, prop) {
            return Object.prototype.hasOwnProperty.call(obj, prop);
        },
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
        },
        randomString: function (){
            return Math.random().toString(36).substring(7);
        }
    }
};
ThorIO.Extensions = {
    close : function (controller,fn){
        this.client.ws.trySend(new ThorIO.Message("$close_", {}, controller).toString());
    },      
    subscribesTo: function (topic,controller){
        return this.client.subscriptions.find(function (pre) {
            return pre.topic === topic && pre.controller === controller
        });
    },
    subscribe: function (subscription){
        if (subscription.hasOwnProperty("topic") && subscription.hasOwnProperty("controller")) {
            var hasSubscription = this.subscribesTo(subscription.topic, subscription.controller);
            if(!hasSubscription) this.client.subscriptions.push(subscription);
        }
    },
    unsubscribe: function (subscription){
        if (subscription.hasOwnProperty("topic") && subscription.hasOwnProperty("controller")) {
            var match = this.client.subscriptions.findIndex(function (pre) {
                return pre.topic === subscription.topic && pre.controller === subscription.controller;
            });
            if (match >= 0) {
                this.client.subscriptions.splice(match, 1);
            }
        }
    },
    publish : function (data, topic, controller){
        var hasSubscription = this.subscribesTo(topic, controller)
        if (hasSubscription) {
            this.client.ws.trySend(new ThorIO.Message(topic, data, controller).toString());
        }
    },
    publishToAll: function (data, topic, controller){
        this.client.getConnections(controller).forEach(function (connection) {
            var hasSubscription = connection[controller].subscribesTo(topic, controller)
            if (hasSubscription) {
                connection.ws.trySend(new ThorIO.Message(topic, data, controller).toString());
            }
        });
    },
    publishTo : function (data, topic, controller){
        var filtered = ThorIO.Utils.findBy(this.client.getConnections(controller), expression);
        filtered.forEach(function (connection) {
            var hasSubscription = connection[controller].subscribesTo(topic, controller)
            if (hasSubscription) {
                connection.ws.trySend(new ThorIO.Message(topic, data, controller).toString());
            }
        });
    },
    getConnections: function(controller) {
        return this.client.getConnections(controller);
    },
    invoke: function(data, topic, controller) {
        this.client.ws.trySend(new ThorIO.Message(topic, data, controller).toString());
    },
    invokeToAll: function(data, topic, controller) {
        this.client.getConnections(controller).forEach(function(connection) {
            connection.ws.trySend(new ThorIO.Message(topic, data, controller).toString());
        });
    },
    invokeTo: function(expression,data, topic, controller) {
        var filtered = ThorIO.Utils.findBy(this.client.getConnections(controller), expression);
        filtered.forEach(function (connection) {
            
            connection.ws.trySend(new ThorIO.Message(topic, data, controller).toString());

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
                return pre.ws.uuid === sender.uuid;
            });
            if (clientIndex < 0) return;
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
            var connectionInfo = new ThorIO.Message("$open_", client.clientInformation(resolvedController.alias), resolvedController.alias);
            client.ws.trySend(connectionInfo.toString());
            client.controllerInstances.push(resolvedController.alias);
            if (controllerInstance.onopen) {
                controllerInstance.onopen.apply(client[resolvedController.alias], [
                    new Date()
                ])
            }
        }
        else {
            var _method = message.T;
            if (_method.startsWith("$set_")) {
                _method = _method.replace("$set_", "");
                var propValue = JSON.parse(message.D);
                client[message.C][_method] = propValue;
             
            } else if (_method === "$close_") {
                
                if (client[message.C].onclose)
                    client[message.C].onclose.apply(client[resolvedController.alias], [new Date()])

                client[message.C].close(message.C);

                var index = client.controllerInstances.indexOf(message.C);
                client.controllerInstances.splice(index, 1);
                client[message.C] = null;

            } else {
                var method = client[message.C][_method];
                method.apply(client[message.C],
                    [JSON.parse(message.D), message.C, message.T]
                );
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
        this.id = uuid;
        this.ws = ws;
        this.ws.uuid = uuid;
        this.ws.trySend = (function (data) {
            try {
                this.send(data);
            } catch (ex) { }
        }).bind(this.ws);
        this.controllerInstances = [];
        this.subscriptions = [];
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
        if (!this.ws.upgradeReq) return {};
        return this.ws.upgradeReq;
    };
    ctor.prototype.getPrameter = function (key) {
        if (!this.ws.upgradeReq) return "";
        var value = this.ws.upgradeReq.query[key];
        return value;
    };
    ctor.prototype.getPrameters = function () {
        if (!this.ws.upgradeReq) return [];
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
ThorIO.Engine.TCPServer = (function (net) {
    var server = function (port, fn) {
        var self = this;
        net.createServer(function (socket) {
            socket.on("data", function (data) {
                socket.emit("message", data.toString())
            });
            socket.on("error", function (err) {
                console.log("error", err);
            });
            socket.send = function (data,fn) {
                socket.write(data);
                if (fn) fn.apply(socket, [data]);
            };
            socket.close = function (fn) {
                socket.destroy();
                if (fn) fn();
            };
            fn(socket);
        }).listen(port);
    }
    return server;
})(require("net"));

exports.ThorIO = ThorIO;