//jshint esversion:6
require('dotenv').config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20");
const findOrCreate = require("mongoose-findorcreate");
// const md5 = require("md5");
// const bycrypt = require("bycrypt");
// const saltRounds = 10;
// const encrypt = require("mongoose-encryption");

const app = express();

console.log(process.env.API_KEY);


app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended:true}));

app.use(session({
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false
}));

//initialize passport
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB", {useNewUrlParser: true})


const userSchema =new mongoose.Schema({email: String, password: String, googleId: String, secret: String});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ['password']});

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, {
      id: user.id,
      username: user.username,
      picture: user.picture
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

// passport.serializeUser(User.serializeUser());
//
// passport.deserializeUser(User.deserializeUser());

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    useProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
})

app.get('/auth/google',
  passport.authenticate('google', {scope: ['profile']})
);

app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/register", function(req, res){
  res.render("register");
})

app.get("/login", function(req, res){
  res.render("login");
})

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}).then(function(foundUser){
    if(foundUser){
      res.render("secrets",{ userWithSecret: foundUser});
    }
  })
})

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit")
  }
  else{
    res.redirect("/login")
  }
})

// submit the secret to the database
app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret
  console.log(req.user.id);
User.findById(req.user.id).then(function(foundUser){
  if(foundUser){
    foundUser.secret = submittedSecret
    foundUser.save().then(function(foundUser){
      res.redirect("/secrets");
    });

  }
})

})
app.get("/logout", function(req, res){
  req.logout(function(err){
    if(err){
      return next(err);
    }
    res.redirect("/");

  });

})
// Registering the user
app.post("/register", function(req, res){

User.register({username: req.body.username}, req.body.password, function(err, user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }
  else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});
});
  //
  // bcrypt.hash(req.body.password, saltRounds).then(function(hash) {
  //     // Store hash in your password DB.
  //     const newUser = new User({email: req.body.username, password: hash });
  //     newUser.save().then(function(){
  //       res.render("secrets")
  //     }).catch(function(err){
  //       console.log(err);
  //     })
  // });



app.post("/login", function(req, res){

  const user = new User({username: req.body.username, password:req.body.password})
 req.login(user, function(err){
    if(err){
      console.log(err)
    }
    else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("secrets")
    });
    }
  })
//   const email = req.body.username;
//   const password = req.body.password;
//  // login the user in(level 1 authenticatioin)
//     User.findOne({email: email}).then(function(foundUser){
//       if(foundUser){
//         bcrypt.compare(myPlaintextPassword, hash).then(function(result) {
//     // result == true
//     if(result === true){
//         res.render("secrets");
//     }
// })
//       }
//     });
});

app.listen(3000, function(){
  console.log("Server running on port 3000");
})
