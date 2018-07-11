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
    const csf = ['Email', 'Sales Order Number', 'Customer Number', 'Customer Name', 'PO Number'];
    const ssf = ['Serial Number'];
    const rsf = ['RMA Number'];
    const mfsf = ['Mark For'];
    const fields=Object.keys(db.fieldMap).map((f) => { return {
        title: f,
        id: makeID(f)
    }});
    return {
        customer_search_fields: fields.filter(f => csf.indexOf(f.title) > -1),
        serial_search_fields: fields.filter(f => ssf.indexOf(f.title) > -1),
        rma_search_fields: fields.filter(f => rsf.indexOf(f.title) > -1),
        markfor_search_fields: fields.filter(f => mfsf.indexOf(f.title) > -1),
        // actual data
        customer: {},
        orders: [],
        rmas: [],
        devices: [],
    };
}

router.get('/', (req, res) => {
    // get orders that don't have an invoice and have order status of 1
    // sort by oldest required ship date
    // 25?
    // don't want sales rep that are 999 (warranty parts)

    var lu = {
        table: 'SorMaster',
        top: 10,
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
        var today = new Date();
        var oldest = new Date(data[0].OrderDate);
        var shipDays = ((new Date()).setTime(today - oldest) / 86400000).toFixed(0);
        var businessDays = business.weekDays(moment(oldest), moment(today));
        console.log(businessDays);
        var shipColor = 'green';
        if (shipDays > 5) shipColor = 'orange';
        if (shipDays > 7) shipColor = 'red';
        res.render('index', {
            data: req.body,
            errors: {},
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
            items: [],
            csrfToken: req.csrfToken()
        }));
    }

    const data = matchedData(req);

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    });
    db.getRMA(data.rma_number).then((rma) => {
        console.log('rendering data!');
        context.items = [rma];
        res.render('check_rma', context);
    }).catch((err) => {
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        res.render('check_rma', context);
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
    check('order_number')
        .isLength({ min: 1 })
        .withMessage('Order is required')
        .trim()
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

    const data = matchedData(req)

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    });
    db.getOrder(data.order_number).then((order) => {
        console.log('rendering data!');
        context.items = [order];
        res.render('check_order', context);
    }).catch((err) => {
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        res.render('check_order', context);
    });
})


// search page
router.get('/search_by_customer', (req, res) => {
    res.render('search_by_customer', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    }));
});

