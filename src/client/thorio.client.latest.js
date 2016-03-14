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

    var Controller = (function () {
        var ctor = function (alias, ws) {
            this.alias = alias;
            this.ws = ws;
            this.listeners = [];
        };
        ctor.prototype.connect = function () {
            this.ws.send(new ThorIOClient.Message("1", {}, "foo"));
            return this;
        };
        ctor.prototype.close = function () {
            this.ws.close();
            return this;
        };
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
            if (t === "2") {
                this.onopen([JSON.parse(d)]);
                return;
            };
            if (this.hasOwnProperty(t)) {
                this[t].apply(this, [JSON.parse(d)]);
            } else {
                var listener = this.listeners.find(function (pre) {
                    return pre.topic === t;
                });
                if (listener) listener.fn.apply(this, [JSON.parse(d)]);
            }
        };

        ctor.prototype.onopen = function () {
        };

        return ctor;
    })();

    var ctor = function (url, controllers) {
        var self = this;
        var ws = new WebSocket(url);
        this.controllers = controllers;
        this.registredControllers = [];
        ws.onmessage = function (event) {
            var message = JSON.parse(event.data);
            self.getController(message.C).dispatch(message.T, message.D);
        };
        ws.onopen = function (event) {
            self.controllers.forEach(function (alias) {
                self.registredControllers.push(
                    new Controller(alias, self.ws)
                );
            });
            self.onopen.apply(self, self.registredControllers);
        };
        this.ws = ws;

    };

    ctor.prototype.getController = function (alias) {
        return this.registredControllers.find(function (pre) {
            return pre.alias === alias;
        });
    };
    ctor.prototype.removeController = function () {
        throw "Not yet implemented";
    };

    ctor.prototype.onopen = function (event) {
    };
    return ctor;
})();
