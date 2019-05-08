var express = require('express');
var router = express.Router();

const fs = require('fs');

const tokens = require('../tokens.js');

const usersPath = __dirname + '/../db/';

const bcrypt = require('bcrypt');
const saltRounds = 10;

const shortTokenDuration = "2h";
const longTokenDuration =  "1d";

router.post('/register', (req, res, next) => {
    const userinfo = {username: req.body.username, email: req.body.email, hash: undefined, rcs: {}};

    if (!userinfo.username || !req.body.password) {
        res.status(400).end();
        return;
    }

    if (fs.existsSync(usersPath + userinfo.username)) {
        res.status(400).send("User already exists");
        return;
    }

    bcrypt.genSalt(saltRounds, function(err, salt) {
        bcrypt.hash(req.body.password, salt, function(err, hash) {

            userinfo.hash = hash;

            fs.mkdirSync(usersPath + userinfo.username);
            fs.writeFileSync(usersPath + userinfo.username + '/userinfo.json', JSON.stringify(userinfo));

            res.status(201).json(tokens.getToken(userinfo.username, "2h"));
        });
    })

})

router.post('/login', (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;

    const remember = req.body.rememberMe || false;

    if (!fs.existsSync(usersPath + username)) {
        res.status(401).send("Invalid credentials");
        return;
    }

    const userinfo = JSON.parse(fs.readFileSync(usersPath + username + '/userinfo.json'));

    bcrypt.compare(password, userinfo.hash, (err, matches) => {
        if (matches) {
            res.status(200).json(tokens.getToken(userinfo.username, remember ? longTokenDuration : shortTokenDuration));
        } else {
            res.status(401).send("Invalid credentials");
        }
    })
})

module.exports = router;
