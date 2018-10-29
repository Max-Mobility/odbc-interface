const db = require('./database');
const express = require('express')
const router = express.Router()
const { check, validationResult } = require('express-validator/check')
const { matchedData } = require('express-validator/filter')

const nodemailer = require('nodemailer');

const moment = require('moment');
const business = require('moment-business');

const _ = require('underscore');

var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'william@max-mobility.com',
    pass: process.env.ODBC_EMAIL_PASSWORD
  }
});

function makeID(s) {
    return s;//.replace(/ /gm, '_');
}

var templateContext = function() {
    const sf = [
		'Sales Order Number',
		'PO Number',
		'Mark For',
		'Serial Number',
		'RMA Number',
	];
    const fields=Object.keys(db.fieldMap).map((f) => { return {
        title: f,
        id: makeID(f)
    }});
    return {
		search_fields: sf.map(f => fields.find(field => field.title === f)),
        // actual data
		result: null,
    };
}

router.get('/', (req, res) => {
    // get orders that don't have an invoice and have order status of 1
    // sort by oldest required ship date
    // 25?
    // don't want sales rep that are 999 (warranty parts)

	// stock code MX2-160, MX2-161 for domestics - SorDetail

    var lu = {
        table: 'SorMaster',
        queries: [
            {
                operator: 'LIKE',
                column: 'OrderStatus',
                pattern: '1'
            },
            {
                operator: 'LIKE',
                column: 'CustomerPoNumber',
                pattern: '%RMA:%',
                invert: true
            },
            {
                operator: 'LIKE',
                column: 'Salesperson',
                pattern: '%999%',
                invert: true
            },
            /*
            {
                operator: 'IS',
                column: 'Invoice',
                pattern: 'NULL'
            },
            */
        ],
        orderBy: {
            columns: ['OrderDate'],
            direction: 'ASC'
        }
    };
    db.lookup(lu).then((data) => {
		// look into sordetail to make sure they are LIKE MX2-1
		var dataStr = data.map(d => `'${d["SalesOrder"]}'`).join(', ');
		var lu2 = {
			table: 'SorDetail',
			top: 10,
			queries: [
				{
					operator: 'IN',
					column: 'SalesOrder',
					pattern: `(${dataStr})`
				},
				{
					operator: 'LIKE',
					column: 'MStockCode',
					pattern: 'MX2-170',
					invert: true
				},
				{
					operator: 'LIKE',
					column: 'MStockCode',
					pattern: 'MX2-175',
					invert: true
				},
				{
					operator: 'LIKE',
					column: 'MStockCode',
					pattern: 'MX2-1%',
				}
			]
		};
		return db.lookup(lu2).then((d2) => {
			let validOrders = _.uniq(d2.map(d => d['SalesOrder']));
			let stockCodes = _.uniq(d2.map(d => d['MStockCode']));
			/*
			console.log('data', data.length);
			console.log('d2', d2.length);
			console.log('valid orders', validOrders.length);
			console.log('valid orders', validOrders);
			console.log('stock codes', stockCodes.length);
			console.log('stock codes', stockCodes);
			*/
			return data.filter((d) => {
				return validOrders.indexOf(d['SalesOrder']) > -1;
			});
		});
	}).then((data) => {
        var today = new Date();
        var oldest = new Date(data[0].OrderDate);
        var shipDays = moment(today).diff(moment(oldest), 'days');
        var businessDays = business.weekDays(moment(oldest), moment(today));
        console.log(`Shipping in ${businessDays} business days!`);
        var shipColor = 'green';
        if (shipDays > 5) shipColor = 'orange';
        if (shipDays > 7) shipColor = 'red';
        res.render('index', {
            data: req.body,
            errors: {},
            moment: moment,
            orders: data,
            shipDays: shipDays,
            businessDays: businessDays,
            shipColor: shipColor
        });
    }).catch((err) => {
        console.log(`error: ${err}`);
        res.render('index', {
            data: req.body,
            errors: {
                server: {
                    msg: err.message
                }
            },
            moment: moment,
            orders: [],
            shipDays: 'UNKNOWN',
            businessDays: 'UNKNOWN',
            shipColor: 'red'
        });
    });
});

