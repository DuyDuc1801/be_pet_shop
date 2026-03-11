const mongoose = require('mongoose');

module.exports.connect = async () => {
    try{
        await mongoose.connect("mongodb://127.0.0.1:27017/db-pet-clinic-shop");
        console.log("Connect database successfully!");
    }
    catch(error){
        console.log(`Connect error: ${error}`);
    }
};