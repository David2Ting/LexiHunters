import React, { useState } from "react";
import { Link } from "react-router-dom";
import randomCodeGenerator from "../utils/randomCodeGenerator";

const Homepage = () => {
  const [roomCode, setRoomCode] = useState("");

  return (
    <div className="Homepage">
      <div className="homepage-menu">
        {/* <img src={require("../assets/logo.png").default} width="200px" /> */}
        <img src={window.location.origin + "/Hunter.png"} width="100px" />
        <div className="homepage-form">
          <div className="homepage-join">
            <Link
              style={{ textDecoration: "none", textAlign: "right" }}
              to={`/play?roomCode=${roomCode}`}
            >
              <a className="game-link">JOIN GAME</a>
            </Link>
            <input
              className="game-input"
              type="text"
              placeholder="Game Code"
              onChange={(event) => setRoomCode(event.target.value)}
            />
          </div>
          <div className="homepage-create">
            <Link
              style={{ textDecoration: "none", textAlign: "left" }}
              to={`/play?roomCode=${randomCodeGenerator(5)}`}
            >
              <a className="game-link">CREATE GAME</a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;
