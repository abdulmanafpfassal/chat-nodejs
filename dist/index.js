const app = require('express')();
const { Server } = require('socket.io');
require("dotenv").config();

const server = require("http").createServer(app);
const io = require("socket.io")(server);
const connectDatabase = require("./common/connectDb");
const { getAllMessages, addMessage } = require("./controllers/Message");

connectDatabase();

io.on("connection", function (socket) {
  var id;

  socket.on("join", function (msg) {
    id = msg;
  });

  socket.on("subscribe", async function (roomInfo) {
    socket.join(roomInfo);
    const history = await getAllMessages(roomInfo);
    io.emit(`${id}-${roomInfo}-history`, history);

    socket.on(roomInfo, async function (msg) {
      socket.broadcast.to(roomInfo).emit(roomInfo, {
        msg: msg,
        id: id
      });
      await addMessage({ msg: msg, id: id }, roomInfo);
    });

    socket.on(`${roomInfo}-typing`, function (typing) {
      socket.broadcast.to(roomInfo).emit(`${roomInfo}-typing`, {
        id: id,
        name: typing.name,
        isTyping: typing.isTyping
      });
    });
  });

  socket.on("unsubscribe", function (roomInfo) {
    socket.leave(roomInfo);
    socket.removeAllListeners(roomInfo);
  });

  socket.on('join-video-call', roomName => {
    socket.join(roomName);
    socket.to(roomName).emit('joined', roomName);
  });
  socket.on('offer', data => {
    socket.to(data.roomName).emit('offer', data.offer);
  });
  socket.on('answer', data => {
    socket.to(data.roomName).emit('answer', data.answer);
  });
  socket.on('ice', data => {
    socket.to(data.roomName).emit('ice', data.ice);
  });
});

const PORT = process.env.PORT || 8080;

server.listen(PORT, function () {
  console.log("Server is running on port: " + PORT);
});