const db = require("./data/db.js");
const cors = require("cors");
const helmet = require("helmet"); //provide security enhancement
const morgan = require("morgan"); //log http request history to terminal
const express = require("express");
const app = express();
const courseRouter = require("./routes/course.js");
const userRouter = require("./routes/user.js");
const searchRouter = require("./routes/search.js");
const ssoRouter = require("./routes/sso.js");
const port = process.env.PORT || 4567;

db.connect();
//use middleware functions
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(courseRouter);
app.use(ssoRouter);
//app.use(userRouter);
app.use(searchRouter);

//launch api
app.listen(port, () => {
  console.log(`server is listening on http://localhost:${port}`);
});
