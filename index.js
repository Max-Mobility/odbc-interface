const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');

// DATABASE
const typeQueryMap = {
    "SmartDrive Serial Number": null,
    "PushTracker Serial Number": null,
    "Mark For": null,
    "Email": "Email",
    "Sales Order Number": "SalesOrder",
    "Customer Number": "Customer",
    "PO Number": "CustomerPoNumber"
};
const types=Object.keys(typeQueryMap);

var odbc = require('odbc')
, conn_str = "DSN=MySQLServerDatabase;"
, cn = conn_str + process.env.ODBC_CONNECTION_STRING
;
var db = new odbc.Database();
db.open(cn, function (err) {
    if (err) return console.log(err);

    console.log(`Connected: ${db.connected}`);
});
// END DATABASE

// vars
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

const port = 3000;

app.engine('.hbs', exphbs({
  defaultLayout: 'main',
    extname: '.hbs',
    helpers: require('./helpers.js'),
  layoutsDir: path.join(__dirname, 'views/layouts')
}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname, 'views'));

// main page
app.get('/', (request, response) => {
    response.render('home', {types: types});
});

// SorMaster - ShippingInstrs, CustomerName, ShipAddress{1-5}, ShipPostalCode, Email, LastOperator
// SorDetail - MStockCode, MStockDes, MOrderQty
//    - from SalesOrder (SorMaster)
//    - use LineType=1 (2 is comment)
// ArCustomer - Name, Telephone, Contact, SoldTo* (?), ShipTo* (?)
//    - from Customer (SorMaster)

// handle search from post (when submit is pressed)
app.post('/', (request, response) => {
    var searchType = request.body.searchType;
    var searchQuery = request.body.searchQuery;

    console.log(`Searching by: ${searchType}`);
    console.log(`Searching for: ${searchQuery}`);

    var type = typeQueryMap[searchType];
    if (type && type.length && searchQuery && searchQuery.length) {
        //var query = `select * from [dbo.ArCustomer+] where ${type}=${searchQuery}`;
        var query = `select * from dbo.ArCustomer where ${type}=${searchQuery}`;
        //var query = `select * from dbo.SorMaster where ${type}=${searchQuery}`;
        //var query = `select * from dbo.SorDetail where ${type}='${searchQuery}'`;
        console.log(query);
        db.query(query, (err, data) => {
            if (err) console.log(err);
            //console.log(data);
            response.render('result', {
                items: data,
                types: types,
                search: {
                    type: searchType,
                    query: searchQuery
                }
            });
        });
    }
});

// something here?
app.use((err, request, response, next) => {
    console.log(err);
    response.status(500).send('Something Broke!');
});

// start the app
app.listen(port, (err) => {
    if (err) {
        return console.log(`Something happened: ${err}`);
    }

    console.log(`Server is listening on port: ${port}`);
});

// handle process exit
process.on('beforeExit', (code) => {
    console.log(`About to exit with code: ${code}, closing DB`);
    db.close();
});
