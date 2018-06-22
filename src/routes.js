const db = require('./database');
const express = require('express')
const router = express.Router()
const { check, validationResult } = require('express-validator/check')
const { matchedData } = require('express-validator/filter')


var tableName = null,
    fieldName = null,
    value = null;
var templateContext = function() {
    const fields=Object.keys(db.fieldMap).map((f) => { return {
        title: f,
        selected: f==fieldName
    }});
    const tables=Object.keys(db.tableMap).map((f) => { return {
        title: f,
        selected: f==tableName
    }});
    return {
        fields: fields,
        tables: tables,
        items: [],
        search: {
            table: tableName,
            field: fieldName,
            query: value
        }
    };
}

router.get('/', (req, res) => {
    res.render('index')
});

// RMA page
router.get('/check_rma', (req, res) => {
    res.render('check_rma', Object.assign(templateContext(), {
        data: req.body, // { message, email }
        errors: {},
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
            csrfToken: req.csrfToken()
        }));
    }

    const data = matchedData(req);
    value = data.query;

    var context = Object.assign(templateContext(), {
        data: req.body, // { message, email },
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    });
    db.checkRMA(value).then((data) => {
        console.log('rendering data!');
        context.items = data;
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
        data: req.body, // { message, email }
        errors: {},
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
            errors: errors.mapped(),
            csrfToken: req.csrfToken()
        }));
    }

    const data = matchedData(req)
    value = data.query;

    var context = Object.assign(templateContext(), {
        data: req.body, // { message, email },
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    });
    db.checkOrder(value).then((data) => {
        console.log('rendering data!');
        context.items = data;
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
        data: req.body, // { message, email },
        errors: {},
        csrfToken: req.csrfToken()
    }));
});

router.post('/search', [
    check('query')
        .trim(),
    check('searchTable')
        .isLength({ min: 1 })
        .trim(),
    check('searchField')
        .isLength({ min: 1 })
        .trim()
], (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
        return res.render('search', Object.assign(templateContext(), {
            data: req.body,
            errors: errors.mapped(),
            csrfToken: req.csrfToken()
        }));
    }

    const data = matchedData(req)
    //console.log('Sanitized:', data);
    tableName = data.searchTable;
    fieldName = data.searchField;
    value = data.query;
    var table = db.tableMap[tableName];
    var field = db.fieldMap[fieldName];

    var context = Object.assign(templateContext(), {
        data: req.body, // { message, email },
        errors: {},
        items: [],
        csrfToken: req.csrfToken()
    });

    var lookupOpts = {
        '_table': table,
        'queries': [
            {
                [field]: value
            }
        ]
    };
    db.lookup(lookupOpts).then((data) => {
        console.log('rendering data!');
        context.items = data;
        res.render('search', context);
    }).catch((err) => {
        console.log('caught error!');
        context.errors.server = {
            msg: err.message
        }
        res.render('search', context);
    });
    
    //req.flash('success', 'Thanks for the message! I will be in touch :)');
    //res.redirect('/search');
})

module.exports = router
