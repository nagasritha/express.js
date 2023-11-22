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
app.delete("/drop/:id", async (request, response) => {
  const { id } = request.params;
  const query = `
    DELETE FROM users WHERE id=${id} `;
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
  console.log(query1Result.length !== 0);
  if (query1Result.length !== 0) {
    response.send({ message: "User already registered", status: 400 });
    response.status(400);
  } else {
    const query2 = `
        INSERT INTO users(username,password,email,gender,location,score)
        VALUES("${username}","${encryptedPassword}","${email}","${gender}","${location}",0)`;
    const query2Result = await database.run(query2);
    response.send({ message: "user added successfully", status: 200 });
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
//to add the image
app.get("/galery", async (request, response) => {
  try {
    const query1 = `CREATE TABLE images(
    id INTEGER NOT NULL PRIMARY KEY,
    image_url VARCHAR(500)
);`;
    await database.run(query1);
    response.send("table created");
  } catch (error) {
    response.send(`error:${error}`);
    response.status(400);
  }
});

app.post("/add-image", async (request, response) => {
  const { imageUrl } = request.body;
  console.log(imageUrl);
  const query = `INSERT INTO images (image_url) VALUES("${imageUrl}");`;
  await database.run(query);
  response.send({ message: "Data added successfully" });
});

app.get("/images", middleware, async (request, response) => {
  const query1 = `SELECT * FROM images;`;
  const data = await database.all(query1);
  response.send(data);
});

app.delete("/delete-image/:id", async (request, response) => {
  const { id } = request.params;
  console.log(id);
  const query = `DELETE FROM images WHERE id=${id};`;
  await database.run(query);
  response.send("Item deleted");
});
