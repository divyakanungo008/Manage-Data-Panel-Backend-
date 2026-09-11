import { config } from "./config.js";
import { app } from "./app.js";

app.listen(config.port, () => {
  console.log(`Manage Data backend running on http://localhost:${config.port}`);
});
