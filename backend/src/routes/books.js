const express = require('express');
const router = express.Router();
const bookController = require('../controllers/bookController');

router.get('/:id', bookController.getBook);

router.put('/:id', bookController.updateBook);

router.get('/', bookController.getAllBooks);

router.delete('/:id', bookController.deleteBook);

//router.get('/:id/history', bookController.getBookHistory);

module.exports = router;