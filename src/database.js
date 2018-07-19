const _ = require('underscore');
const fieldToEntry = {
    "Serial Number": "Inventory (Master)",
    "Email": "Customers",
    "Sales Order Number": "Sales Orders (Master)",
    "Customer Number": "Customers",
    "Customer Name": "Customers",
    "PO Number": "Sales Orders (Master)",
    "RMA Number": "RMA (Master)"
};

const fieldMap = {
    "Serial Number": "Serial",
    "Email": "Email",
    "Sales Order Number": "SalesOrder",
    "Customer Number": "Customer",
    "Customer Name": "CustomerName",
    "PO Number": "CustomerPoNumber",
    "RMA Number": "RmaNumber",
    "Mark For": "MarkFor"
};

const searchFields = {
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
    if (typeof str !== 'string') str = '' + str;
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
                    operator: 'LIKE',
                    column: f,
                    pattern: `%${padNumber(data[f])}%`
                    //[f]: padNumber(data[f])
                });
            } else {
                q.push({
                    operator: 'LIKE',
                    column: f,
                    pattern: `%${data[f]}%`
                    //[f]: data[f]
                });
            }
        }
    });
    return q;
}

function combineShipping(input) {
    return [
        input.ShipAddress1,
        input.ShipAddress2,
        input.ShipAddress3,
        input.ShipAddress3Loc,
        input.ShipAddress4,
        input.ShipAddress5,
        input.ShipPostalCode
    ].join('\n');
}

const exists = (_i) => {
    let i = (_i && _i.trim && _i.trim()) || _i;
    return (i > 0) || (i && i.length);
};

const mergeObjects = (output, a, b) => {
    Object.keys(a).map((k) => {
        var v = a[k];
        var o = output[k];
        if (v && v.length && o && o.length && o.length > v.length) {
            // do nothing
        } else if (o && v && o > v) {
            // do nothing
        } else {
            output[k] = v;
        }
    });
    if (b) {
        Object.keys(b).map((k) => {
            var v = b[k];
            var o = output[k];
            if (v && v.length && o && o.length && o.length > v.length) {
                // do nothing
            } else if (o && v && o > v) {
                // do nothing
            } else {
                output[k] = v;
            }
        });
    }
    return output;
};

const types = {
    "Customer": {
        field: "Customer",
        tables: [
            "ArCustomer",
            "ArCustomer+"
        ],
        inputMap: {
            "Name": 'Name',
            "Number": 'Customer',
            "Telephone": 'Telephone',
            "Contact": 'Contact',
        },
        create: function(input) {
            var o = Object.keys(this.inputMap).reduce((a, e) => {
                a[e] = input[this.inputMap[e]];
                return a;
            }, {});
            return o;
        }
    },
    "Order": {
        field: "SalesOrder",
        tables: [
            "SorMaster",
            "SorDetail",
            "ArInvoice",
            "CusSorMaster+",
        ],
        customerUpdate: function (input, customer) {
        },
        inputMap: {
            'Order Number': "SalesOrder",
            'Email': "Email",
            'Customer Name': "CustomerName",
            'Customer Number': "Customer",
            'PO Number': "CustomerPoNumber",
            'Status': "OrderStatus",
            'Order Date': "OrderDate",
            'Requested Ship Date': "ReqShipDate",
            'Shipping Instructions': "ShippingInstrs",
            'Invoice Number': "Invoice",
            'Actual Ship Date': 'InvoiceDate',
            'Tracking Number': 'Tracking',
            'Mark For': 'MarkFor',
            'Chair Make': 'ChairMake',
            'Chair Model': 'ChairModel',
            'Chair Width': 'ChairWidth',
            'Rear Wheel Size': 'RearWheelSize',
            'Cash or Credit': "CashCredit",
            'Last Invoice': "LastInvoice",
            'Last Operator': "LastOperator",
            'Job': "Job",
            'Serialised?': "SerialisedFlag",
            'Jobs Exist?': "JobsExistFlag",
        },
        create: function(input, customer) {
            /*
            // customer
            customer["Number"] = input.Customer;
            customer["Name"] = input.CustomerName;
            customer["Email"] = input.Email;
            */
            var o = Object.keys(this.inputMap).reduce((a, e) => {
                a[e] = input[this.inputMap[e]];
                return a;
            }, {});
            o["Shipping Address"] = combineShipping(input);
            return o;
        }
    },
    "RMA": {
        field: "RmaNumber",
        tables: [
            "RmaMaster",
            "RmaMaster+",
            "RmaDetail",
            "RmaDetailSer",
        ],
        inputMap: {
            "RMA Number": 'RmaNumber',
            "Status": 'Status',
            "Customer Number": 'Customer',
            "Customer Name": 'CustomerName',
            "Operator": 'Operator',
            "Entry Date": 'EntryDate',
            "Last Transaction Date": 'LastTranactDate',
            "Special Instructions": 'SpecialInstrs',
            "Service Ticket": 'ServiceTicket',
            "Serial Number": 'Serial'
        },
        create: function(input) {
            var o = Object.keys(this.inputMap).reduce((a, e) => {
                a[e] = input[this.inputMap[e]];
                return a;
            }, {});
            o["Shipping Address"] = combineShipping(input);
            return o;
        } 
    },
    "Device": {
        field: "Serial",
        tables: [
            "InvSerialHead",
            "InvSerialHead+",
            "InvSerialTrn",
        ],
        inputMap: {
            'Customer Number': "Customer",
            'Serial Number': 'Serial',
            'Sales Order Number': 'SalesOrder',
            'Invoice Number': 'Invoice',
            'Description': 'SerialDescription',
            'Stock Code': 'StockCode',
            'Service Flag': 'ServiceFlag',
			'Location': 'Location'
        },
        create: function(input, output, customer) {
            var o = Object.keys(this.inputMap).reduce((a, e) => {
                a[e] = input[this.inputMap[e]];
                return a;
            }, {});
            return o;
        }
    }
};

