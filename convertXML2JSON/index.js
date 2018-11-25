const azure = require('azure-storage');
const xml2js = require('xml2js');
const currentSanctionsContainer = "02-current"
const currentSanctionsfile = "sanctions-eu.xml"
const jsonContainer="03-json"
const jsonSanctionsfile="sanctions-eu.json"

module.exports = async function (context, myBlob) {
    context.log("Blobtrigger: convertXML2JSON processed blob \n Name:", context.bindingData.name, "\n Blob Size:", myBlob.length, "Bytes");
        xmlData = await readSanctionsFile(context, currentSanctionsContainer, currentSanctionsfile);
        jsonData = await xmlToJson(xmlData);
        await createBlob(jsonContainer, jsonSanctionsfile, JSON.stringify(jsonData));
};

function readSanctionsFile(context, container, blobName) {
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

function xmlToJson(xmlData) {
    return new Promise((resolve, reject) => {
        var parser = new xml2js.Parser({ mergeAttrs: true });
        parser.parseString(xmlData, (err, result) => {
            if (!err) {
                resolve(result);
            } else {
                reject(err);
            }
        });

    })
}

async function createBlob(containerName, blobName, data) {
    return new Promise((resolve, reject) => {
        var blobService = azure.createBlobService();
        blobService.createBlockBlobFromText(containerName, blobName, data, function (error, result, response) {
            if (!error) {
                resolve("Blob Created Succesfully")
            } else {
                reject("something went wrong creating blob")
            }
        });
    })
}
