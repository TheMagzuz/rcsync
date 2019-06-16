var exports = module.exports = {}

const co = require('co');

const fs = require('fs');
const path = require('path');

const MongoClient = require('mongodb').MongoClient;

const dbURL = fs.readFileSync(path.join(__dirname, 'dbURL.cfg')).toString();

// Enable dev mode if the devMode.cfg file exists
const devMode = fs.existsSync('devMode.cfg');

var client, db, usersCollection;

var dbName;

if (process.env.UNIT_TEST) {
    dbName = "test";
} else if (devMode) {
    dbName = "dev"
} else {
    dbName = "prod"
}

co(function*() {
    client = yield MongoClient.connect(dbURL, {useNewUrlParser: true});
    db = client.db(dbName);
    usersCollection = db.collection("users")
})

const usersPath = __dirname + '/db/';

exports.usersPath = usersPath;

// TODO: Rewrite to exclusivley use MongoDB

/**
 * Check if a user exists
 * @param {string} username The user to check
 * @return {boolean} If the user exists
 */
exports.userExists = (username) => {
    return co(function*() {
        count = yield usersCollection.countDocuments({username: username});
        return count > 0;
    })
}

exports.getUser = (username) => {
    return usersCollection.findOne({username: username});
}

exports.writeUser = (userinfo, username=userinfo.username) => {
    return usersCollection.updateOne({username: username}, userinfo, {upsert: true});
}

exports.hasRc = (username, id) => {
    return fs.existsSync(path.join(usersPath, username, id));
}

exports.getRcInfo = (username, id) => {
    return co(function*() {
        const user = yield usersCollection.findOne({username: username, "rcs.id": id});
        const rc = user.rcs.find(r => r.id == id);
        return rc;
    })
}

exports.addRc = (owner, rcInfo) => {
    return usersCollection.updateOneOne({username: owner}, {$push: {rcs: rcInfo}});
}

exports.likeRC = (username, id) => {
    return co(function*() {
        if (!exports.hasRc(username, id)) {
            return Promise.reject();
        }
        usersCollection.updateOne({username: username, "rcs.id": id}, {$inc: {"rcs.likes": 1}});
    })
}

exports.unlikeRC = (username, id) => {
    return co(function*() {
        if (!exports.hasRc(username, id)) {
            return Promise.reject();
        }
        usersCollection.updateOne({username: username, "rcs.id": id}, {$inc: {"rcs.likes": -1}});
    })
}

exports.dislikeRC = (username, id) => {
    return co(function*() {
        if (!exports.hasRc(username, id)) {
            return Promise.reject();
        }
        usersCollection.updateOne({username: username, "rcs.id": id}, {$inc: {"rcs.dislikes": 1}});
    })
}

exports.undislikeRC = (username, id) => {
    return co(function*() {
        if (!exports.hasRc(username, id)) {
            return Promise.reject();
        }
        return usersCollection.updateOne({username: username, "rcs.id": id}, {$inc: {"rcs.dislikes": -1}});
    })
}

exports.pushLike = (username, rcOwner, id) => {
    return co(function*() {
       return usersCollection.updateOne({username: username}, {$push: {"$.likes": `${rcOwner}/${id}`} });
    })
}

exports.pullLike = (username, rcOwner, id) => {
    return co(function*() {
       return usersCollection.updateOne({username: username}, {$pull: {"$.likes": `${rcOwner}/${id}`} });
    })
}

exports.pushDislike = (username, rcOwner, id) => {
    return co(function*() {
       return usersCollection.updateOne({username: username}, {$push: {"$.dislikes": `${rcOwner}/${id}`} });
    })
}

exports.pullDislike = (username, rcOwner, id) => {
    return co(function*() {
       return usersCollection.updateOne({username: username}, {$pull: {"$.dislikes": `${rcOwner}/${id}`} });
    })
}
