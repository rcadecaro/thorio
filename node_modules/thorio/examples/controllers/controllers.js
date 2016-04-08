var MyControllers = {};

// An example ThorIO.Controller : implements ThorIO.Extensions 
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
    fooController.prototype.sayToAll = function (data, controller, topic) {
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





MyControllers.PeerController =(function () {
    
    var randomString = function () {
        return Math.random().toString(36).substring(7);
    };

    var chatMessage = function (text,nickname) {
        this.text = text;
        this.created = new Date();
    };

    var peerController = function (client) {
        this.client = client;
        this.alias = "p2p";
        this.peerId = randomString(); // Just create a random PeerId
    };
    
    peerController.prototype.setPeerId = function (message) {
        this.peerId = message.peerId;
        this.invoke(new chatMessage("You are now known connected to Peer -  " + this.peerId),
        "chatMessage", this.alias);
    };

    peerController.prototype.onopen = function () {
        this.invoke(new chatMessage("Welcome to the PeerController... "),
        "chatMessage", this.alias);

        // send the created / random peerId to callee
        this.invoke({ peerId: this.peerId },
        "peerId", this.alias);

    };
    
    peerController.prototype.sendMessage = function (message) {
        var peerId = this.peerId;
        var expression = function (pre) {
            return pre["p2p"].peerId === peerId;
        };
        this.invokeTo(expression,
            new chatMessage(message.text),
        "chatMessage", this.alias);
    };

    return peerController;
})();


// exports
exports.MyControllers = MyControllers;