// feedback!
router.get('/feedback', (req, res) => {
    res.render('feedback', {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    });
});

router.post('/feedback', [
    check('message')
        .isLength({ min: 1 })
        .withMessage('Message is required')
        .trim(),
    check('name')
        .isLength({ min: 1 })
        .withMessage('Name is required')
        .trim()
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('feedback', {
            data: req.body,
            errors: errors.mapped(),
            csrfToken: req.csrfToken()
        });
    }

    const data = matchedData(req)

    var mailOptions = {
        from: 'engineering@max-mobility.com',
        to: 'engineering@max-mobility.com',
        subject: 'Feedback on Syspro Web Search from ' + data.name,
        text: data.message
    };

    transporter.sendMail(mailOptions, function(error, info) {
        if (error) {
            console.log('Mail failed: ' + error);
            req.flash('failure', 'Could not send email - please find me!');
            res.redirect('/');
        } else {
            console.log('Sent email: ' + info.response)
            req.flash('success', 'Thanks for the feedback, I will look into it!');
            res.redirect('/');
        }
    });
});

// RMA page
router.get('/check_rma', (req, res) => {
    res.render('check_rma', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    }));
});

router.post('/check_rma', [
    check('rma_number')
        .isLength({ min: 1 })
        .withMessage('RMA is required')
        .trim()
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('check_rma', Object.assign(templateContext(), {
            data: req.body,
            errors: errors.mapped(),
			rma: null,
            csrfToken: req.csrfToken()
        }));
    }

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    });

    const data = matchedData(req)

    var order = null;
    var rma = null;
	var job = null;
	var progRec = null;

	// order status = shipped
	// rma status = processed
	// programmed = testing
	// job = packaging
	let rmaNumber = data.rma_number;

    return db.getRMA(rmaNumber).then((r) => {
        // PULL OUT DATA
		rma = r;
		if (!rma) {
			throw ({
				message: "Couldn't find RMA " + rmaNumber
			});
		}
        if (db.exists(rma["Sales Order"])) {
            return db.getOrder(rma['Sales Order']);
        } else {
			return null;
		}
    }).then((o) => {
        order = o;
		// now get the job
        if (rma && db.exists(rma["Job"])) {
            return db.getJob(rma['Job']);
        } else if (rma) {
			return null;
        } else {
			throw ({
				message: "Couldn't find RMA " + rmaNumber
			});
		}
    }).then((j) => {
        job = j;
		// now get the parts
		if (job !== null) {
			return db.getParts(rma['Job']);
		} else {
			return null;
		}
	}).then((parts) => {
		let orderParts = [];
		if (job !== null) {
			if (order !== null) {
				orderParts = db.types.Part.partsFromOrder(order);
			}
			if (orderParts.length) {
				job.Parts = _.uniq(_.flatten(_.union(parts, orderParts)), false, _.iteratee('Stock Code'));
			} else {
				job.Parts = parts;
			}
		}
		// now get programming record
		if (rma && db.exists(rma['Serial Number'])) {
			return db.getProgrammingRecord(rma['Serial Number']);
		} else {
			return null;
		}
    }).then((pr) => {
		progRec = pr;
		// display based on order / rma / programmed / job
		let status = '';
		let shipDate = '';
		if (order && order['Status'] == 9) {
			status = 'Shipped';
			shipDate = moment(order['Actual Ship Date']);
		} else if (order && order['Status'] == 'S') {
			status = 'Awaiting PO';
		} else if (job && job['Complete'] == 'Y') {
			status = 'Packaging';
			shipDate = moment().add(1, 'days');
		} else if (progRec && progRec['Date Programmed'] && progRec['Date Programmed'].length) {
			status = 'Testing';
			shipDate = moment().add(2, 'days');
		} else if (rma && rma['Status'] == 9) {
			status = 'Processing / Repairing';
			shipDate = moment().add(3, 'days');
		} else {
			status = 'Awaiting Delivery';
		}
		if (shipDate !== '') {
			shipDate = shipDate.calendar(null,{
				lastDay : '[Yesterday]',
				sameDay : '[Today]',
				nextDay : '[Tomorrow]',
				lastWeek : '[last] dddd',
				nextWeek : 'dddd',
				sameElse : 'L'
			});
		}
		// show latest ship date
		// - processing / repairing = 3 DAYS (latest ship date)
		//  - testing = DAY AFTER TOMORROW
		//  - Packaging = TOMORROW
		//  - Shipped = order['Actual Ship Date']

		rma['__DISPLAY__'] = `<div style=\"display: grid;\"><span>RMA: <font color=\"blue\">${parseInt(rma["RMA Number"])}</font><br></span><span>Status: <font color=\"blue\">${status}</font>`;
		if (shipDate.length && status == 'Shipped') {
			rma['__DISPLAY__'] += `<br></span><span>Shipped: <font color=\"blue\">${shipDate}</font>`;
		} else if (shipDate.length) {
			rma['__DISPLAY__'] += `<br></span><span>Expected Ship Date: <font color=\"blue\">${shipDate}</font>`;
		}
		if (order && order['Tracking Number']) {
			rma['__DISPLAY__'] += `<br></span><span>Tracking Number: <a target="_blank" href="http://wwwapps.ups.com/WebTracking/track?track=yes&trackNums=${order['Tracking Number']}">${order['Tracking Number']}</a></span>`;
		}
		rma['__DISPLAY__'] += `</span></div>`;
		context.result = rma;
		// now render it
        console.log('rendering data!');
        return res.render('check_rma', context);
    }).catch((err) => {
        // got an error - render it!
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        return res.render('check_rma', context);
    });
})

