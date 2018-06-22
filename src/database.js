
const fieldMap = {
    "SmartDrive Serial Number": "Serial",
    "PushTracker Serial Number": "Serial",
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

function makeQueries(table, data) {
    var q = [];
    tables[table].fields.map((f) => {
        if (data[f]) {
            q.push({
                [f]: data[f]
            });
        }
    });
    return q;
}

const tables = {
    "SorMaster": {
        "fields": [
            "SalesOrder",
            "Customer",
            "CustomerPoNumber",
            "Email",
            "LastOperator",
            "ShippingInstrs",
            "CustomerName",
            "ShipAddress1",
            "ShipAddress2",
            "ShipAddress3",
            "ShipAddress4",
            "ShipAddress5",
        ],
        "makeObject": function(input, output, customer) {
            output["Order Number"] = input.SalesOrder;
            output["PO Number"] = input.CustomerPoNumber;
            output["Email"] = input.SalesOrder;
            output["Customer Name"] = input.CustomerName;
            output["Customer Number"] = input.Customer;
            output["Last Operator"] = input.LastOperator;
            output["Shipping Address"] = [
                input.ShipAddress1,
                input.ShipAddress2,
                input.ShipAddress3,
                input.ShipAddress4,
                input.ShipAddress5,
            ].join('\n');
        }
    },
    "SorDetail": {
        "searchBy": [
            "SalesOrder"
        ],
        "fields": [
            "MStockCode",
            "MStockDes",
            "MorderQty"
        ],
        "makeObject": function(input, output, customer) { }
    },
    "ArCustomer": {
        "searchBy": [
            "Customer"
        ],
        "fields": [
            "Name",
            "Telephone",
            "Contact",
            // SoldTo*?
            // ShipTo*?
        ],
        "makeObject": function(input, output, customer) {
            customer["Name"] = input.Name;
            customer["Telephone"] = input.Telephone;
            customer["Contact"] = input.Contact;
        }
    },
    "ArCustomer+": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) { }
    },
    "RmaMaster": {
        "searchBy": [
            "Customer"
        ],
        "fields": [
        ],
        "makeObject": function(input, output, customer) {
            console.log(Object.keys(input));
            output["RMA Number"] = input.RmaNumber;
        }
    },
    "RmaMaster+": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) { }
    },
    "RmaDetail": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) { }
    },
    "InvMaster": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) { }
    },
    "InvMaster+": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) { }
    },
    "InvSerialHead": {
        "searchBy": [
            "Customer",
        ],
        "fields": [
            "StockCode",
            "Serial",
            "SerialDescription",
            "ServiceFlag",
        ],
        "makeObject": function(input, output, customer) {
            output['Stock Code'] = input.StockCode;
            output['Serial Number'] = input.Serial;
            output['Description'] = input.SerialDescription;
            output['Service Flag'] = input.ServiceFlag;
        }
    },
    "InvSerialHead+": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) { }
    },
    "InvSerialCrossRef": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) { }
    },
    "InvSerialTrn": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) { }
    },
}


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
                //console.log(e);
                if (v && v.length) {
                    query += ` ${k}='${v}' AND`;
                }
            });
        });
        query = query.replace(/AND$/, ';');
        console.log(query);

        db.query(query, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

function checkRMA(rma) {
    return lookup({
        '_table': 'RmaMaster',
        'queries': [
            {
                RmaNumber: rma
            }
        ]
    });
}

function checkOrder(order) {
    return lookup({
        '_table': 'SorMaster',
        'queries': [
            {
                SalesOrder: order
            }
        ]
    });
}

module.exports = {
    tables,
    makeQueries,
    fieldMap,
    tableMap,
    checkRMA,
    checkOrder,
    lookup,
    db
};
// END DATABASE
