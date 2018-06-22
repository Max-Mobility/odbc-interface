
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
    "RMA Serial (Detail)": "RmaDetailSer",
    "Inventory (Master)": "InvMaster",
    "Inventory (Master)+": "InvMaster+",
    "Inventory Serial Head": "InvSerialHead",
    "Inventory Serial Head+": "InvSerialHead+",
    "Inventory Serial CrossRef": "InvSerialCrossRef",
    "Inventory Serial Transaction": "InvSerialTrn",
};

function padNumber(str, len=15, c='0') {
    //     '000000000001363'
    var s= '', c= c || '0', len= (len || 2)-str.length;
    while(s.length<len) s+= c;
    return s+str;
}

const numberFields = {
    SalesOrder: 15,
    Customer: 15,
    CustomerPoNumber: 15,
    RmaNumber: 15
}
const numbers = Object.keys(numberFields);

function makeQueries(table, data) {
    var q = [];
    tables[table].fields.map((f) => {
        if (data[f]) {
            if (numbers.indexOf(f) > -1) {
                q.push({
                    [f]: padNumber(data[f])
                });
            } else {
                q.push({
                    [f]: data[f]
                });
            }
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
            'ShipAddress3Loc',
            'ShipAddress4',
            'ShipAddress5',
            'ShipPostalCode',
        ],
        "makeObject": function(input, output, customer) {
            output["Order Number"] = input.SalesOrder;
            output["PO Number"] = input.CustomerPoNumber;
            output["Email"] = input.Email;
            output["Customer Name"] = input.CustomerName;
            output["Customer Number"] = input.Customer;
            output["Last Operator"] = input.LastOperator;
            output["Shipping Address"] = [
                input.ShipAddress1,
                input.ShipAddress2,
                input.ShipAddress3,
                input.ShipAddress3Loc,
                input.ShipAddress4,
                input.ShipAddress5,
                input.ShipPostalCode
            ].join('\n');
            // customer
            customer["Number"] = input.Customer;
            customer["Name"] = input.CustomerName;
            customer["Email"] = input.Email;
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
            'RmaNumber',
            'NextLine',
            'Customer',
            'Branch',
            'ShipAddress1',
            'ShipAddress2',
            'ShipAddress3',
            'ShipAddress3Loc',
            'ShipAddress4',
            'ShipAddress5',
            'ShipPostalCode',
            'ShipToGpsLat',
            'ShipToGpsLong',
            'ExtTaxCode',
            'Telephone',
            'Fax',
            'PrintedFlag',
            'Status',
            'EntryDate',
            'LastTransactDate',
            'Operator',
            'UserField1',
            'CustomerName',
            'MultiShipCode',
            'Area',
            'SpecialInstrs',
            'Currency',
            'AlternateKey',
            'OrderType',
            'ServiceTicket',
            'Contact',
            'LanguageCode',
            'TimeStamp'            
        ],
        "makeObject": function(input, output, customer) {
            output["RMA Number"] = input.RmaNumber;
            output["Status"] = input.Status;
            output["Customer"] = input.Customer;
            output["Customer Name"] = input.CustomerName;
            output["Operator"] = input.Operator;
            output["Shipping Address"] = [
                input.ShipAddress1,
                input.ShipAddress2,
                input.ShipAddress3,
                input.ShipAddress3Loc,
                input.ShipAddress4,
                input.ShipAddress5,
                input.ShipPostalCode
            ].join('\n');
            output["Entry Date"] = input.EntryDate;
            output["Last Transaction Date"] = input.LastTransactDate;
            output["Special Instructions"] = input.SpecialInstrs;
            output["Service Ticket"] = input.ServiceTicket;
        }
    },
    "RmaMaster+": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) {
            console.log(intput);
        }
    },
    "RmaDetail": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) {
            console.log(intput);
        }
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
            console.log(input);
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


// RmaMaster
//    - get:
//    - from: Customer (SorMaster)
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
    var obj = {};
    return lookup({
        '_table': 'RmaMaster',
        'queries': [
            {
                RmaNumber: rma
            }
        ]
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return lookup({
            '_table': 'RmaMaster+',
            'queries': [
                {
                    RmaNumber: rma
                }
            ]
        });
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return lookup({
            '_table': 'RmaDetail',
            'queries': [
                {
                    RmaNumber: rma
                }
            ]
        });
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return lookup({
            '_table': 'RmaDetailSer',
            'queries': [
                {
                    RmaNumber: rma
                }
            ]
        });
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return [obj];
    });
}

function checkOrder(order) {
    var obj = {};
    return lookup({
        '_table': 'SorMaster',
        'queries': [
            {
                SalesOrder: order
            }
        ]
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return lookup({
            '_table': 'SorDetail',
            'queries': [
                {
                    SalesOrder: order
                }
            ]
        });
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return [obj];
    });
}

module.exports = {
    padNumber,
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
