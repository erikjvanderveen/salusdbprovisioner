const mongoose = require('mongoose');
const azure = require('azure-storage');
const currentSanctionsfile = 'sanctions-eu.json'
const container = '03-json'

module.exports = async function (context, myBlob) {
    context.log("JavaScript blob trigger function processed blob \n Name:", context.bindingData.name, "\n Blob Size:", myBlob.length, "Bytes");

    context.log("STARTING IMPORT")
    secrets = require('./secrets.js');
    context.log("SECRET:", secrets);

    var jsonText = await readSanctionsJson(context, container, currentSanctionsfile);
    var jsonData = JSON.parse(jsonText);
    context.log("JSONTEXT.LENGTH:", jsonText.length);
    context.log("SECRET:", secrets)
    await uploadSanctions(context, jsonData, secrets);

    //  TODO:  Authentication
    function uploadSanctions(context, sanctions, secrets) {
        return new Promise((resolve, reject) => {
            const url = secrets.mongoDataBase.url;
            context.log("URL:", url)
            var connection = mongoose.connect(url, { useNewUrlParser: true });
            // TODO: should sanctionEntity be the base ?
            let sanctionsList = sanctions.export.sanctionEntity
            var count = sanctionsList.length
            var db = mongoose.connection;
            var collection = secrets.mongoDataBase.collection;
            db.dropCollection(collection)
                .then(db.createCollection(collection)
                    .then((collection, err) => {
                        console.log("ERR:", err);
                        if (!err) {
                            sanctionsList.forEach((sanction) => {
                                context.log("count:", count--)
                                collection.insertOne(sanction)
                            });
                            mongoose.connection.close().then(() => {
                                resolve()

                            });
                        } else {
                            console.log("Error: ", err);
                            reject(err);
                        }

                    })
                ).catch((error) => {
                    context.log("Someyhing went wrong during upload to Mongo: ", error);
                });

        })

    }

    function readSanctionsJson(context, container, blobName) {
        context.log("Loading: ", container, " -- ", blobName)
        return new Promise((resolve, reject) => {
            var blobService = azure.createBlobService();
            blobService.getBlobToText(container, blobName, (error, text, blockBlob, response) => {
                if (!error) {
                    //context.log(text);
                    resolve(text);
                } else {
                    reject(error);
                }
            })
        })
    }

};

