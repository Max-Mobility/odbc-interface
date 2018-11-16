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
    "Mark For": "MarkFor",
    "Attention": "Attention"
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
		input.CustomerName,
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
	if (typeof _i === 'string') {
		return _i.trim().length;
	} else {
		return _i;
	}
};

let mergedValues = ['MStockCode', 'MStockDes', 'MOrderQty', 'MShipQty', 'NComment', 'Comment'];
const mergeObjects = (output, a, b) => {
    Object.keys(a).map((k) => {
        var v = a[k];
        var o = output[k];
        if (o !== undefined && mergedValues.indexOf(k) > -1) {
			// if we're getting strings or arrays, turn them into a list of objects
			output[k] = _.flatten(_.union([o], [v]));
        } else if (mergedValues.indexOf(k) > -1) {
            output[k] = [v];
		} else if (exists(v)) {
			output[k] = v;
		}
    });
    if (b) {
        Object.keys(b).map((k) => {
            var v = b[k];
            var o = output[k];
			if (o !== undefined && mergedValues.indexOf(k) > -1) {
				// if we're getting strings or arrays, turn them into a list of objects
				output[k] = _.flatten(_.union([o], [v]));
			} else if (mergedValues.indexOf(k) > -1) {
				output[k] = [v];
			} else if (exists(v)) {
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
			if (_.isEmpty(input)) {
				return null;
			}
            var o = Object.keys(this.inputMap).reduce((a, e) => {
				let val = input[this.inputMap[e]];
				if (val !== undefined)
					a[e] = val
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
			'Stock Code': "MStockCode",
			'Stock Description': "MStockDes",
			'Comment': 'NComment',
            'Chair Make': 'ChairMake',
            'Chair Model': 'ChairModel',
            'Chair Width': 'ChairWidth',
            'Rear Wheel Size': 'RearWheelSize',
            'Cash or Credit': "CashCredit",
            'Last Invoice': "LastInvoice",
            'Last Operator': "LastOperator",
            'Job': "Job",
			'Ship Quantity': "MShipQty",
            'Serialised?': "SerialisedFlag",
            'Jobs Exist?': "JobsExistFlag",
			'Date Last Inventory Part': "DateLastInvPart",
        },
        create: function(input, customer) {
			if (_.isEmpty(input)) {
				return null;
			}
            /*
            // customer
            customer["Number"] = input.Customer;
            customer["Name"] = input.CustomerName;
            customer["Email"] = input.Email;
            */
            var o = Object.keys(this.inputMap).reduce((a, e) => {
				let val = input[this.inputMap[e]];
				if (val !== undefined)
					a[e] = val
                return a;
            }, {});
			// update shipping
            o["Shipping Address"] = combineShipping(input);
			// update display
			var mf = o["Mark For"];
			mf = exists(mf) ? `<font color=\"blue\">${mf}</font>` :
				"<font color=\"gray\">No Mark For</font>";
			o["__DISPLAY__"] = `<span>Order: ${parseInt(o["Order Number"])}: ${mf}</span>`;

			o['__DISPLAY__'] = `<div style=\"display: grid;\"><span>Order: <font color=\"blue\">${parseInt(o["Order Number"])}</font><br></span><span>Status: <font color=\"blue\">${o['Status']}</font>`;
			o['__DISPLAY__'] += `<br></span><span>Mark For: <font color=\"blue\">${mf}</font>`;
			var tr = o["Tracking Number"];
			tr = exists(tr) ? `<a target="_blank" href="http://wwwapps.ups.com/WebTracking/track?track=yes&trackNums=${tr}">${tr}</a>` :
				"<font color=\"gray\">No Tracking Number</font>";
			o['__DISPLAY__'] += `<br></span><span>Tracking Number: ${tr}`;
			var po = o["PO Number"];
			po = exists(po) ? `<font color=\"blue\">${po}</font>` :
				"<font color=\"gray\">No PO Number</font>";
			o['__DISPLAY__'] += `<br></span><span>PO Number: ${po}`;
			o['__DISPLAY__'] += `</span></div>`;
			// update stock codes and such
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
			"RmaComment"
        ],
        inputMap: {
            "RMA Number": 'RmaNumber',
			"Attention": 'Attention',
            "Serial Number": 'Serial',
            "Status": 'Status',
			"Notes": 'Comment',
			"Problem Code": 'ProblemCode',
			"Email": 'Email',
            "Customer Number": 'Customer',
            "Customer Name": 'CustomerName',
            "Operator": 'Operator',
			"Sales Order": 'RecSalesOrder',
            "Entry Date": 'EntryDate',
			"Job": 'Job',
			"Received Date": 'ReceivedDate',
            "Last Transaction Date": 'LastTranactDate',
            "Special Instructions": 'SpecialInstrs',
            "Service Ticket": 'ServiceTicket',
        },
        create: function(input) {
			if (_.isEmpty(input)) {
				return null;
			}
            var o = Object.keys(this.inputMap).reduce((a, e) => {
				let val = input[this.inputMap[e]];
				if (val !== undefined)
					a[e] = val
                return a;
            }, {});
            o["Shipping Address"] = combineShipping(input);
            return o;
        }
    },
	"Job": {
		field: "Job",
		tables: [
			"WipMaster",
		],
		inputMap: {
			"Job": "Job",
			"Complete": "Complete",
			"Actual Completion Date": "ActCompleteDate",
		},
		create: function(input) {
			if (_.isEmpty(input)) {
				return null;
			}
            var o = Object.keys(this.inputMap).reduce((a, e) => {
				let val = input[this.inputMap[e]];
				if (val !== undefined)
					a[e] = val
                return a;
            }, {});
            return o;
        }
	},
	"ProgrammingRecord": {
		field: "SerialNumber",
		tables: [
			"ProgrammingRecords",
		],
		inputMap: {
			"Serial Number": "SerialNumber",
			"Date Programmed": "DatePerformed",
			"Circuit Board Revision": "CircuitBoardRev",
			"MCU Firmware Version": "FirmwareVersion",
			"BLE Firmware Version": "BluetoothFirmwareVersion",
			"Performed By": "PerformedBy",
			"ID": "ID",
		},
		create: function(input) {
			if (_.isEmpty(input)) {
				return null;
			}
            var o = Object.keys(this.inputMap).reduce((a, e) => {
				let val = input[this.inputMap[e]];
				if (val !== undefined)
					a[e] = val
                return a;
            }, {});
            return o;
        }
	},
	"Part": {
		field: "Job",
		tables: [
			"WipJobPost",
		],
		inputMap: {
			"Stock Code": "MStockCode",
			"Description": "MDescription",
			"Quantity Issued": "MQtyIssued"
		},
		codeMap: {
			"MX2SD-P001": { "Stock Code": "MX2-906", "Description": "DRIVE UNIT UPPER AND LOWER HOUSING ASSY." },
			"MX2SD-P002": { "Stock Code": "MX2-907", "Description": "DRIVE UNIT LOWER HOUSING" },
			"MX2SD-P015": { "Stock Code": "MX2-903", "Description": "DRIVE UNIT BATTERY PACK" },
			"MX2SD-P016": { "Stock Code": "MX2-912", "Description": "DRIVE UNIT CHARGER TRANSFORMER BOX" },
			"MX2SD-P017": { "Stock Code": "MX2-940", "Description": "DRIVE UNIT RECEPTACLE CAP" },
			"MX2SD-P018": { "Stock Code": "MX2-905", "Description": "DRIVE UNIT HANDLE" },
			"MX2SD-P020": { "Stock Code": "MX2-944", "Description": "DRIVE UNIT MOTOR" },
			"MX2SD-P026": { "Stock Code": "MX2-936", "Description": "DRIVE UNIT POWER SWITCH" },
			"MX2SD-P027": { "Stock Code": "MX2-942", "Description": "DRIVE UNIT CHARGER RECEPTACLE" },
			"MX2SD-P028": { "Stock Code": "MX2-904", "Description": "DRIVE UNIT LED CIRCUIT BOARD ASSY." },
				"MX2SD-P040": { "Stock Code": "MX2-946", "Description": "(1) ROLLER W/ BEARINGS" },
			"MX2SD-P041": { "Stock Code": "MX2-909", "Description": "ROLLER REPLACEMENT KIT" },
			"MX2SD-P042": { "Stock Code": "MX2-910", "Description": "(4) MOTOR OUTER COVERS" },
			"MX2SD-P090": { "Stock Code": "MX2-902", "Description": "DRIVE UNIT CIRCUIT BOARD" },
			"SSLC258V29": { "Stock Code": "MX1-038", "Description": "MX1 BATTERY CHARGER" },
		},
		partsFromOrder: function(order) {
			let inputs = [];
			for (let i=0; i<order['Stock Code'].length; i++) {
				let num = (i < order['Ship Quantity'].length) ? order['Ship Quantity'][i] : 1;
				if (num > 0) {
					inputs.push({
						'MStockCode': order['Stock Code'][i],
						'MDescription': order['Stock Description'][i],
						'MQtyIssued': num
					});
				}
			}
			if (inputs.length)
				return inputs.map((i) => { return this.create(i); });
			else
				return [];
		},
		create: function(input) {
			if (_.isEmpty(input)) {
				return null;
			}
            var o = Object.keys(this.inputMap).reduce((a, e) => {
				let val = input[this.inputMap[e]];
				if (val !== undefined)
					a[e] = val
                return a;
            }, {});
			var key = o["Stock Code"];
			if (Object.keys(this.codeMap).indexOf(key) > -1) {
				o["Description"] = this.codeMap[key]["Description"];
				o["Stock Code"] = this.codeMap[key]["Stock Code"];
			}
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
            'Serial Number': 'Serial',
            'Customer Number': "Customer",
            'Sales Order Number': 'SalesOrder',
            'Invoice Number': 'Invoice',
            'Description': 'SerialDescription',
            'Stock Code': 'StockCode',
            'Service Flag': 'ServiceFlag',
			'Location': 'Location'
        },
        create: function(input, output, customer) {
			if (_.isEmpty(input)) {
				return null;
			}
            var o = Object.keys(this.inputMap).reduce((a, e) => {
				let val = input[this.inputMap[e]];
				if (val !== undefined)
					a[e] = val
                return a;
            }, {});
			o['__DISPLAY__'] = `<div style=\"display: grid;\"><span>Device: <font color=\"blue\">${o["Serial Number"]}</font><br></span><span>Description: <font color=\"blue\">${o['Description']}</font>`;
			o['__DISPLAY__'] += `<br></span><span>Stock Code: <font color=\"blue\">${o['Stock Code']}</font>`;
			o['__DISPLAY__'] += `</span></div>`;
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
        return _.flatten(dataArray).reduce(mergeObjects, {});
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
        return _.flatten(dataArray).reduce(mergeObjects, {});
    }).then((obj) => {
        return types.RMA.create(obj);
    }).catch((err) => {
        console.log(`cannot get rma: ${err}`);
    });
};

function getRMABySerial(serial_number) {
    // Loop through our tables
    var tasks = types.RMA.tables.map((t) => {
		var fields = ['Comment','Serial'];
		var _tasks = fields.map((f) => {
			var lu = {
				table: t,
				queries: [
					{
						operator: 'LIKE',
						column: f,
						pattern: `%${serial_number}%`
					},
				]
			};
			return lookup(lu).catch((err) => {
				console.log(`cannot get rma: ${err}`);
				return [];
			});
		});
		return Promise.all(_tasks);
    });
    return Promise.all(tasks).then((dataArray) => {
        return _.flatten(dataArray).reduce(mergeObjects, {});
    }).then((obj) => {
        return types.RMA.create(obj);
    }).catch((err) => {
        console.log(`cannot get rma: ${err}`);
    });
};

function getRMAByAttention(attn) {
    // Loop through our tables
    var tasks = types.RMA.tables.map((t) => {
        var lu = {
            table: t,
            queries: [
                {
                    operator: 'LIKE',
                    column: 'Attention',
                    pattern: `%${attn}%`
                }
            ]
        };
        return lookup(lu).catch((err) => {
			console.log(`cannot get rma: ${err}`);
			return [];
		});;
    });
    return Promise.all(tasks).then((dataArray) => {
        return _.flatten(dataArray).map((o) => {
			return types.RMA.create(o);
		});
    }).catch((err) => {
        console.log(`cannot get rma: ${err}`);
    });
};

function getParts(job_number) {
    // Loop through our tables
    var tasks = types.Part.tables.map((t) => {
        var lu = {
            table: t,
            queries: [
                {
                    operator: 'LIKE',
                    column: 'Job',
                    pattern: `%${padNumber(job_number)}%`
                }
            ]
        };
        return lookup(lu);
    });
    return Promise.all(tasks).then((dataArray) => {
		return _.flatten(dataArray).map((o) => {
			return types.Part.create(o);
		});
    }).catch((err) => {
        console.log(`cannot get parts for job: ${err}`);
    });
};

function getJob(job_number) {
    // Loop through our tables
    var tasks = types.Job.tables.map((t) => {
        var lu = {
            table: t,
            queries: [
                {
                    operator: 'LIKE',
                    column: 'Job',
                    pattern: `%${padNumber(job_number)}%`
                }
            ]
        };
        return lookup(lu);
    });
    return Promise.all(tasks).then((dataArray) => {
        return _.flatten(dataArray).reduce(mergeObjects, {});
    }).then((obj) => {
        return types.Job.create(obj);
    }).catch((err) => {
        console.log(`cannot get job: ${err}`);
    });
};

function getProgrammingRecord(serial_number) {
    // Loop through our tables
    var tasks = types.ProgrammingRecord.tables.map((t) => {
        var lu = {
			db: progRecDB,
            table: t,
            queries: [
                {
                    operator: 'LIKE',
                    column: 'SerialNumber',
                    pattern: `%${serial_number}%`
                }
            ]
        };
        return lookup(lu);
    });
    return Promise.all(tasks).then((dataArray) => {
        return _.flatten(dataArray).reduce(mergeObjects, {});
    }).then((obj) => {
        return types.ProgrammingRecord.create(obj);
    }).catch((err) => {
        console.log(`cannot get programming record: ${err}`);
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
        return _.flatten(dataArray).reduce(mergeObjects, {});
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
        return _.flatten(dataArray).reduce(mergeObjects, {});
    }).then((obj) => {
		return types.Order.create(obj);
    }).catch((err) => {
        console.log(`cannot get order: ${err}`);
    });
};

function sortByKey(objects, key, value) {
	return objects.sort((a,b) => {
		let _a = a[key].toLowerCase();
		let _b = b[key].toLowerCase();
		let aeq = _a === value.toLowerCase();
		let beq = _b === value.toLowerCase();
		let offset = (aeq ? -1 : 1) + (beq ? 1 : -1);
		return _a.localeCompare(_b) + offset;
	});
}

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
            return getOrder(order);
        });
        return Promise.all(tasks).then((orders) => {
			return sortByKey(orders, "Mark For", markfor);
		});
    });
};

