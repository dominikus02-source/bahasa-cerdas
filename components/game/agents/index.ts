import { KataPlayAgentRuntime } from "./core/runtime"
import { QuestionMasterAgent } from "./agents/question-master"
import { DifficultyCoachAgent } from "./agents/difficulty-coach"
import { MotivationEngineAgent } from "./agents/motivation-engine"
import { ProgressAnalystAgent } from "./agents/progress-analyst"
import { ContentCuratorAgent } from "./agents/content-curator"

export { KataPlayAgentRuntime } from "./core/runtime"
export { QuestionMasterAgent } from "./agents/question-master"
export { DifficultyCoachAgent } from "./agents/difficulty-coach"
export { MotivationEngineAgent } from "./agents/motivation-engine"
export { ProgressAnalystAgent } from "./agents/progress-analyst"
export { ContentCuratorAgent } from "./agents/content-curator"
export type * from "./core/types"

export function createGameEngine(): KataPlayAgentRuntime {
  const engine = new KataPlayAgentRuntime()
  engine.registerAgent(new QuestionMasterAgent())
  engine.registerAgent(new DifficultyCoachAgent())
  engine.registerAgent(new MotivationEngineAgent())
  engine.registerAgent(new ProgressAnalystAgent())
  engine.registerAgent(new ContentCuratorAgent())
  return engine
}
