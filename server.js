import express from "express";
import http from "http";
import { Server } from "socket.io";
import { config } from "dotenv";
import ACTIONS from "./ACTIONS.js";
import cors from 'cors'
 
config();

const app = express();
app.use(cors({
  origin: process.env.FRONTENT_URL,
  credentials: true,
  methods: ["GET", "POST","DELETE","PUT"],
}))
const server = http.createServer(app);
const io = new Server(server, {
  cors:{
    origin: "*",
    methods:["GET","POST"]
  }
});

const userSockerMap = {};
const CodeData = {
  roomId: "code",
};

const getAllConnectedClients = (roomId) => {
  const data = Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
    (socketId, index) => {
      return {
        socketId,
        username: userSockerMap[socketId],
      };
    }
  );

  return data;
};

// app.get("/", (req, res) => {
//   res.send("WELCOME TO NEXUS BACKEND !.");
// });

io.on("connection", (socket) => {
  // console.log("socket connected", socket.id);

  socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
    userSockerMap[socket.id] = username;
    socket.join(roomId);
    const clients = getAllConnectedClients(roomId);
    clients.map(({ socketId }) => {
      io.to(socketId).emit(ACTIONS.JOINED, {
        clients,
        username,
        socketId: socket.id,
      });
    });
  });

  socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
    io.to(roomId).emit(ACTIONS.CODE_CHANGE, {
      code,
    });
  });

  socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
    // console.log(socketId,{code});
    io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
  });

  socket.on("disconnecting", () => {
    const rooms = [...socket.rooms];
    rooms.map((roomId) => {
      socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
        socketId: socket.id,
        username: userSockerMap[socket.id],
      });
    });

    delete userSockerMap[socket.id];
    socket.leave();
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Listening on PORT : ${PORT}`);
});

