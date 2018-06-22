const db = require('./database');
const express = require('express')
const router = express.Router()
const { check, validationResult } = require('express-validator/check')
const { matchedData } = require('express-validator/filter')

function makeID(s) {
    return s;//.replace(/ /gm, '_');
}

var tableName = null,
    fieldName = null,
    value = null;
var templateContext = function() {
    const fields=Object.keys(db.fieldMap).map((f) => { return {
        title: f,
        selected: f==fieldName,
        id: makeID(f)
    }});
    const tables=Object.keys(db.tableMap).map((f) => { return {
        title: f,
        selected: f==tableName,
        id: makeID(f)
    }});
    return {
        fields: fields,
        tables: tables,
        // actual data
        customer: {},
        orders: [],
        rmas: [],
        devices: [],
        // end actual data
        search: {
            table: tableName,
            query: value,
            queries: [
            ]
        }
    };
}

router.get('/', (req, res) => {
    res.render('index')
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
    check('query')
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
    value = data.query;

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    });
    db.getRMA(value).then((rma) => {
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
    check('query')
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
    value = data.query;

    var context = Object.assign(templateContext(), {
        data: req.body,
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    });
    db.getOrder(value).then((order) => {
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
                'Customer': customer.Number
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
                'RmaNumber': db.padNumber(req.body["RMA Number"])
            });
            return db.lookup(lookupOpts);
        } else if (customer.Number) {
            lookupOpts.queries.push({
                'Customer': customer.Number
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
                'Serial': req.body["Serial Number"]
            });
            return db.lookup(lookupOpts);
        } else if (customer.Number) {
            lookupOpts.queries.push({
                'Customer': customer.Number
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