// Search
router.get('/search', (req, res) => {
    res.render('search', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    }));
});

router.post('/search', [
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('search', Object.assign(templateContext(), {
            data: req.body,
            errors: errors.mapped(),
			rma: null,
            csrfToken: req.csrfToken()
        }));
    }

    const input = Object.keys(req.body).reduce((a, e) => {
        if (e !== '_csrf' && e !== 'errors') {
            a[e] = req.body[e];
		}
        return a;
    }, {});

	const invalidInput = Object.keys(input).reduce((a, e) => {
		return a && !db.exists(input[e]);
	}, true);

	if (invalidInput) {
        return res.render('check_order', Object.assign(templateContext(), {
            data: req.body,
            items: [],
            errors: {
				input: {
					msg: 'You must provide at least one search input!'
				}
			},
            csrfToken: req.csrfToken()
        }));
	}

    var context = Object.assign(templateContext(), {
        data: req.body,
		rma: null,
        errors: {},
        csrfToken: req.csrfToken()
    });

    var order = null;
    var rma = null;
	var job = null;
	var progRec = null;

	// order status = shipped
	// rma status = processed
	// programmed = testing
	// job = packaging
	let rmaNumber = input.RmaNumber;

    return db.getRMA(rmaNumber).then((r) => {
        // PULL OUT DATA
		rma = r;
        if (rma && db.exists(rma["Sales Order"])) {
            return db.getOrder(rma['Sales Order']);
        } else if (db.exists(rma["RMA Number"])) {
			return null;
        } else {
			throw ({
				message: "Couldn't find RMA " + rmaNumber
			});
		}
    }).then((o) => {
        order = o;
		// now get the job
        if (rma && db.exists(rma["Job"])) {
            return db.getJob(rma['Job']);
        } else if (rma) {
			return null;
        } else {
			throw ({
				message: "Couldn't find RMA " + rmaNumber
			});
		}
    }).then((j) => {
        job = j;
		// now get the parts
		if (job !== null) {
			return db.getParts(rma['Job']);
		} else {
			return null;
		}
	}).then((parts) => {
		let orderParts = [];
		if (job !== null) {
			if (order !== null) {
				orderParts = db.types.Part.partsFromOrder(order);
			}
			if (orderParts.length) {
				job.Parts = _.uniq(_.flatten(_.union(parts, orderParts)), false, _.iteratee('Stock Code'));
			} else {
				job.Parts = parts;
			}
		}
		// now get programming record
		if (rma && db.exists(rma['Serial Number'])) {
			return db.getProgrammingRecord(rma['Serial Number']);
		} else {
			return null;
		}
    }).then((pr) => {
		progRec = pr;
		// display based on order / rma / programmed / job
		let status = '';
		let shipDate = '';
		if (order && order['Status'] == 9) {
			status = 'Shipped';
			shipDate = moment(order['Actual Ship Date']).calendar(null,{
				lastDay : '[Yesterday]',
				sameDay : '[Today]',
				nextDay : '[Tomorrow]',
				lastWeek : '[last] dddd',
				nextWeek : 'dddd',
				sameElse : 'L'
			});
		} else if (order && order['Status'] == 'S') {
			status = 'Awaiting PO';
		} else if (job && job['Complete'] == 'Y') {
			status = 'Packaging';
			shipDate = moment().add(1, 'days').calendar(null,{
				lastDay : '[Yesterday]',
				sameDay : '[Today]',
				nextDay : '[Tomorrow]',
				lastWeek : '[last] dddd',
				nextWeek : 'dddd',
				sameElse : 'L'
			});
		} else if (progRec && progRec['Date Programmed'] && progRec['Date Programmed'].length) {
			status = 'Testing';
			shipDate = moment().add(2, 'days').calendar(null,{
				lastDay : '[Yesterday]',
				sameDay : '[Today]',
				nextDay : '[Tomorrow]',
				lastWeek : '[last] dddd',
				nextWeek : 'dddd',
				sameElse : 'L'
			});
		} else if (rma && rma['Status'] == 9) {
			status = 'Processing / Repairing';
			shipDate = moment().add(3, 'days').calendar(null,{
				lastDay : '[Yesterday]',
				sameDay : '[Today]',
				nextDay : '[Tomorrow]',
				lastWeek : '[last] dddd',
				nextWeek : 'dddd',
				sameElse : 'L'
			});
		} else {
			status = 'Awaiting Delivery';
		}
		// show latest ship date
		// - processing / repairing = 3 DAYS (latest ship date)
		//  - testing = DAY AFTER TOMORROW
		//  - Packaging = TOMORROW
		//  - Shipped = order['Actual Ship Date']

		rma['__DISPLAY__'] = `<div style=\"display: grid;\"><span>RMA: <font color=\"blue\">${parseInt(rma["RMA Number"])}</font><br></span><span>Status: <font color=\"blue\">${status}</font>`;
		if (shipDate.length && status == 'Shipped') {
			rma['__DISPLAY__'] += `<br></span><span>Shipped: <font color=\"blue\">${shipDate}</font></span>`;
		} else if (shipDate.length) {
			rma['__DISPLAY__'] += `<br></span><span>Expected Ship Date: <font color=\"blue\">${shipDate}</font></span>`;
		}
		rma['__DISPLAY__'] += `</div>`;
        context.rma = rma;
		// now render it
        console.log('rendering data!');
        return res.render('search', context);
    }).catch((err) => {
        // got an error - render it!
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        return res.render('search', context);
    });
})

