import { createInitialState } from "./sim/state";
import { renderApp } from "./ui/app";
import "./ui/styles.css";

// Fixed until a later job lets the player start a new game or load a save.
const GAME_SEED = 1;

const root = document.querySelector<HTMLElement>("#app");
if (root) {
  renderApp(root, createInitialState(GAME_SEED));
}
