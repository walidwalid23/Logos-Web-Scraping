const express = require('express');
const request = require('requestretry');
const cheerio = require('cheerio');
const https = require('https');
const app = express();

//https.globalAgent = new https.Agent({ keepAlive: true });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log("Server Listening");
});

app.get('/WalidLogosApi', async function (req, res) {
    //request query inputs
    let country = req.query.country;
    let pageNumber = 0; // pages start from 0
    let isLastPage = false;
    let lastLogo = null
    console.log("received request");
    // set transfer encoding header as chunked since its a stream
    res.writeHead(200, { "Content-Type": "application/json" });

    while (!isLastPage) {
        // const readable = new Stream.Readable({ objectMode: true })
        let url = 'https://www.brandsoftheworld.com/logos/countries/' + country + "?page=" + pageNumber;
        // we had to turn the call back to async/await cause otherwise the loop will keep going before the reponse come
        try {
            let requestedHtml = await makeRequest(url);
            var $ = cheerio.load(requestedHtml);
            //CHECK LAST PAGE
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

            }
            var topLogosDiv = $('.view-content');
            var companiesLogosImages = topLogosDiv.find('img');



            if (isLastPage) {
                // get last logo in last page to send it to client server to close connection when it reach it
                lastLogo = companiesLogosImages.last().attr('src').toString();
            }
            //loop through the images elements and extract the attributes you need
            companiesLogosImages.each(function (i, element) {
                // send object of logo as a stream here
                let companyName = element.attribs.alt.toString();
                let logoImageUrl = element.attribs.src.toString();
                console.log(logoImageUrl)
                //send data as stream
                // you must add a new line after each json to be able to iterate over them 
                // line by line from python side
                res.write(JSON.stringify({
                    "companyName": companyName,
                    "logoImageUrl": logoImageUrl,
                    "lastLogo": lastLogo

                }) + '\n');

            });


            pageNumber++;
        }

        catch (error) {
            console.log(error);
        }
    }

    req.on("close", function () {
        // THE PROBLEM IS THAT THE WEB SCRAPER IS FASTER THAN THE PROCESSING CLIENT SERVER SO IT FINISHES THEN ENDS THE STREAM
        // BEFORE THE CLIENT SERVER CONSUME ALL THE STREAM THEN IT WAIT FOR TIME OUT THEN CLOSES CONNECTION AND GIVE ERROR ON
        // CLIENT SERVER SIDE
        // Don't end the stream before client consumes all the stream because this will cancel the connection with the client server only after the first nationality
        // instead pass a boolean to client server when stream finish and end connection from there
        console.log("client has closed the connection so end the stream");
        res.end();
    });



});


function makeRequest(url) {
    return new Promise(function (resolve, reject) {
        // The callback function takes 3 parameters, an error, response status code and the html
        // WAIT FOR RANDOM NUMBER OF SECONDS FROM 1 TO 10 SECS BETWEEN EACH REQUEST TO AVOID ANTI SCRAPERS
        setTimeout(() => {
            request({
                url: url,
                headers: {
                    "accept": "*/*",
                    "content-type": "application/json",
                    "dnt": "1",
                    "origin": "https://www.brandsoftheworld.com",
                    "user-agent": 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
                    'Connection': 'keep-alive',
                    "sec-ch-ua": '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
                },
                // The below parameters are specific to request-retry
                maxAttempts: 5,   // (default) try 5 times
                retryDelay: 5000,  // (default) wait for 5s before trying again
                retryStrategy: request.RetryStrategies.HTTPOrNetworkError // (default) retry on 5xx or network errors
            }, function (error, res, html) {
                if (!error && res.statusCode === 200) {
                    resolve(html);
                } else {
                    console.log("Error: " + error)
                    console.log("Status Code: " + res.statusCode)
                    reject(error);
                }
            });
        }, Math.floor(Math.random() * 1000) + 1);



    });
}


