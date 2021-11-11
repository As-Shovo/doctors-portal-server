const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { MongoClient } = require('mongodb');
require('dotenv').config();


// doctors-portal-101-firebase-adminsdk.json

const admin = require("firebase-admin");

const serviceAccount = require("./doctors-portal-101-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json())


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.anxgc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
// console.log(uri);


async function varifyToken(req, res, next) {
  if (req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.split(' ')[1];

    try {
      const decodedUser = await admin.auth().varifyIdToken(token);
      req.decodedEmail = decodedUser.email;

    }
    catch {

    }
  }

  next()
}


async function run() {
  try {
    await client.connect()
    const database = client.db("doctors_portal");
    const appointmentsCollection = database.collection('appontments');
    const usersCollection = database.collection('users');


    app.post('/appointments', async (req, res) => {
      const appointment = req.body;
      // console.log(appointment);
      const result = await appointmentsCollection.insertOne(appointment);
      console.log(result);
      res.json(result)
    });

    app.get('/appointments', varifyToken,  async (req, res) => {
      const email = req.query.email;
      const date = new Date(req.query.date).toLocaleDateString();
      const query = { email: email, date: date };
      console.log(query);
      const cursor = appointmentsCollection.find(query);
      console.log(cursor);
      const appointments = await cursor.toArray();
      res.json(appointments);
    });

    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === 'admin') {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    })


    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.send(result)
    });


    app.put('/users', async (req, res) => {
      const user = req.body;
      const filter = { email: user.email };
      console.log(user);

      const option = { upsert: true };

      const updateDoc = {
        $set: {
          user
        }
      }

      const result = await usersCollection.updateOne(filter, updateDoc, option);
      res.json(result);
    });

    app.put('/users/admin', varifyToken, async (req, res) => {
      const user = req.body;
      // console.log(req.headers.authorization);
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({ email: requester });
        if (requesterAccount.role === "admin") {

          const filter = { email: user.email };
          const updateDoc = {
            $set: { role: "admin" }
          };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result)
        }
      }
      else{
        res.status(403).json({message: 'you do not have to Make admin'})
      }

    })





  }
  finally {
    // await.client.close()
  }
}

run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(port, "listinig server");
})


/*

// app.get('/users')
// app.post('/users')
// app.get('/users/:id')
// app.put('/users/:id');
// app.delete('/users/:id')
// users: get
// users: post

*/