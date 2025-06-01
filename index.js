const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


// middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.daisl.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const newsCollection = client.db("newsDb").collection("articles");
        const userCollection = client.db("newsDb").collection("users");

        // articles related apis
        app.get('/articles', async (req, res) => {
            const result = await newsCollection.find().toArray();
            res.send(result);
        })

        app.post('/articles', async (req, res) => {
            const newArticle = req.body;
            const result = await newsCollection.insertOne(newArticle);
            res.send(result);
        })

        app.get('/articles/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const article = await newsCollection.findOne(query);
            res.send(article);
        })

        // user related apis
        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const newUser = req.body;
            // console.log('creating new user', newUser);
            const result = await userCollection.insertOne(newUser);
            res.send(result);
        })

        app.get('/users', async (req, res) => {

            const email = req.query.email;
            console.log(email)
            const result = await userCollection.find({ email }).toArray();
            res.send(result)
        });

        app.patch("/users", async (req, res) => {

            const { email, name, photo } = req.body;

            const result = await userCollection.updateOne(
                { email },
                { $set: { name, photo } }
            );
            res.send(result)
        });

        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Newspaper server is running')
})

app.listen(port, () => {
    console.log(`Newspaper is running on port ${port}`);
})