function getCustomer(customer_number) {
    // Loop through our tables
    var tasks = types.Customer.tables.map((t) => {
        var lu = {
            table: t,
            queries: [
                {
                    operator: 'LIKE',
                    column: 'Customer',
                    pattern: `%${padNumber(customer_number)}%`
                }
            ]
        };
        return lookup(lu);
    });
    return Promise.all(tasks).then((dataArray) => {
        return dataArray.reduce((a, e) => {
            var output = a;
            if (e.length) {
                e.map((o) => {
                    output = mergeObjects(output, o);
                });
            }
            return output;
        }, {});
    }).then((obj) => {
        return types.Customer.create(obj);
    }).catch((err) => {
        console.log(`cannot get customer: ${err}`);
    });
};

function getRMAs(customer_number) {
    var lookupOpts = {
        table: 'RmaMaster',
        queries: [
            {
                operator: 'LIKE',
                column: 'Customer',
                pattern: `%${customer_number}%`
            }
        ]
    };
    return lookup(lookupOpts).then(data => {
        var tasks = data.map((d) => {
            console.log(`Looking up RMA: ${d.RmaNumber}`);
            return getRMA(d.RmaNumber);
        });
        return Promise.all(tasks);
    });
}

function getRMA(rma_number) {
    // Loop through our tables
    var tasks = types.RMA.tables.map((t) => {
        var lu = {
            table: t,
            queries: [
                {
                    operator: 'LIKE',
                    column: 'RmaNumber',
                    pattern: `%${padNumber(rma_number)}%`
                }
            ]
        };
        return lookup(lu);
    });
    return Promise.all(tasks).then((dataArray) => {
        return dataArray.reduce((a, e) => {
            var output = a;
            if (e.length) {
                e.map((o) => {
                    output = mergeObjects(output, o);
                });
            }
            return output;
        }, {});
    }).then((obj) => {
        return types.RMA.create(obj);
    }).catch((err) => {
        console.log(`cannot get rma: ${err}`);
    });
};

function getDevices(customer_number) {
    var lookupOpts = {
        table: 'InvSerialHead',
        queries: [
            {
                operator: 'LIKE',
                column: 'Customer',
                pattern: `%${customer_number}%`
            }
        ]
    };
    return lookup(lookupOpts).then(data => {
        var tasks = data.map((d) => {
            console.log(`Looking up device: ${d.Serial}`);
            return getDevice(d.Serial);
        });
        return Promise.all(tasks);
    });
}

function getDevice(serial_number) {
    // Loop through our tables
    var tasks = types.Device.tables.map((t) => {
        var lu = {
            table: t,
            queries: [
                {
                    operator: 'LIKE',
                    column: 'Serial',
                    pattern: `${serial_number}`
                }
            ]
        };
        return lookup(lu);
    });
    return Promise.all(tasks).then((dataArray) => {
        return dataArray.reduce((a, e) => {
            var output = a;
            if (e.length) {
                e.map((o) => {
                    output = mergeObjects(output, o);
                });
            }
            return output;
        }, {});
    }).then((obj) => {
        return types.Device.create(obj);
    }).catch((err) => {
        console.log(`cannot get device: ${err}`);
    });
};

function getOrders(customer_number) {
    var lookupOpts = {
        table: 'SorMaster',
        queries: [
            {
                operator: 'LIKE',
                column: 'Customer',
                pattern: `%${customer_number}%`
            }
        ]
    };
    return lookup(lookupOpts).then(data => {
        var tasks = data.map((d) => {
            console.log(`Looking up order: ${d.SalesOrder}`);
            return getOrder(d.SalesOrder);
        });
        return Promise.all(tasks);
    });
}

