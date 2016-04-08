// this will store the messages and act as a fake db .-)
var fakeDb = {
    messages : []
};

var ChatController = (function (db) {
    // find out who this message targets?
    var directMessage = function (message) {
        var result = message.match(/@\w+/g);
        return result;
    };
    // ctor function
    var chatController = function (client) {
        this.alias = "chat";
        this.client = client;
        this.nickname =  Math.random().toString(36).substr(2, 5); // set a random nickname
    };
    
    // when a clients connect, send back the random created nick name
    chatController.prototype.onopen = function () {
        this.invoke({
            t: "You are known as '" + this.nickname + "' to others...",
             n: this.nickname
        }, "nickname", this.alias)

    };
    // change the nick name for the current user/connection
    chatController.prototype.setNickname = function (message) {
        this.invokeToAll({
            t: "'" + this.nickname +"' is now known as " +message.nickname
        }, "chatmessage", this.alias)
        this.nickname = message.nickname;

    };
    // get's the history
    chatController.prototype.getHistory = function () {
        this.invoke(db.messages,
        "history", this.alias);
    };

    /// send a chat message
    chatController.prototype.sendMessage = function (message) {
        var self = this;
        var messageTo = directMessage(message.t); // find if it tagets someone?
        // add the "senders" nickname to message
        message.n = this.nickname;
        if (!messageTo) { // this message is for "all" 

            this.invokeToAll(message,
            "chatmessage", this.alias);
            db.messages.push(message); // store the message as it's pubic..

        } else {
            // find he user(s) and target them individualy 
            message.p = true; // flag the message as private
            messageTo.forEach(function (nickname) {
                var expression = function (pre) {
                    return pre["chat"].nickname === nickname.replace("@","");
                };
                self.invokeTo(expression, message, "chatmessage", self.alias);
            });
            // send the private message back to calle as well..
              this.invoke(message,
                  "chatmessage", this.alias);
        }
    };
    return chatController;
})(fakeDb /* pass a fare database :-) */);

exports.ChatController = ChatController;
