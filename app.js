require('dotenv').config();
const express=require("express");
const ejs=require("ejs");
const bodyParser=require("body-parser");
const mongoose=require("mongoose");
// const encrypt=require("mongoose-encryption");
const md5=require("md5"); 
const bcrypt=require("bcrypt");
const saltRounds=10;
const app=express();
const session=require("express-session");
const passport=require("passport");
const passportlocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require("mongoose-findorcreate");
app.use(bodyParser.urlencoded({extended:true})); 
app.use(express.static("public"));
app.set('view engine','ejs');
app.use(session({
    secret:"Our little secret",
    resave:false,
    saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
mongoose.connect("mongodb://0.0.0.0:27017/userDB");

const userSchema=new mongoose.Schema({
    email:String,
    password:String,
    googleId:String,
    secret:String
});
userSchema.plugin(passportlocalMongoose);
userSchema.plugin(findOrCreate);
// userSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});
const User=new mongoose.model("User",userSchema);
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

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    }); 
  }
));
app.get("/",function(request,response){
response.render("home");
});
app.get("/auth/google",
passport.authenticate("google",{scope:["profile"]})
);
app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(request, response) {
    // Successful authentication, redirect home.
    response.redirect('/secrets');
  });
app.get("/login",function(request,response){
    response.render("login");
});

app.get("/register",function(request,response){
    response.render("register");
});

app.get("/secrets", (request, response) => {
    User.find({ "secret": { $ne: null } })
      .then((foundUsers) => {
        if (foundUsers) {
          response.render("secrets", { usersWithSecrets: foundUsers });
        }
      })
      .catch((err) => {
        console.log(err);
        // Handle the error appropriately.
      });
  });
  
app.get("/submit",function(request,response){
    if(request.isAuthenticated()){
        response.render("submit");
    }else{
        response.redirect("/login");
    }
});
app.get("/logout",function(request,response){
    request.logout(function(err){
        if(err){
            console.log(err);
        }
        response.redirect("/");
    });
  
});
// Assuming you have imported the necessary modules and set up the express server.

app.post("/submit", (request, response) => {
    const submittedSecret=request.body.secret;
    User.findById(request.user.id)
      .then((foundUser) => {
        if (foundUser) {
          foundUser.secret = submittedSecret;
          return foundUser.save();
        }
      })
      .then(() => {
        response.redirect("/secrets");
      })
      .catch((err) => {
        console.log(err);
        // Handle the error appropriately.
      });
  });
  
  
app.post("/register",function(request,response){

    User.register({username:request.body.username},request.body.password,function(err,user){
        if(err){
            console.log(err);
            response.redirect("/register");
        }else{
            passport.authenticate("local")(request,response,function(){
                response.redirect("/");
            });

        }
    });
});
app.post("/login",function(request,response){
    const user=new User({
        username:request.body.username,
        password:request.body.password
    });
    request.login(user,function(err){
        if(err){
            console.log(err);
        }else{
            passport.authenticate("local")(request,response,function(){
            response.redirect("/secrets");
            });
0        }
    
    });
});
// app.post("/register",function(request,response){
//     bcrypt.hash(request.body.password,saltRounds,function(err,hash){
//         const newUser=new User({
//             email:request.body.username,
//             password:hash
//         });
//         newUser.save();
//         response.render("secrets");
//     });

// });
// app.post("/login",function(request,response){
//     const userName=request.body.username;
//     const passWord=request.body.password;
//     User.findOne({email:userName}).then(function(err,founduser){
//        if(!founduser){
//         console.log("not found");
//        }else{
//         if(founduser.password === passWord){
//             response.render("secrets");
//           } 
//         }
//     });
//     console.log(userName);
//     console.log(passWord);
//     // console.log(User.find({}));


// });
// app.post("/login", function(request, response) {
//     const userName = request.body.username;
//     const passWord = request.body.password;
    
//     User.findOne({ email: userName })
//       .then(function(foundUser) {
//         if (!foundUser) {
//           console.log("User not found");
          
//         } else {
//             bcrypt.compare(passWord,foundUser.password,function(err,result){
//                 if(result===true){
//                     response.render("secrets");
//             }
//         });
//         }
//       })
//       .catch(function(err) {
//         console.log(err);
//       });
//   });
  
app.listen(3000,function(){
    console.log("listening on port 3000");
});