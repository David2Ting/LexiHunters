var fs = require("fs");

var text = fs.readFileSync("./words.txt").toString();
var textByLine = text.split("\n");

var games = []; //Code, Words, History, Red History, Blue History, Chosen Word, Guide, Game State
const gameStates = {
  Exploring: 1,
  Guessing: 2,
  Results: 3,
  Starting: 4,
  SwitchingTeam: 5,
};
Object.freeze(gameStates);

const {
  addUser,
  removeUser,
  getUser,
  getUsersInRoom,
  setUserName,
  setTeam,
} = require("./users");

const randomListOfWords = () => {
  var list = [];
  while (list.length < 54) {
    var randomIndex = Math.floor(Math.random() * textByLine.length);
    if (!list.includes(textByLine[randomIndex].slice(0, -1))) {
      list.push(textByLine[randomIndex].slice(0, -1));
    }
  }
  return list;
};

const createGame = (id) => {
  games = games.filter((game) => game.roomId != id);
  newWords = randomListOfWords().map((randomWord) => ({
    word: randomWord,
    type: "neutral", // neutral, blue, red, selectable
  }));
  newRoom = {
    roomId: id,
    words: newWords,
    history: [],
    redHistory: [],
    blueHistory: [],
    chosenWord: null,
    clue: null,
    guide: null,
    gameState: gameStates.Starting,
    hunters: "red",
  };
  games.push(newRoom);
  newRoom.guide = setGuide(id, "blue");
  return newRoom;
};

const findMode = (array) => {
  var modes = {};
  array.forEach((word) =>
    modes.hasOwnProperty(word) ? (modes[word] += 1) : (modes[word] = 1)
  );
  console.log(modes);
  if (Object.keys(modes).length == 0) {
    return "N/A";
  }
  var max = Object.keys(modes).reduce((a, b) => (a[1] > b[1] ? a : b));
  return max;
};

const updateGame = (id) => {
  var game = getGame(id);
  var users = getUsersInRoom(id);
  switch (game.gameState) {
    case gameStates.Starting:
      if (
        (game.hunters == "red" && game.blueHistory.length > 0) ||
        (game.hunters == "blue" && game.redHistory.length > 0)
      ) {
        game.gameState = gameStates.Exploring;
      }
      break;
    case gameStates.Exploring:
      if (newRoom.clue) {
        game.gameState = gameStates.Guessing;
      }
      break;
    case gameStates.Guessing:
      console.log(users.filter((user) => user.vote == null));
      if (users.filter((user) => user.vote == null).length == 0) {
        game.gameState = gameStates.Revealing;
        // !user.guide
        var runners = users.filter((user) => user.team != game.hunters);
        var hunters = users.filter((user) => user.team == game.hunters);

        var runnersVote = findMode(runners.map((user) => user.vote));
        var huntersVote = findMode(hunters.map((user) => user.vote));

        if (runnersVote != game.chosenWord) {
          game.gameState = gameStates.SwitchingTeam;
          game.reason = `Runners chose ${runnersVote} instead of ${game.chosenWord}`;
        } else if (huntersVote == game.chosenWord) {
          game.gameState = gameStates.SwitchingTeam;
          game.reason = `Hunters correctly chose ${huntersVote}`;
        } else {
          setGuide(id, game.hunters == "red" ? "blue" : "red");
          if (game.hunters == "red") game.blueHistory.push(game.chosenWord);
          else game.redHistory.push(game.chosenWord);
          game.gameState = gameStates.Exploring;
        }
        game.clue = null;
        game.chosenWord = null;
        users.map((user) => (user.vote = null));
      }
      break;
  }
  return game;
};

const setClue = (id, clue, vote) => {
  var game = getGame(id);
  game.clue = clue;
  game.chosenWord = vote;
};

const setStartLocation = (id, word, team) => {
  var game = getGame(id);
  if (team == "blue") {
    game.blueHistory = [word];
  } else {
    game.redHistory = [word];
  }
};

const getGame = (id) => games.filter((game) => game.roomId == id)[0];
const switchHunters = (id) => {
  var game = getGame(id);
  game.hunters = game.hunters == "red" ? "blue" : "red";
  game.history = [];
  game.redHistory = [];
  game.blueHistory = [];
  game.guide.guide = false;
  game.guide = null;
  setGuide(id, game.hunters == "red" ? "blue" : "red");
  game.gameState = gameStates.Starting;
  return game;
};

const setGuide = (id, team) => {
  game = getGame(id);
  var guide;
  var teamUsers = getUsersInRoom(id).filter((user) => user.team == team);
  if (game.guide == null) {
    guide = teamUsers[0];
  } else {
    var index = teamUsers.findIndex((user) => user == game.guide);
    if (index + 1 >= teamUsers.length) {
      guide = teamUsers[0];
    } else {
      guide = teamUsers[index + 1];
    }
  }
  if (game.guide) {
    game.guide.guide = false;
  }
  guide.guide = true;
  return guide;
};

module.exports = {
  randomListOfWords,
  createGame,
  setStartLocation,
  updateGame,
  getGame,
  setClue,
  switchHunters,
};
