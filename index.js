const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const databasePath = path.join(__dirname, "booksCollection.db");

const initializeDbAndStartServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndStartServer();

app.post("/register/", async (request, response) => {
    const { username, password, name, gender } = request.body;
    // check if user already exists with the same username
    const selectUserQuery = `
      SELECT * FROM user WHERE username = '${username}';
      `;
    const dbUser = await database.get(selectUserQuery);
    if (dbUser) {
      response.status(400);
      response.send("User already exists");
    } else if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      // Create a new user
      const hashedPassword = await bcrypt.hash(password, 10);
      const addNewUserQuery = `
          INSERT INTO user (name, username, password, gender) 
          VALUES ('${name}', '${username}', '${hashedPassword}', '${gender}');
          `;
      await database.run(addNewUserQuery);
      response.send("User created successfully");
    }
});
  
app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    // check if the username exists
    const selectUserQuery = `
      SELECT * FROM user WHERE username = '${username}';
      `;
    const dbUser = await database.get(selectUserQuery);
    if (!dbUser) {
      response.status(400);
      response.send("Invalid user");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (!isPasswordMatched) {
        response.status(400);
        response.send("Invalid password");
      } else {
        const payload = { username };
        const jwtToken = jwt.sign(payload, "MY_SECRET_KEY");
        response.send({ jwtToken });
      }
    }
});
  
// Authentication Middleware
const authenticateUser = (request, response, next) => {
    let jwtToken;
    const authHeader = request.headers["authorization"];
    if (!authHeader) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwtToken = authHeader.split(" ")[1];
      jwt.verify(jwtToken, "MY_SECRET_KEY", (error, payload) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          request.username = payload.username;
          next();
        }
      });
    }
};

app.get("/books/:bookId/",authenticateUser, async (request, response) => {
    const { bookId } = request.params;
    const getBookQuery = `
      SELECT
        *
      FROM
        book
      WHERE
        book_id = ${bookId};`;
    const book = await db.get(getBookQuery);
    response.send(book);
});

app.post("/books/",authenticateUser, async (request, response) => {
    const bookDetails = request.body;
    const {
      title,
      authorId,
      rating,
      ratingCount,
      reviewCount,
      description,
      pages,
      dateOfPublication,
      editionLanguage,
      price,
      onlineStores,
    } = bookDetails;
    const addBookQuery = `
      INSERT INTO
        book (title,author_id,rating,rating_count,review_count,description,pages,date_of_publication,edition_language,price,online_stores)
      VALUES
        (
          '${title}',
           ${authorId},
           ${rating},
           ${ratingCount},
           ${reviewCount},
          '${description}',
           ${pages},
          '${dateOfPublication}',
          '${editionLanguage}',
           ${price},
          '${onlineStores}'
        );`;
  
    const dbResponse = await db.run(addBookQuery);
    const bookId = dbResponse.lastID;
    response.send({ bookId: bookId });
});

app.put("/books/:bookId/",authenticateUser, async (request, response) => {
    const { bookId } = request.params;
    const bookDetails = request.body;
    const {
      title,
      authorId,
      rating,
      ratingCount,
      reviewCount,
      description,
      pages,
      dateOfPublication,
      editionLanguage,
      price,
      onlineStores,
    } = bookDetails;
    const updateBookQuery = `
      UPDATE
        book
      SET
        title='${title}',
        author_id=${authorId},
        rating=${rating},
        rating_count=${ratingCount},
        review_count=${reviewCount},
        description='${description}',
        pages=${pages},
        date_of_publication='${dateOfPublication}',
        edition_language='${editionLanguage}',
        price=${price},
        online_stores='${onlineStores}'
      WHERE
        book_id = ${bookId};`;
    await db.run(updateBookQuery);
    response.send("Book Updated Successfully");
});

app.delete("/books/:bookId/",authenticateUser, async (request, response) => {
    const { bookId } = request.params;
    const deleteBookQuery = `
      DELETE FROM
        book
      WHERE
        book_id = ${bookId};`;
    await db.run(deleteBookQuery);
    response.send("Book Deleted Successfully");
});

module.exports=app;