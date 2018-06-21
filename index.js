const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const exphbs = require('express-handlebars');

// DATABASE
const fieldQueryMap = {
    "SmartDrive Serial Number": null,
    "PushTracker Serial Number": null,
    "Mark For": null,
    "Email": "Email",
    "Sales Order Number": "SalesOrder",
    "Customer Number": "Customer",
    "Customer Name": "CustomerName",
    "PO Number": "CustomerPoNumber",
    "RMA Number": "RmaNumber"
};

const tableMap = {
    "Sales Orders (Master)": "SorMaster",
    "Sales Orders (Details)": "SorDetail",
    "Customers": "ArCustomer",
    "Customers+": "ArCustomer+",
    "RMA (Master)": "RmaMaster",
    "RMA (Master)+": "RmaMaster+",
    "RMA (Detail)": "RmaDetail",
};

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
var tableName = null,
    fieldName = null,
    value = null;

var templateContext = function() {
    const fields=Object.keys(fieldQueryMap).map((f) => { return {
        title: f,
        selected: f==fieldName
    }});
    const tables=Object.keys(tableMap).map((f) => { return {
        title: f,
        selected: f==tableName
    }});
    return {
        fields: fields,
        tables: tables,
        search: {
            table: tableName,
            field: fieldName,
            query: value
        }
    };
}

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
    response.render('home', templateContext());
});

// SorMaster - ShippingInstrs, CustomerName, ShipAddress{1-5}, ShipPostalCode, Email, LastOperator
// SorDetail - MStockCode, MStockDes, MOrderQty
//    - from SalesOrder (SorMaster)
//    - use LineType=1 (2 is comment)
// ArCustomer - Name, Telephone, Contact, SoldTo* (?), ShipTo* (?)
//    - from Customer (SorMaster)

// handle search from post (when submit is pressed)
app.post('/', (request, response) => {
    tableName = request.body.searchTable;
    var table = tableMap[tableName];
    fieldName = request.body.searchField;
    var field = fieldQueryMap[fieldName];
    value = request.body.searchQuery;

    console.log(`Searching on: ${tableName}`);
    console.log(`Searching by: ${fieldName}`);
    console.log(`Searching for: ${value}`);

    if (field && field.length) {
        //var query = `select * from [dbo.ArCustomer+] where ${field}=${value}`;
        var query = `select * from [${table}]` +
            (value && value.length && ` where ${field}=${value}`);
        //var query = `select * from dbo.SorMaster where ${field}=${value}`;
        //var query = `select * from dbo.SorDetail where ${field}='${value}'`;
        console.log(query);
        db.query(query, (err, data) => {
            if (err) console.log(err);
            response.render('result', Object.assign(templateContext(), { items: data }));
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
