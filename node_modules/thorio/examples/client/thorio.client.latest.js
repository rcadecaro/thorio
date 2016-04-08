var ThorIOClient = {};
ThorIOClient.Message = (function () {
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
ThorIOClient.Factory = (function () {

    var Channel = (function () {
        var ctor = function (alias, ws) {
            this.alias = alias;
            this.ws = ws;
            this.listeners = [];
        };
        ctor.prototype.connect = function () {
            this.ws.send(new ThorIOClient.Message("$connect_", {},this.alias));
            return this;
        };
        ctor.prototype.close = function () {
            this.ws.send(new ThorIOClient.Message("$close_", {}, this.alias))
            return this;
        };
        
        ctor.prototype.subscribe = function (t, fn) {
            this.on(t, fn)
            this.ws.send(new ThorIOClient.Message("subscribe", {topic:t,controller: this.alias}, this.alias))
            return this;
        };
        
        ctor.prototype.unsubscribe = function (t){
       
            this.ws.send(new ThorIOClient.Message("unsubscribe", { topic: t, controller: this.alias }, this.alias))
    
            return this;
        }

        ctor.prototype.on = function (t, fn) {
            this.listeners.push({
                topic: t,
                fn: fn
            });
            return this;
        };
        ctor.prototype.off = function (t) {
            var indexOfListener =
            this.listeners.find(function (pre, index) {
                if (pre.topic === t) return index;
            });
            if (index >= 0) this.listeners.slice(indexOfListener, 1);
            return this;
        };
        ctor.prototype.invoke = function (t, d, c) {
            this.ws.send(new ThorIOClient.Message(t, d, c || this.alias));
            return this;
        }

        ctor.prototype.setProperty = function (name, value, controller) {
            var property = "$set_" + name;
            var data;
            this.invoke(property, value, controller || this.alias);
            return this;
        };

        ctor.prototype.dispatch = function (t, d) {
            if (t === "$open_") {
                this.onopen([JSON.parse(d)]);
                return;
            } else if (t === "$close_") {
                this.onclose([JSON.parse(d)]);
            }else if (this.hasOwnProperty(t)) {
                this[t].apply(this, [JSON.parse(d)]);
            }else {
                var listener = this.listeners.find(function (pre) {
                    return pre.topic === t;
                });
                if (listener) listener.fn.apply(this, [JSON.parse(d)]);
            }
        };
        ctor.prototype.onopen = function () {
        };
        ctor.prototype.onopen = function () {
        };
        return ctor;
    })();

    var ctor = function (url, controllers) {
     
        var self = this;
        var ws = new WebSocket(url);
        this.controllers = controllers;
        this.channels = [];
        ws.onmessage = function (event) {
            var message = JSON.parse(event.data);
            self.getChannel(message.C).dispatch(message.T, message.D);
        };
        ws.onopen = function (event) {
            self.controllers.forEach(function (alias) {
                self.channels.push(
                    new Channel(alias, self.ws)
                );
            });
            self.onopen.apply(self, self.channels);
        };
        this.ws = ws;

    };
    
    ctor.prototype.close = function (alias) {
        this.ws.close();
    };

    ctor.prototype.getChannel = function (alias) {
        return this.channels.find(function (pre) {
            return pre.alias === alias;
        });
    };
    ctor.prototype.removeChannel = function () {
        throw "Not yet implemented";
    };

    ctor.prototype.onopen = function (event) {
    };
    return ctor;
})();
