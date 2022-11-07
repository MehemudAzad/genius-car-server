const express = require('express');
const cors = require('cors');
// const { MongoClient, ServerApiVersion } = require('mongodb');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const jwt = require('jsonwebtoken');

const app = express();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.k5k5bzp.mongodb.net/?retryWrites=true&w=majority`;

console.log(uri)

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//verifying jwt token 
function verifyJWT(req, res, next){
    // next()
    const authHeader = req.header.authorization;
    if(!authHeader){
        res.send({message: 'unauthorized access'})
        res.status(401).send({message: 'unauthorized access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err ,decoded){
        if(err){
            res.status(401).ssend({message: 'unauthorized access'})
        }
        req.decoded = decoded;
        next();
        })
}


//using asyncronous function to load data from the database
async function run() {
    try {
        //here the database collection that we are using is genius-car and the collection folder name is services
        const serviceCollection = client.db('genius-car').collection('services');
        const orderCollection = client.db('genius-car').collection('orders');

        //we use post method to create the jwt token in the server
        app.post('/jwt', (req, res) =>{
            const user = req.body;
            // console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'})
            //sending the token as an objext the property is token and the value is also token
            res.send({token});
        })

        //get methods
        app.get('/services', async (req, res) => {
            //finding all the data using {} empty object
            const query = {} 
            //getting the query request from server collection
            const cursor = serviceCollection.find(query); 
            //when we recieve the data at the final step we must await becuase we don't know when the database will return us the value
            const services = await cursor.toArray();
            //getting services 
            res.send(services);
        });

        app.get('/services/:id', async (req, res) => {
            // const id = req.params.id;
            // console.log(req);
            const query = { _id: ObjectId(req.params.id) };
            //findOne is used when we want only one data
            const service = await serviceCollection.findOne(query);
            res.send(service);
        });


        // orders api get method
        app.get('/orders', verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            console.log('inside orders api', decoded);

            if(decoded.email !== req.query.email){ 
                res.send({message: 'unauthorized access'})
            }

            let query = {};

            if (req.query.email) {
                query = {
                    email: req.query.email
                }
            }
            const cursor = orderCollection.find(query);
            const orders = await cursor.toArray();
            res.send(orders); 
        });

        //post methods
        app.post('/orders', verifyJWT, async (req, res) => {
            const order = req.body;
            const result = await orderCollection.insertOne(order);
            res.send(result);
        });

        //patch methods
        app.patch('/orders/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            //sending a field name status to the body
            const status = req.body.status
            const query = { _id: ObjectId(id) }
            //setting the status key value with status value from body
            const updatedDoc = {
                $set:{
                    status: status
                }
            }
            const result = await orderCollection.updateOne(query, updatedDoc);
            res.send(result);
        })

        //delete methods
        app.delete('/orders/:id',verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await orderCollection.deleteOne(query);
            res.send(result);
        })


    }
    finally {

    }

}
//running the function
run().catch(err => console.error(err));

//testing the server if it's working 
app.get('/', (req, res) => {
    res.send('genius car server is running');
})
//listening to the port
app.listen(port, () => {
    console.log(`Genius Car server running on ${port}`);
})