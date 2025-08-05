const express = require('express');
const bodyParser = require('body-parser');
const mongodb = require('mongodb');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const expressJWT = require('express-jwt');

const app = express();
const secretKey = 'ABSDFE!@#$%%$#@!1234'

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use('/note' , expressJWT({
    secret: secretKey,
    credentialsRequired: true
}))


let theDb = undefined;

app.post('/note', (req , res) => {
    const note = { text } = req.body;
    note.username = req.user.username;
    mongodb.connect('mongodb://localhost:27017/OnlineNote', { useNewUrlParser: true } , (err , client) => {
        if(err) {
            res.send(err);
            return;
        }
        theDb = client.db();
        theDb.collection('note').insertOne(note, (err , result) => {
            if(err){
                res.send(err);
                return;
            }
            res.send(note);
        })
    })
})

app.get('/note', (req, res) => {
    mongodb.connect('mongodb://localhost:27017/OnlineNote', { useNewUrlParser: true } , (err , client) => {
        if(err){
            res.send(err);
            return;
        }
        theDb = client.db();
        theDb.collection('note').find({'username': req.user.username}).toArray((err , data) => {
            if(err) res.status(500).send(err);
            else res.send(data);
        })
    })
})

app.put('/note', (req, res) => {
    const note = { _id , text } = req.body;
    const objId = new mongodb.ObjectID(note._id);
    mongodb.connect('mongodb://localhost:27017/OnlineNote', { useNewUrlParser: true } , (err, client) => {
        if (err){
            res.send(err);
            return;
        }
        theDb = client.db();
        theDb.collection('note').find({'_id': objId}).toArray((err , data) => {
            if (err) res.send(err);
            else if (data[0].username !== req.user.username) {
                res.send('you have not access to update this todo.');
            } else {
                theDb.collection('note').updateOne({_id: objId} , {$set : {text: note.text}} , (err , result) => {
                    if (err) res.send(err);
                    else res.send(result);
                })
            }
        })
    })
})

app.delete('/note/:id', (req, res) => {
    const deleteId = req.params.id
    const objId = new mongodb.ObjectID(deleteId);
    mongodb.connect('mongodb://localhost:27017/OnlineNote', { useNewUrlParser: true } , (err , client) => {
        if (err){
            res.send(err);
        } else {
            theDb = client.db();
            theDb.collection('note').find({'_id': objId}).toArray((err , data) => {
                if (err) res.send(err);
                else {
                    if(data[0].username !== req.user.username) {
                        res.send('you have not access to delete this todo.');
                    } else {
                        theDb.collection('note').deleteOne({_id: objId} , (err , result) => {
                            if (err) res.send(err);
                            else res.send(result);
                        })
                    }
                }
            })
        }
    })
})



app.post('/user/register', (req, res) => {
    let credentials = { username , password } = req.body;
    credentials.username = credentials.username.toLowerCase();
    mongodb.connect('mongodb://localhost:27017/OnlineNote', { useNewUrlParser: true } , (err , client) => {
        if(err) {
            res.send(err);
            return;
        }
        theDb = client.db();
        theDb.collection('user').find({'username' : credentials.username}).toArray((err , user) => {
            if (err) res.send(err);
            else if (user[0]) {
                res.send({msg: 'this username has regestered already.', token: ''});
            } else {
                bcrypt.genSalt(10, (err , salt) => {
                    if (err) res.send({msg: `${err}`, token: ''});
                    else {
                        bcrypt.hash(credentials.password , salt , (err , hashedPassword) => {
                            if (err) res.send({msg: `${err}`, token: ''});
                            else {
                                credentials.password = hashedPassword;
                                const token = jwt.sign({username: credentials.username} , secretKey)
                                credentials.tokens = credentials.tokens || [];
                                credentials.tokens.push(token)
                                theDb.collection('user').insertOne( credentials , ( err , result ) => {
                                    if(err) res.send({msg: `${err}`, token: ''});
                                    else {
                                        res.send({msg: 'done', token: token})
                                    }
                                })
                            }
                        })
                    }
                })
            }
        })
    })

})

app.post('/user/login', (req, res) => {
    const credentials = { username , password } = req.body;
    mongodb.connect('mongodb://localhost:27017/OnlineNote', { useNewUrlParser: true } , (err , client) => {
        if(err) {
            res.send(err);
            return;
        }
        theDb = client.db();
        theDb.collection('user').find({'username': credentials.username}).toArray((err , user) => {
            if (err) res.send(err);
            else if (!user[0]) {
                res.send({msg:'this username not found.', token: ''});
            } else {
                bcrypt.compare(credentials.password , user[0].password , (err , isMatch) => {
                    if (err) res.send(err);
                    else if (isMatch) {
                        const token = jwt.sign({username: credentials.username}, secretKey)
                        user[0].tokens = user[0].tokens || [];
                        user[0].tokens.push(token);
                        const objId = new mongodb.ObjectID(user[0]._id);
                        delete user[0]._id;
                        theDb.collection('user').updateOne({_id : objId} , {$set : user[0]} , (err , result) => {
                            if (err) res.send({msg: `${err}`, token: ''});
                            else {
                                res.send({msg:'done', token: token});
                            }
                        })
                    } else {
                        res.send({msg:'the password is incorrect!', token: ''})
                    }
                })
            }
        })
    })
})

app.listen(3000);
console.log('server is running at 3000')