function getOrder(order_number) {
    // Loop through our tables
    var tasks = types.Order.tables.map((t) => {
        var lu = {
            table: t,
            queries: [
                {
                    operator: 'LIKE',
                    column: 'SalesOrder',
                    pattern: `%${padNumber(order_number)}%`
                }
            ]
        };
        return lookup(lu);
    })
    return Promise.all(tasks).then((dataArray) => {
        return dataArray.reduce((a, e) => {
            var output = a;
            if (e.length) {
                e.map((o) => {
                    output = mergeObjects(output, o);
                });
            }
            return output;
        }, {});
    }).then((obj) => {
        return types.Order.create(obj);
    }).catch((err) => {
        console.log(`cannot get order: ${err}`);
    });
};

function getOrderByMarkFor(markfor) {
    var lookupOpts = {
        table: 'CusSorMaster+',
        queries: [
            {
                operator: 'LIKE',
                column: 'MarkFor',
                pattern: `%${markfor}%`
            }
        ]
    };
    return lookup(lookupOpts).then(data => {
        var orderNumbers = data.map(d => d.SalesOrder);
        orderNumbers = _.uniq(orderNumbers).filter(i => exists(i));
        var tasks = orderNumbers.map((order) => {
            console.log(`Looking up order: ${order}`);
            return getOrder(order);
        });
        return Promise.all(tasks);
    });
};

function getDeviceByInvoice(invoice) {
    var lookupOpts = {
        table: 'InvSerialTrn',
        queries: [
            {
                operator: 'LIKE',
                column: 'Invoice',
                pattern: `%${invoice}%`
            }
        ]
    };
    return lookup(lookupOpts).then(data => {
        var nums = data.map(d => d.Serial);
        nums = _.uniq(nums).filter(i => exists(i));
        var tasks = nums.map((num) => {
            console.log(`Looking up serial: ${num}`);
            return getDevice(num);
        });
        return Promise.all(tasks);
    });
};

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
            console.log(input);
        }
    },
    "RmaDetail": {
        "fields": [
        ],
        "makeObject": function(input, output, customer) {
            console.log(input);
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
var db = null;
const open = () => {
    db = new odbc.Database();
    db.open(cn, function (err) {
        if (err) return console.log(err);

        console.log(`Connected: ${db.connected}`);
    });
};
open();

function lookup(opts) {
    return new Promise((resolve, reject) => {

        var table = opts.table;

        var query = '';
        if (opts.top > 0) {
            query = `select TOP ${opts.top} * from [${table}]`;
        } else {
            query = `select * from [${table}]`;
        }
        if (opts.queries.length) {
            query += ' where';
        }
        opts.queries.map(q => {
            if (q.pattern && q.pattern.length) {
                var operator = `${q.operator}`;
                var col = `${q.column}`;
                var pattern = `${q.pattern}`;
                if (operator == 'LIKE') {
                    col = `LOWER(${q.column})`;
                    pattern = `LOWER('${q.pattern}')`;
                }
                var invert = q.invert ? `NOT` : '';
                query += ` ${invert} ${col} ${operator} ${pattern} AND`;
            }
        });
        query = query.replace(/AND$/, '');
        if (opts.orderBy !== undefined) {
            query += ` ORDER BY ${opts.orderBy.columns.join(',')} ${opts.orderBy.direction}`;
        }
        query += ';';
        console.log(query);

        db.query(query, (err, data) => {
            if (err) {
                console.log('Query Error!');
                console.log(Object.keys(err));
                console.log(err);
                if (err.message && err.message.includes('Communication link failure')) {
                    // try to re-open the connection
                    open();
                }
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
        table: 'RmaMaster',
        queries: [
            {
                operator: 'LIKE',
                column: 'RmaNumber',
                pattern: `%${rma}%`
            }
        ]
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return lookup({
            table: 'RmaMaster+',
            queries: [
                {
                    operator: 'LIKE',
                    column: 'RmaNumber',
                    pattern: `%${rma}%`
                }
            ]
        });
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return lookup({
            table: 'RmaDetail',
            queries: [
                {
                    operator: 'LIKE',
                    column: 'RmaNumber',
                    pattern: `%${rma}%`
                }
            ]
        });
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return lookup({
            table: 'RmaDetailSer',
            queries: [
                {
                    operator: 'LIKE',
                    column: 'RmaNumber',
                    pattern: `%${rma}%`
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
        table: 'SorMaster',
        queries: [
            {
                operator: 'LIKE',
                column: 'SalesOrder',
                pattern: `%${order}%`
            }
        ]
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return lookup({
            table: 'SorDetail',
            queries: [
                {
                    operator: 'LIKE',
                    column: 'SalesOrder',
                    pattern: `%${order}%`
                }
            ]
        });
    }).then((data) => {
        obj = Object.assign(obj, (data && data[0]) || {});
        return [obj];
    });
}

module.exports = {
    exists,
    // functions for objects
    getCustomer,
    getRMA,
    getDevice,
    getOrder,
    getRMAs,
    getDevices,
    getDeviceByInvoice,
    getOrders,
    getOrderByMarkFor,
    // basic
    checkRMA,
    checkOrder,
    lookup,
    // utilities
    padNumber,
    makeQueries,
    // maps / lists
    tables,
    fieldMap,
    tableMap,
    // db object
    db
};
// END DATABASE