// Order page
router.get('/check_order', (req, res) => {
    res.render('check_order', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    }));
});

router.post('/check_order', [
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('check_order', Object.assign(templateContext(), {
            data: req.body,
            items: [],
            errors: errors.mapped(),
            csrfToken: req.csrfToken()
        }));
    }

    const input = Object.keys(req.body).reduce((a, e) => {
        if (e !== '_csrf' && e !== 'errors') {
            a[e] = req.body[e];
		}
        return a;
    }, {});

	const invalidInput = Object.keys(input).reduce((a, e) => {
		return a && !db.exists(input[e]);
	}, true);

	if (invalidInput) {
        return res.render('check_order', Object.assign(templateContext(), {
            data: req.body,
            items: [],
            errors: {
				input: {
					msg: 'You must provide at least one search input!'
				}
			},
            csrfToken: req.csrfToken()
        }));
	}

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    });
	if (input.SalesOrder) {
		db.getOrder(input.SalesOrder).then((order) => {
			if (!order) {
				throw {
					message: `Could not find order by Order Number: ${input.SalesOrder}`
				};
			}
			if (input.MarkFor) {
				if (input.CustomerPoNumber) {
				}
			} else if (input.CustomerPoNumber) {
			}
			context.result = order;
			res.render('check_order', context);
		}).catch((err) => {
			console.log('caught error!');
			context.errors.server = {
				msg: err.message
			}
			res.render('check_order', context);
		});
	} else if (input.MarkFor) {
		db.getOrderByMarkFor(input.MarkFor).then((orders) => {
			if (input.CustomerPoNumber) {
			}
			if (orders.length > 1) {
				context.errors.result = {
					msg: `Found ${orders.length} orders - only showing the first!`
				};
			}
			else if (orders.length === 0) {
				context.errors.result = {
					msg: `Could not find any orders!`
				};
			}
			context.result = orders[0];
			res.render('check_order', context);
		}).catch((err) => {
			console.log('caught error!');
			context.errors.server = {
				msg: err.message
			}
			res.render('check_order', context);
		});
	} else if (input.CustomerPoNumber) {
		db.getOrderByPoNumber(input.CustomerPoNumber).then((orders) => {
			if (orders.length > 1) {
				context.errors.result = {
					msg: `Found ${orders.length} orders - only showing the first!`
				};
			}
			else if (orders.length === 0) {
				context.errors.result = {
					msg: `Could not find any orders!`
				};
			}
			context.result = orders[0];
			res.render('check_order', context);
		}).catch((err) => {
			console.log('caught error!');
			context.errors.server = {
				msg: err.message
			}
			res.render('check_order', context);
		});
	}
})


