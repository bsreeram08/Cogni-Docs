/**
 * Auto-register built-in agent providers via side-effect imports
 */

import { registerAgentProvider } from "./registry.js";
import { heuristicAgentProvider } from "./heuristic.js";

registerAgentProvider("heuristic", heuristicAgentProvider);
