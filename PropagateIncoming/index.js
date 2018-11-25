const azure = require('azure-storage');
const stream = require('stream');
const crypto = require('crypto');
const minimalNewFiles = 2;

const incomingContainer = "01-incoming"
const currentSanctionsContainer = "02-current"
const archiveSanctionsContainer = "04-archive"
const currentSanctionsfile = "sanctions-eu.xml"

module.exports = async function (context, myBlob) {
    context.log("Blobtrigger: PropagateIncoming processed blob \n Name:",
        context.bindingData.name, "\n Blob Size:", myBlob.length, "Bytes");

    newHash = await getHashForBlob(context, incomingContainer, context.bindingData.name);
    context.log("Hash for file is: ", newHash);
    currentHash = await getHashForBlob(context, currentSanctionsContainer, currentSanctionsfile);
    context.log("Hash for current file is:", currentHash);

    if (newHash == currentHash) {
        context.log("Yeah, we know that file already.. Deleting!")
        await removeBlob(context, incomingContainer, context.bindingData.name);
    } else {
        const blobList = await listBlobs(context, incomingContainer, '');
        var thisHash;
        var fileCounter = 0;
        for (i = 0; i < blobList.length; i++) {
            thisHash = await getHashForBlob(context, incomingContainer, blobList[i]);
            if (thisHash == newHash) { fileCounter++ }
        }
        if (fileCounter >= minimalNewFiles) {
            context.log("More than or equal then ", fileCounter, " files have the same hash, so propagate this file");
            await removeBlob(context, currentSanctionsContainer, currentSanctionsfile);
            await copyBlob(context, incomingContainer, context.bindingData.name, currentSanctionsContainer, currentSanctionsfile);
            await copyBlob(context, incomingContainer, context.bindingData.name, archiveSanctionsContainer, context.bindingData.name);
            for (i = 0; i < blobList.length; i++) {
                thisHash = await getHashForBlob(context, incomingContainer, blobList[i]);
                if (thisHash == newHash) {
                    await removeBlob(context, incomingContainer, blobList[i]);
                }
            }

        } else {
            context.log("This is the ", fileCounter, " of this file");
        }
    }

};


async function getHashForBlob(context, container, blobName) {
    return new Promise((resolve, reject) => {
        var blobService = azure.createBlobService();
        var readStream

        blobService.doesBlobExist(container, blobName, (error, result, response) => {
            if (result.exists) {
                readStream = blobService.createReadStream(container, blobName);
                var md5sum = crypto.createHash('md5');
                readStream.on('data', (d) => {
                    md5sum.update(d);
                })
                readStream.on('end', () => {
                    var generated_hash = md5sum.digest('hex');
                    resolve(generated_hash);
                })
            } else {
                resolve(null);
            }
        })
    })
}


async function removeBlob(ctx, container, blobName) {
    return new Promise((resolve, reject) => {
        var blobService = azure.createBlobService();
        blobService.deleteBlobIfExists(container, blobName, (error, result, response) => {
            if (!error) {
                resolve();
            } else {
                reject(error);
            }
        })
    })
}

async function copyBlob(ctx, incomingContainer, sourceBlob, destinationContainer, destinationBlob) {
    return new Promise((resolve, reject) => {
        var blobService = azure.createBlobService();
        var url = blobService.getUrl(incomingContainer, sourceBlob);
        blobService.startCopyBlob(url, destinationContainer, destinationBlob, ((error, result, response) => {
            if (!error) {
                ctx.log("COPY RESULT:", result)
                ctx.log("COPYSTATUS:", result.copy.status);
                resolve();
            } else {
                reject(error);
            }
        }))
    });
}

async function listBlobs(ctx, container, prefix) {
    return new Promise((resolve, reject) => {
        var blobService = azure.createBlobService();
        blobService.listBlobsSegmentedWithPrefix(container, prefix, null, (error, result, response) => {
            if (!error) {
                resolve(result.entries.map((entry) => { return entry.name }));
            } else {
                reject(error);
            }
        })

        //    function listBlobsSegmentedWithPrefix(container: string, prefix: string, currentToken: ContinuationToken, callback: ErrorOrResult<ListBlobsResult>)
    })
}