// search page
router.get('/search_by_serial', (req, res) => {
    res.render('search_by_serial', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    }));
});

router.post('/search_by_serial', [
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('search_by_serial', Object.assign(templateContext(), {
            data: req.body,
            errors: errors.mapped(),
            csrfToken: req.csrfToken()
        }));
    }

    const fields = Object.keys(db.fieldMap);
    const input = Object.keys(req.body).reduce((a, e) => {
        if (db.fieldMap[e] || fields.indexOf(e) > -1) {
            a[db.fieldMap[e]] = req.body[e];
        }
        return a;
    }, {});

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    });

    var customer = {};
    var orders = []   // get orders here
    var rmas = [];    // get rmas here
    var devices = []; // get serial numbers and such here
    
    return db.getDevice(input.Serial).then((device) => {
        // PULL OUT DATA
        devices = [device];
        if (device && device["Customer Number"]) {
            return db.getCustomer(device['Customer Number']);
        } else {
            throw ({
                message: 'Could not find by device S/N: ' + input.Serial
            });
        }
    }).then((c) => {
        customer = c;
        var orderNumbers = devices.map(d => d['Sales Order Number']);
        orderNumbers = _.uniq(orderNumbers).filter(i => db.exists(i));
        orders = orderNumbers.map(o => db.getOrder(o));
        rmas = db.getRMAs(customer.Number);
        return Promise.all([orders, rmas]);
    }).then((objects) => {
        orders = _.flatten(objects[0]);
        rmas = _.flatten(objects[1]);
        // now render the data
        context.customer = customer;
        context.orders = orders;
        context.rmas = rmas;
        context.devices = devices;
        console.log('rendering data!');
        res.render('search_by_serial', context);
    }).catch((err) => {
        // got an error - render it!
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        res.render('search_by_serial', context);
    });
});

