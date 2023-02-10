const express = require('express');
const request = require('request');
const cheerio = require('cheerio');
const app = express();

const PORT = process.env.PORT || 80;
app.listen(PORT, () => {
    console.log("Server Listening");
});

app.get('/WalidLogosApi', function (req, res) {
    //request query inputs
    let country = req.query.country;
    let pageNumber = req.query.pagenumber - 1; // pages start from 0

    let url = 'https://www.brandsoftheworld.com/logos/countries/' + country + "?page=" + pageNumber;
    // The structure of our request call
    // The first parameter is our URL
    // The callback function takes 3 parameters, an error, response status code and the html
    request(url, function (error, response, html) {
        //    console.log(url);
        // First we'll check to make sure no errors occurred when making the request
        if (!error) {
            // Next, we'll utilize the cheerio library on the returned html which will essentially give us jQuery functionality
            var $ = cheerio.load(html);
            // We'll be using Cheerio's function to single out the necessary information using JQUERY
            // using DOM selectors which are normally found in CSS.
            var topLogosDiv = $('.view-content');
            var companiesLogosImages = topLogosDiv.find('img');
            //loop through the images elements and extract the attributes you need
            var companiesNames = [];
            var logosImages = [];

            companiesLogosImages.each(function (i, element) {
                companiesNames.push(element.attribs.alt);
                logosImages.push(element.attribs.src);

            });

            //EXTRACT THE PAGE NUMBER OF LAST PAGE
            var lastPageParentElem = $('.pager-last');
            var lastPageHref = lastPageParentElem.find('a').attr('href');
            var lastPageInt = 0;
            // if last page exists (at last page the last page button disappears)
            if (lastPageHref) {
                var lastPageStr = lastPageHref.substring(lastPageHref.indexOf('=') + 1);
                var lastPageInt = parseInt(lastPageStr) + 1;
            }

            // Send the JSON as a response to the client
            res.json({
                "companies": companiesNames,
                "logos": logosImages,
                "lastPage": (lastPageInt == 0 ? 0 : lastPageInt)
            });
        }

    });
});


