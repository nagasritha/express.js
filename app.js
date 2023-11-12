const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "language.db");
const cors = require("cors");

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

//to create users table
app.get("/create", async (request, response) => {
  const query = `
    CREATE TABLE users(
        id INTEGER NOT NULL PRIMARY KEY,
        username VARCHAR(255),
        email VARCHAR(250),
        gender VARCHAR(250),
        location VARCHAR(250),
        password VARCHAR(250),
        score INT
        );`;
  const creationResponse = await database.run(query);
  response.send("Table created");
});
//to delete the table
app.delete("/drop", async (request, response) => {
  const query = `
    DROP TABLE `;
  const queryResult = await database.run(query);
  response.send("table droped");
});
//to register as a user
app.post("/register", async (request, response) => {
  const { username, password, email, gender, location } = request.body;
  if (password.length <= 4) {
    response.status(400);
    response.send("password must contain more than 4 characters");
    process.exit(1);
  }
  const encryptedPassword = await bcrypt.hash(password, 10);
  const query1 = `
    SELECT * FROM users WHERE email="${email}" AND username="${username}";`;
  const query1Result = await database.all(query1);
  console.log(query1Result);
  if (query1Result !== undefined) {
    response.send("User already registered");
    response.status(400);
  } else {
    const query2 = `
        INSERT INTO users(username,password,email,gender,location,score)
        VALUES("${username}","${encryptedPassword}","${email}","${gender}","${location}",0)`;
    const query2Result = await database.run(query2);
    response.send("user added successfully");
  }
});
//to get login
app.post("/login", async (request, response) => {
  const { username, email, password } = request.body;
  const query1 = `SELECT * FROM users WHERE email="${email}" and username="${username}"`;
  const query1Result = await database.get(query1);
  console.log(query1Result);
  if (query1Result === undefined) {
    response.status(400);
    response.send("Please register and Login");
  }
  decryptPassword = await bcrypt.compare(password, query1Result.password);
  if (decryptPassword) {
    const payload = { username: username };
    console.log(payload);
    const jwtToken = await jwt.sign(payload, "secret_token");
    console.log(jwtToken);
    response.send({ jwtToken });
  } else {
    response.status(400);
    response.send("Invalid Password");
  }
});
//middleware function to authenticate the user
const middleware = async (request, response, next) => {
  let jwtToken;
  const authToken = request.headers["authorization"];
  if (authToken !== undefined) {
    jwtToken = authToken.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.send({ error: "Unauthorized user" });
    response.status(400);
  } else {
    const valid = jwt.verify(
      jwtToken,
      "secret_token",
      async (error, payload) => {
        if (error) {
          response.status(400);
          response.send({ error: "Authentication failed" });
        } else {
          request.username = payload.username;
          console.log(payload);
          next();
        }
      }
    );
  }
};
//to update the user score
app.put("/score", middleware, async (request, response) => {
  const { score } = request.body;
  const { username } = request;
  console.log(score, username);
  const query1 = `UPDATE users
    SET score=${score}
    WHERE username="${username}"`;
  const query2Response = await database.run(query1);
  const query2 = `select * from users where username="${username}";`;
  const data = await database.get(query2);
  response.send(data);
});
//to update the selected option
app.put("/exercise", async (request, response) => {
  const { question, selected } = request.body;
  console.log(question, selected);
  const query1 = `UPDATE exercise
    SET selected="${selected}"
    WHERE question="${question}"`;
  const query2Response = await database.run(query1);
  const query3 = `SELECT * FROM exercise WHERE question="${question}";`;
  const query3Response = await database.get(query3);
  response.send(query3Response);
});
//to get the user Profile
app.get("/profile", middleware, async (request, response) => {
  const { username } = request;
  const query = `SELECT * FROM users WHERE username="${username}"`;
  const queryResponse = await database.get(query);
  response.send(queryResponse);
});
//created the exercise
app.get("/exercise", async (request, response) => {
  const query = `CREATE TABLE exercise (
        id INTEGER NOT NULL PRIMARY KEY,
        question VARCHAR(500),
        optionFr VARCHAR(100),
        optionSe VARCHAR(100),
        optionTh VARCHAR(100),
        answer VARCHAR(100),
        selected VARCHAR(100),
        language VARCHAR(100),
        marks INTEGER
        );`;
  const queryResponse = await database.run(query);
  response.send("exercise table created");
});
//to add the questions by the admin
app.post("/exercise", async (request, response) => {
  const {
    id,
    question,
    option1,
    option2,
    option3,
    answer,
    language,
    email,
    marks,
  } = request.body;
  console.log(email);
  const query2 = `SELECT * FROM exercise WHERE question="${question}"`;
  const query2Result = await database.get(query2);
  if (email !== "nagasritha@2021gmail.com") {
    response.send({ message: "you don't have access to add the questions" });
    response.status(400);
  } else if (query2Result !== undefined) {
    response.status(400);
    response.send({ message: "Question already exists" });
  } else {
    const query1 = `INSERT INTO exercise ( question, optionFr,optionSe,optionTh,answer,language,selected,marks)
    VALUES("${question}","${option1}","${option2}","${option3}","${answer}","${language}","",${marks})
    `;
    const query1Response = await database.run(query1);
    response.send({ message: "data added successfully" });
  }
});
//to get all the questions
app.get("/questions/:language", middleware, async (request, response) => {
  console.log(request.params);
  const { language } = request.params;

  const query1 = `SELECT * FROM exercise WHERE language="${language}";`;
  const query1Response = await database.all(query1);
  response.send(query1Response);
});
//to get the total marks
app.get("/correctAnswers/:language", async (request, response) => {
  const { language } = request.params;
  const query2 = `SELECT count(*) AS unattempted FROM exercise WHERE selected="" AND language="${language}";`;
  const query2Result = await database.get(query2);
  console.log(query2Result);
  if (query2Result.unattempted > 0) {
    response.status(400);
    response.send({ error: "Complete Your test" });
  } else {
    const query = `SELECT sum(marks) AS score FROM exercise WHERE exercise.selected like exercise.answer AND language like "${language}"`;
    const queryResult = await database.get(query);
    response.send(queryResult);
  }
});
//to get the user details by the admin
app.get("/users", middleware, async (request, response) => {
  const query1 = `SELECT * from users`;
  const queryResult = await database.all(query1);
  response.send(queryResult);
});

app.put("/exercise/marks", async (request, response) => {
  const { id, marks } = request.body;
  console.log(id, marks);
  const query1 = `UPDATE exercise
    SET marks=${marks}
    WHERE id=${id}`;
  const query2Response = await database.run(query1);
  response.send("updated successfully");
});

app.get("/leader", async (request, response) => {
  const query = `SELECT * FROM users ORDER BY score DESC LIMIT 1`;
  const data = await database.get(query);
  response.send(data);
});
