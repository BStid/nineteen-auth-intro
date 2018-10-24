require("dotenv").config();
const express = require("express"),
  cors = require("cors"),
  bodyParser = require("body-parser"),
  port = 3001,
  app = express(),
  massive = require("massive"),
  session = require("express-session"),
  {
    DOMAIN: domain,
    CLIENT_ID: clientID,
    CLIENT_SECRET: clientSecret,
    CONNECTION_STRING: connectionString,
    SESSION_SECRET: secret
  } = process.env,
  passport = require("passport"),
  AuthStratgy = require("passport-auth0");

massive(connectionString)
  .then(dbInstance => app.set("db", dbInstance))
  .catch(console.log);

app.use(cors());
app.use(bodyParser.json());
app.use(
  session({
    secret,
    saveUninitialized: true,
    resave: true,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 52
    }
  })
);

/** Initialize passport */
app.use(passport.initialize());

/** Connect passport to express session. This must come AFTER session as been initialized */
app.use(passport.session());

/** Set up Auth Strategy, callback url will be where a successful login will be directed
 * with the users information. Scope defines what information the user will be asked to
 * approve on sign-up.
 */
passport.use(
  new AuthStratgy(
    {
      domain,
      clientID,
      clientSecret,
      callbackURL: "/login", // original
      scope: "openid email profile"
    },
    (_, __, ___, profile, done) => done(null, profile)
  )
);

/** Serialize user determines what profile information is being stored to passport session
 * you may receive a large profile object, it is better store only what you need.
 */
passport.serializeUser((user, done) => {
  return done(null, user);
});

/**
 * Deserialize user takes the user and stores it on the req.user object, you could also modify
 * the user session before storing to req.user.
 */
passport.deserializeUser((user, done) => {
  return done(null, user);
});

/** /login is the redirect from the front end. Simply run passport.authenticate */
app.get(
  "/login",
  passport.authenticate("auth0", {
    successRedirect: "/success",
    failureRedirect: "/login"
  })
);

/** If this endpoint has been hit, we have succeeded in logging in, we have access
 * to the user's profile information on req.user. Here is where we will save to DB if we need
 * then redirect to the front end when done
 */

app.get("/success", (req, res) => {
  console.log("req.user: ", req.user);
  /** This is where we would connect logged in user to db */
  // const db = req.app.get('db')
  // db.users.find({email: req.session.email}).then(user=>{
  //   if (!user){
  //     db.users.insert(req.user).then(newUser=>{
  //       req.session.user = newUser;
  //       res.redirect("/home");
  //     }).catch(console.log)
  //   } else {
  //     req.session.user = newUser;
  //     res.redirect("/home");
  //   }
  // }).catch(console.log)
  res.redirect("/home");
});

/**
 * Because we cannot send AJAX info during the login, we create a seperate end point
 * to verify user is authorized.
 */

app.get("/api/user", (req, res) => {
  if (req.user) res.status(200).json(req.user);
  else res.status(500).json("User Not logged in");
});

app.listen(port, () => {
  console.log("Server listening on port", port);
});
// npm i dotenv express cors body-parser massive express-session passport passport-auth0 axios react-router-dom react-redux