// PRINT RMA PAGE
router.get('/print_rma', (req, res) => {
    res.render('print_rma', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    }));
});

router.post('/print_rma', [
    check('rma_number')
        .isLength({ min: 1 })
        .withMessage('RMA is required')
        .trim()
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('print_rma', Object.assign(templateContext(), {
            data: req.body,
            errors: errors.mapped(),
            csrfToken: req.csrfToken()
        }));
    }

    const data = matchedData(req)

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    });

    var order = null;
    var rma = null;
	var job = null;
	var progRec = null;

    return db.getRMA(data.rma_number).then((r) => {
        // PULL OUT DATA
		rma = r;
		if (!rma) {
			throw ({
				message: "Couldn't find RMA " + data.rma_number
			});
		}
        if (rma && db.exists(rma["Sales Order"])) {
            return db.getOrder(rma['Sales Order']);
        } else {
			return null;
		}
    }).then((o) => {
        order = o;
		// now get the job
        if (rma && db.exists(rma["Job"])) {
            return db.getJob(rma['Job']);
        } else {
			return null;
        }
    }).then((j) => {
        job = j;
		// now get the parts
		if (job !== null) {
			return db.getParts(rma['Job']);
		} else {
			return null;
		}
	}).then((parts) => {
		if (parts !== null) {
			let orderParts = [];
			if (order !== null) {
				orderParts = db.types.Part.partsFromOrder(order);
			}
			if (orderParts.length) {
				job.Parts = _.uniq(_.flatten(_.union(parts, orderParts)), false, _.iteratee('Stock Code'));
			} else {
				job.Parts = parts;
			}
		}
		// now get programming record
		if (db.exists(rma['Serial Number'])) {
			return db.getProgrammingRecord(rma['Serial Number']);
		} else {
			return null;
		}
    }).then((pr) => {
		progRec = pr;
		// now render it
		context.layout = false; // don't render within layout.ejs
        context.order = order;
        context.rma = rma;
		context.job = job;
		context.date = moment(new Date()).format('MM / DD / YYYY');
        console.log('rendering data!');
        return res.render('rma_report', context);
    }).catch((err) => {
        // got an error - render it!
        console.log('caught error!', err);
        context.errors.server = {
            msg: err.message
        }
        return res.render('print_rma', context);
    });
});

// search page
router.get('/search_by_markfor', (req, res) => {
    res.render('search_by_markfor', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    }));
});

router.post('/search_by_markfor', [
    check('Mark For')
        .isLength({ min: 1 })
        .withMessage('Mark For is required')
        .trim()
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('search_by_markfor', Object.assign(templateContext(), {
            data: req.body,
            errors: errors.mapped(),
            csrfToken: req.csrfToken()
        }));
    }

    const fields = Object.keys(db.fieldMap);
    const input = Object.keys(req.body).reduce((a, e) => {
        if (db.fieldMap[e] || fields.indexOf(e) > -1) {
            a[db.fieldMap[e]] = req.body[e];
        }
        return a;
    }, {});

    const markfor = input.MarkFor;

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    });

    var customer = {};
    var orders = []   // get orders here
    var rmas = [];    // get rmas here
    var devices = []; // get serial numbers and such here

    db.getOrderByMarkFor(markfor).then((_orders) => {
        orders = _orders;
        var invoices = orders.map(o => o['Invoice Number']);
        invoices = _.uniq(invoices).filter(i => db.exists(i));
        var tasks = invoices.map(i => db.getDeviceByInvoice(i));
        return Promise.all(tasks).then((it) => {
            return _.flatten(it);
        });
    }).then((_devices) => {
        devices = _devices;
        console.log('rendering data!');
        context.orders = orders;
        context.rmas = rmas;
        context.devices = devices;
        res.render('search_by_markfor', context);
    }).catch((err) => {
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        res.render('search_by_markfor', context);
    });
});

// out of date pages
router.get('/search', (req, res) => {
    res.redirect('/');
});

module.exports = router
