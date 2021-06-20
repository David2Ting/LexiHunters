import "./App.css";
import "./Game.css";
import "./Grid.css"
import { Route } from "react-router-dom";
import Homepage from "./components/Homepage";
import Game from "./components/Game";
import "bootstrap/dist/css/bootstrap.min.css";

const App = () => {
  return (
    <div className="App">
      <Route path="/" exact component={Homepage} />
      <Route path="/play" exact component={Game} />
    </div>
  );
};

export default App;
