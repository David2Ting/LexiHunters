const express = require("express");
const socketio = require("socket.io");
const http = require("http");
const cors = require("cors");

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  setUserName,
  setTeam,
} = require("./users");

const {
  randomListOfWords,
  createGame,
  setStartLocation,
  updateGame,
  getGame,
  setClue,
  switchHunters,
} = require("./game.js");

const path = require("path");

const PORT = process.env.PORT || 5000;

const app = express();
const server = http.createServer(app);
const io = socketio(server);

const gameStates = {
  Exploring: 1,
  Guessing: 2,
  Results: 3,
  Starting: 4,
  Revealing: 5,
};
Object.freeze(gameStates);

app.use(cors());

io.on("connection", (socket) => {
  socket.on("join", (payload, callback) => {
    let numberOfUsersInRoom = getUsersInRoom(payload.room).length;

    const { error, newUser } = addUser({
      id: socket.id,
      name: "connecting...",
      room: payload.room,
    });

    if (error) return callback(error);

    socket.join(newUser.room);

    io.to(newUser.room).emit("roomData", {
      room: newUser.room,
      users: getUsersInRoom(newUser.room),
    });
    callback();
  });

  socket.on("setUserName", (userName) => {
    const user = setUserName(socket.id, userName);
    if (user) {
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
    }
  });

  socket.on("setTeam", (team) => {
    const user = setTeam(socket.id, team);
    io.to(user.room).emit("roomData", {
      room: user.room,
      users: getUsersInRoom(user.room),
    });
  });

  socket.on("startGame", () => {
    const user = getUser(socket.id);
    let startGameState;
    if (user) {
      roomState = createGame(user.room);
      wordsState = roomState.words;
      io.in(user.room).emit("updateGame", {
        words: wordsState,
        users: getUsersInRoom(user.room),
        hunters: roomState.hunters,
        gameState: roomState.gameState,
        redHistory: roomState.redHistory,
        blueHistory: roomState.blueHistory,
        history: roomState.history,
        clue: roomState.clue,
      });
    }
  });

  socket.on("initGameState", (gameState) => {
    const user = getUser(socket.id);
    if (user) io.to(user.room).emit("initGameState", gameState);
  });

  socket.on("updateGameState", (gameState) => {
    const user = getUser(socket.id);
    if (user) io.to(user.room).emit("updateGameState", gameState);
  });

  socket.on("sendMessage", (payload, callback) => {
    const user = getUser(socket.id);
    io.to(user.room).emit("message", {
      user: user.name,
      text: payload.message,
    });
    callback();
  });

  socket.on("exit", () => {
    const user = removeUser(socket.id);
    if (user)
      io.to(user.room).emit("roomData", {
        room: user.room,
        users: getUsersInRoom(user.room),
      });
  });

  socket.on("setVote", (vote) => {
    const user = getUser(socket.id);
    if (user.guide && getGame(user.room).gameState == gameStates.Starting) {
      setStartLocation(user.room, vote, user.team);
    } else {
      if (getGame(user.room).gameState == gameStates.Exploring) {
        user.vote = vote;
        console.log(user.vote);
      }
    }
    if (user) {
      user.vote = vote;
      console.log(user.vote);
      wordsState = roomState.words;
      roomsState = updateGame(user.room);
      io.in(user.room).emit("updateGame", packageToSend(user, roomState));
    }
  });

  socket.on("setClue", ({ clue, vote }) => {
    const user = getUser(socket.id);
    if (user.guide) {
      setClue(user.room, clue, vote);
    }

    if (user) {
      wordsState = roomState.words;
      roomsState = updateGame(user.room);
      user.vote = vote;
      io.in(user.room).emit("updateGame", packageToSend(user, roomState));
    }
  });

  socket.on("switchHunters", () => {
    const user = getUser(socket.id);
    if (user) {
      roomState = switchHunters(user.room);
      io.in(user.room).emit("updateGame", packageToSend(user, roomState));
    }
  });

  const packageToSend = (user, roomState) => {
    return {
      words: roomState.words,
      users: getUsersInRoom(user.room),
      hunters: roomState.hunters,
      gameState: roomState.gameState,
      redHistory: roomState.redHistory,
      blueHistory: roomState.blueHistory,
      history: roomState.history,
      clue: roomState.clue,
      reason: roomState.reason,
    };
  };
});

//serve static assets in production
if (process.env.NODE_ENV === "production") {
  //set static folder
  app.use(express.static("client/build"));
  app.get("*", (req, res) => {
    res.sendFile(path.resolve(__dirname, "client", "build", "index.html"));
  });
}

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