router.post('/search_by_customer', [
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('search_by_customer', Object.assign(templateContext(), {
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
    
    // look up from SorMaster
    var lookupOpts = {
        table: 'SorMaster',
        queries: []
    };
    lookupOpts.queries = db.makeQueries(lookupOpts.table, input);
    return new Promise((resolve, reject) => {
        if (lookupOpts.queries.length) {
            db.lookup(lookupOpts).then((data) => resolve(data)).catch((err) => reject(err));
        } else {
            resolve([]);
        }
    }).then((data) => {
        // PULL OUT DATA
        if (data && data.length) {
            return db.getCustomer(data[0].Customer);
        } else {
            throw ({
                message: 'Could not find record by : ' + JSON.stringify(lookupOpts.queries, null, 2)
            });
        }
    }).then((c) => {
        customer = c;
        orders = db.getOrders(customer.Number);
        rmas = db.getRMAs(customer.Number);
        //devices = db.getDevices(customer.Number);
        return Promise.all([orders, rmas]);
    }).then((objects) => {
        orders = objects[0];
        rmas = objects[1];
        //devices = objects[2];
        // now render the data
        context.customer = customer;
        context.orders = orders;
        context.rmas = rmas;
        context.devices = devices;
        console.log('rendering data!');
        res.render('search_by_customer', context);
    }).catch((err) => {
        // got an error - render it!
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        res.render('search_by_customer', context);
    });
});

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

// search page
router.get('/search_by_rma', (req, res) => {
    res.render('search_by_rma', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        csrfToken: req.csrfToken()
    }));
});

router.post('/search_by_rma', [
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('search_by_rma', Object.assign(templateContext(), {
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
    
    return db.getRMA(input.RmaNumber).then((rma) => {
        // PULL OUT DATA
        rmas = [rma];
        if (rma && rma["Customer Number"]) {
            return db.getCustomer(rma['Customer Number']);
        } else {
            throw ({
                message: 'Could not find by rma number: ' + input.RmaNumber
            });
        }
    }).then((c) => {
        customer = c;
        orders = db.getOrders(customer.Number);
        //rmas = db.getRMAs(customer.Number);
        if (db.exists(rmas[0]['Serial Number'])) {
            devices = db.getDevice(rmas[0]['Serial Number']);
        } else {
            devices = [];
        }
        return Promise.all([orders, devices]);
    }).then((objects) => {
        orders = objects[0];
        devices = objects[1];
        // now render the data
        context.customer = customer;
        context.orders = orders;
        context.rmas = rmas;
        context.devices = [devices];
        console.log('rendering data!');
        res.render('search_by_rma', context);
    }).catch((err) => {
        // got an error - render it!
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        res.render('search_by_rma', context);
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

// NOW UNUSED PAST HERE:

// search page
router.get('/search', (req, res) => {
    res.render('search', Object.assign(templateContext(), {
        data: req.body,
        errors: {},
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
    
    // NEED LOGIC HERE TO DETERMINE WHICH ORDER TO SEARCH THROUGH

    // get customer # first (device, rma, order) then get other related fields

    if (input['Customer']) {
        db.getCustomer(input['Customer']);
    } else if (input['RmaNumber']) {
        db.getRMA(input['RmaNumber']);
    } else if (input['Serial']) {
        db.getDevice(input['Serial']);
    } else if (input['SalesOrder']) {
        db.getOrder(input['SalesOrder']);
    }

    // look up from SorMaster
    var lookupOpts = {
        table: 'SorMaster',
        queries: []
    };
    lookupOpts.queries = db.makeQueries(lookupOpts.table, input);
    return new Promise((resolve, reject) => {
        if (lookupOpts.queries.length) {
            db.lookup(lookupOpts).then((data) => resolve(data)).catch((err) => reject(err));
        } else {
            resolve([]);
        }
    }).then((data) => {
        // PULL OUT DATA
        data.map((d) => {
            var sor = {};
            db.tables.SorMaster.makeObject(d, sor, customer);
            orders.push(sor);
        });
        // Look up from ArCustomer
        lookupOpts = {
            table: 'ArCustomer',
            queries: [
            ]            
        };
        if (customer.Number) {
            lookupOpts.queries.push({
                operator: 'LIKE',
                column: 'Customer',
                pattern: `%${customer.Number}%`
                //'Customer': customer.Number
            });
            return db.lookup(lookupOpts);
        } else {
            return [];
        }
    }).then((data) => {
        // PULL OUT DATA
        data.map((d) => {
            db.tables.ArCustomer.makeObject(d, {}, customer);
        });
        // Look up from RmaMaster
        lookupOpts = {
            table: 'RmaMaster',
            queries: []
        };
        if (req.body["RMA Number"]) {
            lookupOpts.queries.push({
                operator: 'LIKE',
                column: 'RmaNumber',
                pattern: `%${db.padNumber(req.body["RMA Number"])}%`
                //'RmaNumber': db.padNumber(req.body["RMA Number"])
            });
            return db.lookup(lookupOpts);
        } else if (customer.Number) {
            lookupOpts.queries.push({
                operator: 'LIKE',
                column: 'Customer',
                pattern: `%${customer.Number}%`
                //'Customer': customer.Number
            });
            return db.lookup(lookupOpts);
        } else {
            return [];
        }
    }).then((data) => {
        // PULL OUT DATA
        data.map((d) => {
            var rma = {};
            db.tables.RmaMaster.makeObject(d, rma, customer);
            rmas.push(rma);
        });
        // Look up from InvSerialHead
        lookupOpts = {
            table: 'InvSerialHead',
            queries: []
        };
        if (req.body["Serial Number"]) {
            lookupOpts.queries.push({
                operator: 'LIKE',
                column: 'Serial',
                pattern: `%${req.body["Serial Number"]}%`
                //'Serial': req.body["Serial Number"]
            });
            return db.lookup(lookupOpts);
        } else if (customer.Number) {
            lookupOpts.queries.push({
                operator: 'LIKE',
                column: 'Customer',
                pattern: `%${customer.Number}%`
                //'Customer': customer.Number
            });
            return [];//db.lookup(lookupOpts);
        } else {
            return [];
        }
    }).then((data) => {
        // PULL OUT DATA
        data.map((d) => {
            var dev = {};
            db.tables.InvSerialHead.makeObject(d, dev, customer);
            devices.push(dev);
        });
        // now render the data
        context.customer = customer;
        context.orders = orders;
        context.rmas = rmas;
        context.devices = devices;
        console.log('rendering data!');
        res.render('search', context);
    }).catch((err) => {
        // got an error - render it!
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        res.render('search', context);
    });
})

module.exports = router
