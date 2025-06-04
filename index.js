const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



// middleware
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true
}));
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
        const publishersCollection = client.db("newsDb").collection("publishers");


        // jwt related apis
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            res.send({ token });
        });


        // middlewares
        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'Unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            const isAdmin = user?.role === 'admin';
            if (!isAdmin) {
                return res.status(403).send({ message: 'Forbidden  access' });
            }
            next();
        }


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

        app.get('/myArticles', async (req, res) => {

            const email = req.query.email;

            const articles = await newsCollection.find({ email }).toArray();
            res.send(articles);

        });

        app.patch('/articles/:id', async (req, res) => {

            const id = req.params.id;
            const { title, description, status, isPremium } = req.body;

            const result = await newsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { title, description, status, isPremium } }
            );

            res.send(result)
        });

        app.delete('/articles/:id', async (req, res) => {

            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await newsCollection.deleteOne(query);

            res.send(result);

        });

        // user related apis
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        });

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'Forbidden access' })
            }

            const query = { email: email };
            const user = await userCollection.findOne(query);
            let admin = false;
            if (user) {
                admin = user?.role === 'admin';
            }
            res.send({ admin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            // console.log('creating new user', newUser);
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'User already exists', insertedId: null })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.get('/myProfile', async (req, res) => {

            const email = req.query.email;
            // console.log(email)
            const result = await userCollection.findOne({ email });
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

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        app.post('/admin/publishers', async (req, res) => {

            const { name, logo } = req.body;
            if (!name || !logo) return res.status(400).json({ message: "Name and logo are required!" });

            const newPublisher = { name, logo };
            await publishersCollection.insertOne(newPublisher);

            res.json({ message: "Publisher added successfully!" });

        });

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await userCollection.deleteOne(query);
            res.send(result);
        })

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