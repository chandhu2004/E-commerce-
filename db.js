const {MongoClient} = require('mongodb');

const uri = "mongodb://127.0.0.1:27017";
const client = new MongoClient(uri)
let db=null;
async function connectDB(){
    if(!db)
    {
        try{ 
            await client.connect();
            db=client.db('log');
            console.log("Connected to MOngoDB");

        }
        catch(error){
            console.error("MongoDB connection error",error);
            throw error;



        }
    }
    return db
}
const getDb=()=>db;
module.exports={connectDB,getDb};
