const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const cors = require("cors");

const dbPath = path.join(__dirname, "posts.db");

const app = express();
app.use(express.json());
app.use(cors());

let database = null;
const initalizingServerAndDb = async () => {
  try {
    database = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => console.log("Server is running on port 3000"));
  } catch (error) {
    console.log(`server error:${error}`);
    process.exit(1);
  }
};

initalizingServerAndDb();

app.post("/post", async (request, response) => {
  const query1 = `INSERT INTO posts(post_description,userId)
    VALUES("SQL is the abbreviation of the Structured Query Language words and, it is used to query the databases.",1),
    ("Transact-SQL (T-SQL) language is an extended implementation of the SQL for the Microsoft SQL Server",1),
    ("SQL databases are used to store structured data while NoSQL databases like MongoDB are used to save unstructured data.",2),
    (" MongoDB is used to save unstructured data in JSON format.",3);`;
  await database.run(query1);
  response.send("data added");
});

app.get("/posts", async (request, response) => {
  const query = `
SELECT
  *
FROM
  user NATURAL
  JOIN posts;`;
  const responseData = await database.all(query);
  response.send(responseData);
});

app.get("/noOfPosts", async (request, response) => {
  const query = `SELECT username, COUNT() AS no_of_posts FROM user NATURAL JOIN posts
  GROUP BY username;`;
  const responseData = await database.all(query);
  response.send(responseData);
});

let eventList = [];

const middleware = (request, response, next) => {
  try {
    const date = new Date();
    console.log(date);
    eventList.push(date);
    next();
  } catch (error) {
    response.send({ error: error });
  }
};
console.log(eventList);

app.get("/", middleware, (request, response) => {
  response.send({ list: eventList });
});
