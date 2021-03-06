var express = require('express');
var router = express.Router();

const co = require('co');
const thunkify = require('thunkify');

const fs = require('fs');

const tokens = require('../tokens');
const database = require('../database');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const shortTokenDuration = "2h";
const longTokenDuration =  "1d";

const usersPath = database.usersPath;

const validUsernamePattern = /(\w|\d)+/;

router.post('/register', (req, res) => {
    const userinfo = {username: req.body.username, email: req.body.email, hash: undefined, rcs: [], liked: [], disliked: []};



    if (!userinfo.username || !req.body.password) {
        res.status(400).end("Insufficient information");
        return;
    }

    if (!validUsernamePattern.test(userinfo.username)) {
        res.status(400).end("Invalid username");
        return;
    }

    co(function*() {
        const exists = yield database.userExists(userinfo.username);
        if (exists) {
            res.status(400).send("User already exists");
            return;
        }

        const hash = yield thunkify(bcrypt.hash)(req.body.password, saltRounds);

        userinfo.hash = hash;

        yield thunkify(fs.mkdir)(usersPath + userinfo.username);
        yield database.writeUser(userinfo);

        res.status(201).json(tokens.getToken(userinfo.username, shortTokenDuration));

    })


})

router.post('/login', (req, res, next) => {
    const username = req.body.username;
    const password = req.body.password;

    const remember = req.body.rememberMe || false;

    co(function*() {
        if (!(yield database.userExists(username))) {
            res.status(401).send("Invalid credentials");
            return;
        }
        const userinfo = yield database.getUser(username);

        bcrypt.compare(password, userinfo.hash, (err, matches) => {
            if (matches) {
                res.status(200).json(tokens.getToken(userinfo.username, remember ? longTokenDuration : shortTokenDuration));
            } else {
                res.status(401).send("Invalid credentials");
            }
        })
    })

})

router.get('/user', (req, res) => {
    co(function*() {
        console.log(yield database.addRc("test", {"id": "asd", "visibility": "public", "likes": 0, "dislikes": 0}));
    })
    res.status(200).end();
})

module.exports = router;
