const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const dbPath = path.join(__dirname, "courier.db");
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
//to register as a user
app.post("/register", async (request, response) => {
  const { username, password, email, admin } = request.body;
  if (password.length <= 4) {
    response.status(400);
    response.send("password must contain more than 4 characters");
    process.exit(1);
  }
  const encryptedPassword = await bcrypt.hash(password, 10);
  const query1 = `
    SELECT * FROM users WHERE email="${email}" AND username="${username}";`;
  const query1Result = await database.all(query1);
  if (query1Result.length !== 0) {
    response.send({ message: "User already registered", status: 400 });
    response.status(400);
  } else {
    const query2 = `
        INSERT INTO users(username,password,email,admin)
        VALUES("${username}","${encryptedPassword}","${email}","${admin}")`;
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
    response.send({ message: "Please register and Login" });
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

app.get("/user/:id", async (request, response) => {
  const { id } = request.params;
  console.log(id);
  const query1 = `SELECT * FROM users WHERE id=${id};`;
  const data = await database.all(query1);
  response.send(data);
});

//to insert the data of courier product
app.post("/add-product", middleware, async (request, response) => {
  const { username } = request;
  const {
    productName,
    imageUrl,
    startingPoint,
    endingPoint,
    orderDate,
  } = request.body;
  const query1 = `SELECT * FROM users WHERE username="${username}";`;
  const query1Response = await database.get(query1);
  if (query1Response.admin === "True") {
    const query2 = `INSERT INTO product("product_name","image_url","starting_point","ending_point",order_date)
   VALUES("${productName}","${imageUrl}","${startingPoint}","${endingPoint}","${orderDate}");`;
    await database.run(query2);
    response.send({ message: "Data added", status: 200 });
  } else {
    response.send({ message: "Only Admin can add Data", status: 400 });
  }
});

app.post("/event", middleware, async (request, response) => {
  const { username } = request;
  const { location, deliverBy, productId } = request.body;
  const query1 = `SELECT * FROM users WHERE username="${username}";`;
  const query1Response = await database.get(query1);
  if (query1Response.admin === "True") {
    console.log(location, productId);
    const query3 = `SELECT * FROM events WHERE location="${location}" AND product_id=${productId};`;
    const query3Response = await database.get(query3);
    console.log(query3Response);
    if (query3Response !== undefined) {
      response.send({ message: "location already added", status: 400 });
    } else {
      const query2 = `INSERT INTO events("location",deliver_by,product_id)
   VALUES("${location}","${deliverBy}",${productId});`;
      await database.run(query2);
      response.send({ message: "Data added", status: 200 });
    }
  } else {
    response.send({ message: "Only Admin can add Data", status: 400 });
  }
});

//to get the product
app.get("/product/:id", middleware, async (request, response) => {
  const { id } = request.params;
  const query1 = `SELECT * FROM product WHERE id=${id}`;
  const query2 = `SELECT * FROM events WHERE product_id=${id}`;
  const response1 = await database.get(query1);
  const response2 = await database.all(query2);
  response.send({ response1, eventDetails: response2 });
});

app.put("/add-product/:id", middleware, async (request, response) => {
  const { username } = request;
  const { id } = request.params;
  const {
    productName,
    imageUrl,
    startingPoint,
    endingPoint,
    orderDate,
  } = request.body;
  const query1 = `SELECT * FROM users WHERE username="${username}";`;
  const query1Response = await database.get(query1);
  if (query1Response.admin === "True") {
    const query2 = `UPDATE product
    SET product_name="${productName}",
    image_url="${imageUrl}",
    starting_point="${startingPoint}",
    ending_point="${endingPoint}",
    order_date="${orderDate}"
    WHERE id=${id};`;
    await database.run(query2);
    response.send({ message: "Data updated", status: 200 });
  } else {
    response.send({ message: "Only Admin can add Data", status: 400 });
  }
});

app.put("/event/:id", middleware, async (request, response) => {
  const { username } = request;
  const { id } = request.params;
  const { location, deliverBy, productId } = request.body;
  const query1 = `SELECT * FROM users WHERE username="${username}";`;
  const query1Response = await database.get(query1);
  if (query1Response.admin === "True") {
    console.log(location, productId);
    const query3 = `SELECT * FROM events WHERE location="${location}" AND product_id=${productId} AND deliver_by="${deliverBy}";`;
    const query3Response = await database.get(query3);
    console.log(query3Response);
    if (query3Response !== undefined) {
      response.send({ message: "location already added", status: 400 });
    } else {
      const query2 = `UPDATE events
      SET location="${location}",
      deliver_by="${deliverBy}",
      product_id=${productId}
      WHERE id=${id}`;
      await database.run(query2);
      response.send({ message: "Data updated", status: 200 });
    }
  } else {
    response.send({ message: "Only Admin can add Data", status: 400 });
  }
});

app.delete("/event/:id", middleware, async (request, response) => {
  const { username } = request;
  const { id } = request.params;
  const query1 = `SELECT * FROM users WHERE username="${username}";`;
  const query1Response = await database.get(query1);
  if (query1Response.admin === "True") {
    const query2 = `DELETE FROM events WHERE id=${id};`;
    await database.run(query2);
    response.send({ message: "event deleted", status: 200 });
  } else {
    response.send({ message: "Only Admin can add Data", status: 400 });
  }
});

app.delete("/product/:id", middleware, async (request, response) => {
  const { username } = request;
  const { id } = request.params;
  console.log(id);
  const query1 = `SELECT * FROM users WHERE username="${username}";`;
  const query1Response = await database.get(query1);
  if (query1Response.admin === "True") {
    const query2 = `DELETE FROM product WHERE id=${id};`;
    await database.run(query2);
    const query3 = `DELETE FROM events WHERE product_id=${id};`;
    await database.run(query3);
    response.send({ message: "event deleted", status: 200 });
  } else {
    response.send({ message: "Only Admin can add Data", status: 400 });
  }
});

app.get("/all-products", middleware, async (request, response) => {
  const query = `SELECT * FROM product`;
  const data = await database.all(query);
  response.send(data);
});

app.get("/verify-admin", middleware, async (request, response) => {
  const { username } = request;
  const query = `SELECT * FROM users WHERE username="${username}"`;
  const queryResponse = await database.get(query);
  response.send({"admin":queryResponse.admin));
});
