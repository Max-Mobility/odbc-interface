
const fieldMap = {
    "SmartDrive Serial Number": "Serial",
    "PushTracker Serial Number": "Serial",
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
    "Inventory (Master)": "InvMaster",
    "Inventory (Master)+": "InvMaster+",
    "Inventory Serial Head": "InvSerialHead",
    "Inventory Serial Head+": "InvSerialHead+",
    "Inventory Serial CrossRef": "InvSerialCrossRef",
    "Inventory Serial Transaction": "InvSerialTrn",
};


// InvSerialHead
//    - get: StockCode, Serial, SerialDescription, ServiceFlag
//    - from: Customer (SorMaster)
// SorMaster
//    - get: ShippingInstrs, CustomerName, CustomerPoNumber, ShipAddress{1-5}, ShipPostalCode, Email, LastOperator
// SorDetail
//    - get: MStockCode, MStockDes, MOrderQty
//    - from: SalesOrder (SorMaster)
//    - use: LineType=1 (2 is comment)
// ArCustomer
//    - get: Name, Telephone, Contact, SoldTo* (?), ShipTo* (?)
//    - from: Customer (SorMaster)

var odbc = require('odbc')
, conn_str = "DSN=MySQLServerDatabase;"
, cn = conn_str + process.env.ODBC_CONNECTION_STRING
;
var db = new odbc.Database();
db.open(cn, function (err) {
    if (err) return console.log(err);

    console.log(`Connected: ${db.connected}`);
});

function checkRMA(rma) {
}

function checkOrder(order) {
}

function lookup(opts) {
    return new Promise((resolve, reject) => {

        var table = opts._table;

        var query = `select * from [${table}]`;
        if (opts.queries.length) {
            query += ' where';
        }
        opts.queries.map(q => {
            Object.entries(q).map(e => {
                var k = e[0],
                    v = e[1];
                console.log(e);
                if (v && v.length) {
                    query += ` ${k}='${v}' AND`;
                }
            });
        });
        query = query.replace(/AND$/, ';');
        console.log(query);

        db.query(query, (err, data) => {
            if (err) {
                console.log('Got error!');
                reject(err);
            } else {
                console.log('Got data!');
                resolve(data);
            }
        });
    });
}

module.exports = {
    fieldMap,
    tableMap,
    checkRMA,
    checkOrder,
    lookup,
    db
};
// END DATABASE
