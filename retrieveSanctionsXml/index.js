const azure = require('azure-storage');
const fetch = require('node-fetch');
const stream = require('stream');

const outputContainer="01-incoming";
const sanctionFileUrl="https://webgate.ec.europa.eu/europeaid/fsd/fsf/public/files/xmlFullSanctionsList_1_1/content/?token=n002d1y5";
const outputFileName="sanctionsFile-eu-{timestamp}.xml"

module.exports = function (context, myTimer) {
    context.log("TimerTrigger RetrieveSanctionsXml started downloading")
    processSanctions(context);
    context.done();
};

async function processSanctions(context) {

    var stamp = timeStamp(new Date);
    let filename=outputFileName.replace("{timestamp}",stamp)
    context.log("Saving Sanctions File as:",filename, " in container: ", outputContainer)
    xmlData = await loadXML();
    await createContainer(outputContainer);
    await createBlob(outputContainer,filename,xmlData);
}

async function loadXML() {
    const options = {
        headers: {
            'Content-Type': 'application/xml',
        },
    }
    return fetch(sanctionFileUrl, options)
        .then(res => res.buffer())
        .then(buffer => {
            return (buffer);
        });
}


async function createContainer(containerName) {
    return new Promise((resolve, reject) => {
        var blobService = azure.createBlobService();
        blobService.createContainerIfNotExists(containerName, {
            publicAccessLevel: 'blob'
        }, function (error, result, response) {
            if (!error) {
                if (result === true) {
                    resolve("Container Created")
                } else {
                    resolve("Container Creation Failed")
                }
            } else {
                reject(error);
            }
        });
    })

}

async function createBlob(containerName, blobName, data) {
    return new Promise((resolve, reject) => {
        var blobService = azure.createBlobService();


        var fileStream = new stream.Readable();
        fileStream.push(data);
        fileStream.push(null);

        blobService.createBlockBlobFromStream(containerName, blobName , fileStream, data.length, function (error, result, response) {
            if (!error) {
                resolve("Blob Created Succesfully")
            } else {
                reject("something went wrong creating blob")
            }
        });
    })
}

function timeStamp(d) {
    var yyyy = d.getFullYear().toString();
    var MM = pad(d.getMonth() + 1, 2);
    var dd = pad(d.getDate(), 2);
    var hh = pad(d.getHours(), 2);
    var mm = pad(d.getMinutes(), 2)
    var ss = pad(d.getSeconds(), 2)

    return yyyy + MM + dd + hh + mm + ss;
};

function pad(number, length) {

    var str = '' + number;
    while (str.length < length) {
        str = '0' + str;
    }

    return str;

}