import React, { useEffect, useState } from "react";
import PACK_OF_CARDS from "../utils/packOfCards";
import shuffleArray from "../utils/shuffleArray";
import io from "socket.io-client";
import queryString from "query-string";
import Spinner from "./Spinner";
import useSound from "use-sound";

import bgMusic from "../assets/sounds/game-bg-music.mp3";
import unoSound from "../assets/sounds/uno-sound.mp3";
import shufflingSound from "../assets/sounds/shuffling-cards-1.mp3";
import skipCardSound from "../assets/sounds/skip-sound.mp3";
import draw2CardSound from "../assets/sounds/draw2-sound.mp3";
import wildCardSound from "../assets/sounds/wild-sound.mp3";
import draw4CardSound from "../assets/sounds/draw4-sound.mp3";
import gameOverSound from "../assets/sounds/game-over-sound.mp3";

import { Modal, Button, Form } from "react-bootstrap";
//NUMBER CODES FOR ACTION CARDS
//SKIP - 404
//DRAW 2 - 252
//WILD - 300
//DRAW 4 WILD - 600

let socket;
const ENDPOINT = "http://localhost:5000";
//const ENDPOINT = "https://uno-online-multiplayer.herokuapp.com/";

const Game = (props) => {
  const data = queryString.parse(props.location.search);
  const gameStates = {
    Exploring: 1,
    Guessing: 2,
    Results: 3,
    Starting: 4,
    SwitchingTeam: 5,
  };
  Object.freeze(gameStates);

  //initialize socket state
  const [room, setRoom] = useState(data.roomCode);
  const [roomFull, setRoomFull] = useState(false);

  const [users, setUsers] = useState([]);
  const [redTeam, setRedTeam] = useState([]);
  const [blueTeam, setBlueTeam] = useState([]);
  const [spectators, setSpectators] = useState([]);

  const [userName, setUserName] = useState("UserName");
  const [user, setUser] = useState({});

  const [currentUser, setCurrentUser] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const [showSetName, setShowSetName] = useState(true);
  const [hunters, setHunters] = useState("");
  const [inGame, setInGame] = useState(false);
  const [gameState, setGameState] = useState(gameStates.Exploring);

  const [vote, setVote] = useState(null); // Vote for tile
  const [hasVoted, setHasVoted] = useState(false); // Vote for tile
  const [clue, setClue] = useState(null); // Clue from clue giver
  const [reason, setReason] = useState(null); // Reason for team switch

  const [votes, setVotes] = useState([]); // Vote for tile

  const [redHistory, setRedHistory] = useState([]);
  const [blueHistory, setBlueHistory] = useState([]);
  const [history, setHistory] = useState([]);

  const handleShow = () => setShowSetName(true);

  useEffect(() => {
    const connectionOptions = {
      forceNew: true,
      reconnectionAttempts: "Infinity",
      timeout: 10000,
      transports: ["websocket"],
    };
    socket = io.connect(ENDPOINT, connectionOptions);

    socket.emit("join", { room: room }, (error) => {
      if (error) setRoomFull(true);
    });

    //cleanup on component unmount
    return function cleanup() {
      socket.emit("exit");
      //shut down connnection instance
      socket.off();
    };
  }, []);

  useEffect(() => {
    setVote(null);
    setHasVoted(false);
  }, [gameState]);

  const handleClose = () => {
    socket.emit("setUserName", userName);
    setShowSetName(false);
  };

  const getTeamHistory = () => {
    if (currentUser) {
      if (currentUser.team == "blue") return blueHistory;
      else return redHistory;
    }
  };

  const setTeams = (users) => {
    let tempRedTeam = [];
    let tempBlueTeam = [];
    let tempSpectators = [];
    users.map((user) => {
      switch (user.team) {
        case "red":
          tempRedTeam.push(user);
          break;
        case "blue":
          tempBlueTeam.push(user);
          break;
        default:
          tempSpectators.push(user);
      }
    });
    setRedTeam(tempRedTeam);
    setBlueTeam(tempBlueTeam);
    setSpectators(tempSpectators);

    setCurrentUser(users.find((user) => user.id == socket.id));
  };

  const joinTeam = (team) => {
    socket.emit("setTeam", team);
  };

  //initialize game state
  const [gridWords, setGridWords] = useState([]);
  let hexCounter = 0;
  //
  const [playGameOverSound] = useSound(gameOverSound);

  //runs once on component mount
  useEffect(() => {
    //shuffle PACK_OF_CARDS array
    const shuffledCards = shuffleArray(PACK_OF_CARDS);

    //extract first 7 elements to player1Deck
    const player1Deck = shuffledCards.splice(0, 7);

    //extract first 7 elements to player2Deck
    const player2Deck = shuffledCards.splice(0, 7);

    //extract random card from shuffledCards and check if its not an action card
    let startingCardIndex;
    while (true) {
      startingCardIndex = Math.floor(Math.random() * 94);
      if (
        shuffledCards[startingCardIndex] === "skipR" ||
        shuffledCards[startingCardIndex] === "_R" ||
        shuffledCards[startingCardIndex] === "D2R" ||
        shuffledCards[startingCardIndex] === "skipG" ||
        shuffledCards[startingCardIndex] === "_G" ||
        shuffledCards[startingCardIndex] === "D2G" ||
        shuffledCards[startingCardIndex] === "skipB" ||
        shuffledCards[startingCardIndex] === "_B" ||
        shuffledCards[startingCardIndex] === "D2B" ||
        shuffledCards[startingCardIndex] === "skipY" ||
        shuffledCards[startingCardIndex] === "_Y" ||
        shuffledCards[startingCardIndex] === "D2Y" ||
        shuffledCards[startingCardIndex] === "W" ||
        shuffledCards[startingCardIndex] === "D4W"
      ) {
        continue;
      } else break;
    }

    //extract the card from that startingCardIndex into the playedCardsPile
    const playedCardsPile = shuffledCards.splice(startingCardIndex, 1);

    //store all remaining cards into drawCardPile
    const drawCardPile = shuffledCards;

    //send initial state to server
    socket.emit("initGameState", {
      gameOver: false,
      turn: "Player 1",
      player1Deck: [...player1Deck],
      player2Deck: [...player2Deck],
      currentColor: playedCardsPile[0].charAt(1),
      currentNumber: playedCardsPile[0].charAt(0),
      playedCardsPile: [...playedCardsPile],
      drawCardPile: [...drawCardPile],
    });
  }, []);

  //send initial state to server
  const StartGame = () => {
    socket.emit("startGame");
  };

  useEffect(() => {
    socket.on(
      "updateGame",
      ({
        words,
        users,
        hunters,
        gameState,
        redHistory,
        blueHistory,
        history,
        clue,
        reason,
      }) => {
        setGameState(gameState);
        setGridWords(words);
        setTeams(users);
        setHunters(hunters);
        setInGame(true);
        setRedHistory(redHistory);
        setBlueHistory(blueHistory);
        setHistory(history);
        setClue(clue);
        setReason(reason);
      }
    );
    socket.on("roomData", ({ users }) => {
      setUsers(users);
      setTeams(users);
    });

    socket.on("message", (message) => {
      setMessages((messages) => [...messages, message]);

      const chatBody = document.querySelector(".chat-body");
      chatBody.scrollTop = chatBody.scrollHeight;
    });

    socket.on("results", ({ runnersVote, huntersVote, chosenVote }) => {
      setVotes([runnersVote, huntersVote, chosenVote]);
      console.log(votes);
    });
  }, []);

  const hexClicked = (word, type) => {
    if (type == "selectable") {
      setVote(word);
    }
  };

  const isAdjacentTo = (current_word, word, even) => {
    var indexes = [];
    var index = gridWords.findIndex((wordSet) => wordSet.word == current_word);
    if (even) indexes = [-1, 1, 9, 8, 10, -9];
    //, 9, -7, -8, -9];
    else indexes = [-1, 1, 9, -8, -9, -10]; //, 7, 8, 9, -9];
    for (var i = 0; i < indexes.length; i++) {
      let checkIndex = Number(index) + Number(indexes[i]);
      if (checkIndex < 1 || checkIndex >= 53) {
        continue;
      }
      if (gridWords[checkIndex].word == word) {
        return true;
      }
    }
    return false;
  };

  const hex = (even = false) => {
    var word;
    var type;
    var wordSet = gridWords[hexCounter];
    word = wordSet.word;
    type = wordSet.type;
    hexCounter += 1;
    var colour = "#525362";

    if (currentUser.guide) {
      if (
        gameState == gameStates.Starting &&
        type == "neutral" &&
        !getTeamHistory().includes(word)
      ) {
        colour = "#9091a5";
        type = "selectable";
      } else if (
        (gameState == gameStates.Exploring && type == "neutral",
        !getTeamHistory().includes(word))
      );
      {
        if (
          isAdjacentTo(
            word,
            getTeamHistory()[getTeamHistory().length - 1],
            even
          )
        ) {
          colour = "#9091a5";
          type = "selectable";
        }
      }
    }

    if (getTeamHistory().includes(word)) {
      colour = "#3f477a";
      type = "non-selectable";
    }

    if (word == vote) {
      colour = "#ffffff";
    }

    // GUESSING STAGE
    if (gameState == gameStates.Guessing) {
      console.log(currentUser.team != hunters);
      if (currentUser.team != hunters) {
        if (
          isAdjacentTo(
            word,
            getTeamHistory()[getTeamHistory().length - 1],
            even
          ) &&
          type == "neutral" &&
          !getTeamHistory().includes(word)
        ) {
          colour = "#9091a5";
          type = "selectable";
        }
      } else {
        if ((type == "neutral") & !getTeamHistory().includes(word)) {
          colour = "#9091a5";
          type = "selectable";
        }
      }
    }

    return (
      <>
        <div
          onClick={() => {
            hexClicked(word, type);
          }}
          className={`hex ${even ? "even" : ""}`}
        >
          <div className="left" style={{ color: colour }} />
          <div className="middle" style={{ background: colour }} />
          <div className="right" style={{ color: colour }} />
          <p className="hex-text">{word}</p>
        </div>
      </>
    );
  };

  const createRow = (number) => {
    var hexes = [];
    for (let i = 0; i < number; i++) {
      hexes.push(
        <>
          {hex(false)}
          {hex(true)}
        </>
      );
    }
    hexes.push(hex(false));
    return <div className="hex-row">{hexes}</div>;
  };

  const grid = () => {
    hexCounter = 0;
    return (
      <div className="grid">
        {createRow(4)}
        {createRow(4)}
        {createRow(4)}
        {createRow(4)}
        {createRow(4)}
        {createRow(4)}
      </div>
    );
  };

  const submitClue = () => {
    socket.emit("setClue", { clue, vote });
  };
  const submitVote = () => {
    console.log(vote);
    setHasVoted(true);
    socket.emit("setVote", vote);
  };
  const switchHunters = () => {
    socket.emit("switchHunters");
  };

  const clueInput = (
    <div>
      <Form.Group>
        <Form.Control
          className="textFeedback"
          placeholder="Clue"
          onChange={(e) => setClue(e.target.value)}
          type="text"
          className="name-input"
        />
      </Form.Group>
      <Button variant="primary" onClick={submitClue}>
        Submit
      </Button>
    </div>
  );

  const voteInput = (text) => (
    <div>
      <div>{text}</div>
      <Button
        variant="primary"
        onClick={submitVote}
        disabled={vote == null || hasVoted}
      >
        {hasVoted ? "Voted" : "Submit"}
      </Button>
    </div>
  );

  const switchHuntersInput = (text) => (
    <div>
      <div>{text}</div>
      <Button variant="primary" onClick={switchHunters}>
        Switch Hunters
      </Button>
    </div>
  );

  const getStatus = () => {
    var status;
    if (!inGame) {
      status = "";
    } else if (
      gameState == gameStates.Exploring ||
      gameState == gameStates.Starting
    ) {
      if (currentUser.guide) {
        if (
          (currentUser.team == "red" && redHistory.length == 0) ||
          (currentUser.team == "blue" && blueHistory.length == 0)
        ) {
          status = voteInput("Select a starting location");
        } else {
          status = clueInput;
        }
      } else {
        status = "Exploring";
      }
    } else if (gameState == gameStates.Guessing) {
      status = voteInput(`Clue: ${clue}`);
    } else if (gameState == gameStates.SwitchingTeam) {
      status = switchHuntersInput(reason);
    } else {
      status = "Exploring";
    }
    return <div className="status">{status}</div>;
  };

  const HUD = <div className="hud">{getStatus()}</div>;
  const startGame = (
    <a
      className="join-link"
      onClick={() => {
        StartGame();
      }}
    >
      Start Game
    </a>
  );
  const leaderboard = (
    <div className="leaderboard-container">
      <div className="teams">
        <div
          style={{
            height: "20%",
            width: "100%",
            display: "inline-block",
            position: "relative",
          }}
        >
          <p className="team-role" style={{ left: "0%" }}>
            {inGame ? (hunters == "blue" ? "hunters" : "runners") : ""}
          </p>
          <p className="team-role">
            {inGame ? (hunters == "red" ? "hunters" : "runners") : ""}
          </p>
        </div>
        <div
          style={{ height: "5px", width: "100%", backgroundColor: "#838383" }}
        ></div>
        <div className="team-box">
          <div className="team-group">
            {" "}
            {blueTeam.map((user) => (
              <p className={`blue-name ${user.guide ? "guide" : ""}`}>
                {user.name}
              </p>
            ))}
            <a
              className="join-link"
              onClick={() => {
                joinTeam("blue");
              }}
            >
              Join Blue
            </a>
          </div>
          <div
            style={{ height: "100%", backgroundColor: "#838383", width: "5px" }}
          />
          <div className="team-group">
            {" "}
            {redTeam.map((user) => (
              <p
                className="red-name"
                onClick={() => {
                  joinTeam("red");
                }}
              >
                {user.name}
              </p>
            ))}
            <a
              className="join-link"
              onClick={() => {
                joinTeam("red");
              }}
            >
              Join Red
            </a>
          </div>
        </div>
      </div>
      <div className="spectators">
        {spectators.map((spectator) => (
          <p className="spectator-name">{spectator.name}</p>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <Modal show={showSetName} onHide={handleClose} className="modal">
        <Modal.Body className="setname-modal">
          <Form.Group>
            <Form.Control
              className="textFeedback"
              placeholder="Your Name"
              onChange={(e) => setUserName(e.target.value)}
              type="text"
              className="name-input"
            />
          </Form.Group>
          <Button variant="primary" onClick={handleClose}>
            Submit
          </Button>
        </Modal.Body>
      </Modal>
      <div className={`Game`}>
        <div className="history-container">
          <div className="history-div"></div>
        </div>
        <div className="board-container">
          {HUD}
          {gridWords.length > 0 ? grid() : startGame}
        </div>
        <div className="lobby-container">
          <div className="lobby-div">
            {leaderboard}
            <div className="chat-container"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Game;
