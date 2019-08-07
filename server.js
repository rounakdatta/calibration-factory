// server.js
// where your node app starts

// init project
const http = require('http');
const https = require('https');
const fs = require('fs');
const request = require('request');
const express = require('express');
const firebase = require('firebase');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();
const app = express();
const cookieParser = require('cookie-parser');
const session = require('express-session');

var config = {
    apiKey: process.env.APIKEY,
    authDomain: process.env.AUTHDOMAIN,
    databaseURL: process.env.DBURL,
    projectId: process.env.PROJECTID,
    storageBucket: process.env.STORAGEBCKT,
    messagingSenderId: process.env.MSID
  };

var fbapp = firebase.initializeApp(config);
var db = fbapp.database();
var auth = fbapp.auth();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json())

app.use(express.static(path.resolve(`${__dirname}/web/public`)));
console.log(`${__dirname}/web`);
app.use('*', (req, res, next) => {
  console.log(`URL: ${req.baseUrl}`);
  next();
});

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept,X-access-token');
  next();
});

app.use((err, req, res, next) => {
  if (err) {
    res.send(err);
  }
});

app.use(cookieParser());
app.use(session({secret: 'nErDsFoRnErDs'}));

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.static(__dirname + '/views'));

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', function(req, res) {
	if (req.cookies.currentUser) {
		return res.redirect('/userdashboard');
	} else {
		return res.redirect('/login');
	}  
});

app.get('/logout', function(req, res) {
	auth.signOut();
	res.clearCookie('currentUser');
	return res.redirect('/');
});

// register API
app.get('/register', function(req, res) {
	if (req.cookies.currentUser) {
		return res.redirect('/userdashboard');
	} else {
		res.render('register.html');
	}
});

app.post('/register', function(req, res) {
	var email = req.body.email;
	var pwd = req.body.pwd;

	auth.createUserWithEmailAndPassword(email, pwd)
	.then(function(userData) {
	  console.log('registering and logging in');
	  res.cookie('currentUser', auth.currentUser);
		return res.redirect('/userdashboard');
	})
	.catch(function(error) {
			if (error) {
				res.send(error);
			}
	})
	
});

// login API
app.get('/login', function(req, res) {
  console.log('getting to login')
	if (req.cookies.currentUser) {
		return res.redirect('/userdashboard');
	} else {
		res.render('login.html');
	}
});

app.post('/login', function(req, res) {
	var email = req.body.email;
	var pwd = req.body.pwd;

	auth.signInWithEmailAndPassword(email, pwd)
	.then(function(userData) {
		console.log('logging in');
		res.cookie('currentUser', auth.currentUser);

		if (req.query['redirect'] != null) {
			var finalURL = req.query['redirect'].replace(/\s/g, "/");
			return res.redirect(finalURL);
		}

		return res.redirect('/userdashboard');
	})
	.catch(function(error) {
		if (error) {
			res.send(error);
		}
	});
});

// dashboard API
app.get('/userdashboard', function(req, res) {
	if (req.cookies.currentUser) {
    res.render('dashboard.html');
	} else {
		return res.redirect('/login');
	}
});

app.post('/receive/calibration', function(req, res) {
  let userEmail = req.cookies.currentUser.providerData[0].uid.split("@")[0];
  let payload = {"user": userEmail, "data": req.body};
  let serialNumber = payload["data"]["Serial Number"];
  db.ref().child("calibrations").child(serialNumber).set(payload);
  return res.send(payload);
});

app.post('/search', function(req, res) {
  let searchQuery = req.body.smartQuery;
  db.ref().child("calibrations").orderByKey().startAt(searchQuery).endAt(searchQuery + "\uf8ff").once("value")
  .then(snapshot => {
    let outputResult = snapshot.val();
    return res.render('search.html', {'searchResults': JSON.stringify(outputResult)})
  })
})

app.get('/get/all', function(req, res) {
  db.ref().child('calibrations').once('value')
  .then(snapshot => {
    return res.send(snapshot.val())
  })
})

app.get('/calibration/:calibrationId', function(req, res) {
  db.ref().child("calibrations").child(req.params.calibrationId).once("value")
  .then(snapshot => {
    return res.send(snapshot.val())
  })
})

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});