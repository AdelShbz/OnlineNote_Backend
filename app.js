const express = require('express');
const bodyParser = require('body-parser')
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');
const { expressjwt: expressJWT } = require('express-jwt');
const jwt = require('jsonwebtoken');


const app = express();
const secretKey = 'ABSDFE!@#$%%$#@!1234'
const jwtConfig = {
    secret: secretKey,
    algorithms: ['HS256'],
    credentialsRequired: true
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use('/note' , expressJWT(jwtConfig))


const uri = 'mongodb://localhost:27017';
let client;
let database;

async function connectToDatabase() {
    try{
        client = new MongoClient(uri);
        await client.connect();
        database = client.db('OnlineNote')
    }catch(err){
        res.send(err);
    }
}

connectToDatabase();

app.post('/note', async (req, res) => {
    try{
        const note = {text} = req.body;
        note.username = req.auth.username;
        const collection = database.collection('note');
        
        await collection.insertOne(note);
        res.send(note)
    }catch(err) {
        res.send(err)
    }
})

app.get('/note', async (req, res) => {
    try{
        const collection = database.collection('note');
        const data = await collection.find({'username': req.auth.username}).toArray();
        res.send(data);
    }catch(err){
        res.send(err)
    }
})

app.put('/note', async (req, res) => {
    try{
        const note = { _id , text } = req.body;
        const objId = new ObjectId(note._id)
        const collection = database.collection('note');
        const data = await collection.find({'_id': objId}).toArray();
        if(data[0].username !== req.auth.username){
            res.send('you have not access to update this note.');
        } else {
            const result = await collection.updateOne({_id: objId}, {$set : {text: note.text}});
            res.send(result)
        }
        
        
    } catch(err) {
        res.send(err)
    }
})

app.delete('/note/:id', async (req, res) => {
    try{
        const deleteId = req.params.id;
        const objId = new ObjectId(deleteId);
        const collection = database.collection('note');
        const data = await collection.find({'_id': objId}).toArray()
        if (data[0].username !== req.auth.username) {
            res.send('you have not access to delete this note.');
        } else {
            const result = await collection.deleteOne({_id: objId})
            res.send(result)
        }
    }catch(err){
        res.send(err)
    }
})

app.post('/user/register', async (req, res) => {
    try{
        let credentials = { username , password } = req.body;
        credentials.username = credentials.username.toLowerCase();
        const collection = database.collection('user');
        const user = await collection.find({'username': credentials.username}).toArray()
        if(user[0]) {
            res.send({msg: 'this username has regestered already.', token: ''});
        } else {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(credentials.password , salt)
            credentials.password = hashedPassword;
            const token = jwt.sign({username: credentials.username} , secretKey)
            credentials.tokens = credentials.tokens || [];
            credentials.tokens.push(token)
            await collection.insertOne( credentials );
            res.send({msg: 'done', token: token})
        }

    }catch(err) {
        res.send({msg: `${err}`, token: ''})
    }
})

app.post('/user/login', async (req, res) => {
    try{
        const credentials = { username , password } = req.body;
        const collection = database.collection('user');
        const user = await collection.find({'username': credentials.username}).toArray()
        if(!user[0]) {
            res.send({msg:'this username not found.', token: ''});
        } else {
            const isMatch = await bcrypt.compare(credentials.password , user[0].password)
            if(isMatch) {
                const token = jwt.sign({username: credentials.username}, secretKey)
                user[0].tokens = user[0].tokens || [];
                user[0].tokens.push(token);
                const objId = new ObjectId(user[0]._id);
                delete user[0]._id;
                await collection.updateOne({_id : objId} , {$set : user[0]})
                res.send({msg:'done', token: token});
            } else {
                res.send({msg:'the password is incorrect!', token: ''});
            }
        }

    }catch(err){
        res.send({msg: `${err}`, token: ''})
    }
})


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});


