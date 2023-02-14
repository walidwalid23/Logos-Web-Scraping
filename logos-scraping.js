const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const https = require('https');
const app = express();

https.globalAgent = new https.Agent({ keepAlive: true });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server Listening");
});

app.get('/WalidLogosApi', async function (req, res) {
    //request query inputs
    let country = req.query.country;
    let pageNumber = 0; // pages start from 0
    let isLastPage = false;
    console.log("received request");
    // set transfer encoding header as chunked since its a stream
    res.writeHead(200, { "Content-Type": "text/plain" });

    while (!isLastPage) {
        // const readable = new Stream.Readable({ objectMode: true })
        let url = 'https://www.brandsoftheworld.com/logos/countries/' + country + "?page=" + pageNumber;
        // we had to turn the call back to async/await cause otherwise the loop will keep going before the reponse come
        try {
            let requestedHtml = await makeRequest(url);
            var $ = cheerio.load(requestedHtml);
            // We'll be using Cheerio's function to single out the necessary information using JQUERY
            // using DOM selectors which are normally found in CSS.
            var topLogosDiv = $('.view-content');
            var companiesLogosImages = topLogosDiv.find('img');
            //loop through the images elements and extract the attributes you need
            companiesLogosImages.each(function (i, element) {
                // send object of logo as a stream here
                let companyName = element.attribs.alt.toString();
                let logoImageUrl = element.attribs.src.toString();
                //send data as stream
                res.write(JSON.stringify({
                    "companyName": companyName,
                    "logoImageUrl": logoImageUrl
                }));


            });

            //EXTRACT THE PAGE NUMBER OF LAST PAGE
            var lastPageParentElem = $('.pager-last');
            var lastPageHref = lastPageParentElem.find('a').attr('href');
            var lastPageInt = 0;
            // if last page exists (at last page the last page button disappears)
            if (lastPageHref) {
                // didn't reach last page yet
                var lastPageStr = lastPageHref.substring(lastPageHref.indexOf('=') + 1);
                var lastPageInt = parseInt(lastPageStr) + 1;
            }
            else {
                //reached last page
                isLastPage = true;
                console.log("reached end");
                //end the stream
                res.end();


            }

            pageNumber++;
        }

        catch (error) {
            console.log(error);
        }
    }




});


function makeRequest(url) {
    return new Promise(function (resolve, reject) {
        // The callback function takes 3 parameters, an error, response status code and the html
        request(url, function (error, res, html) {
            if (!error && res.statusCode === 200) {
                resolve(html);
            } else {
                reject(error);
            }
        });
    });
}