function getOrderByPoNumber(poNumber) {
    var lookupOpts = {
        table: 'SorMaster',
        queries: [
            {
                operator: 'LIKE',
                column: 'CustomerPoNumber',
                pattern: `%${poNumber}%`
            }
        ]
    };
    return lookup(lookupOpts).then(data => {
        var orderNumbers = data.map(d => d.SalesOrder);
        orderNumbers = _.uniq(orderNumbers).filter(i => exists(i));
        var tasks = orderNumbers.map((order) => {
            return getOrder(order);
        });
        return Promise.all(tasks).then((orders) => {
			return sortByKey(orders, "PO Number", poNumber);
		});
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
, progRecCN = conn_str + process.env.ODBC_CONNECTION_STRING_PROG_REC
;
var db = null;
var progRecDB = null;
const open = () => {
    db = new odbc.Database();
    db.open(cn, function (err) {
        if (err) return console.log(err);

        console.log(`db Connected: ${db.connected}`);
    });

	progRecDB = new odbc.Database();
	progRecDB.open(progRecCN, function (err) {
        if (err) return console.log(err);

        console.log(`progRecDB Connected: ${progRecDB.connected}`);
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
				var join = `${q.join || 'AND'}`
                if (operator == 'LIKE') {
                    col = `LOWER(${q.column})`;
                    pattern = `LOWER('${q.pattern}')`;
                }
                var invert = q.invert ? `NOT` : '';
                query += ` ${invert} ${col} ${operator} ${pattern} ${join}`;
            }
        });
        query = query.replace(/(AND|OR)$/, '');
        if (opts.orderBy !== undefined) {
            query += ` ORDER BY ${opts.orderBy.columns.join(',')} ${opts.orderBy.direction}`;
        }
        query += ';';
        console.log(query);

		let _db = opts.db || db;

        _db.query(query, (err, data) => {
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
	// top level types
	types,
    // functions for objects
    getCustomer,
    getRMA,
    getRMAByAttention,
    getRMABySerial,
	getJob,
	getProgrammingRecord,
	getParts,
    getDevice,
    getOrder,
    getRMAs,
    getDevices,
    getDeviceByInvoice,
    getOrders,
    getOrderByMarkFor,
    getOrderByPoNumber,
    // basic
    checkRMA,
    checkOrder,
    lookup,
    // utilities
	sortByKey,
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
