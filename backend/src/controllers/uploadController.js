const { v4: uuidv4 } = require('uuid');
const { db } = require('../db/database');

class UploadController {

  async uploadImage(req, res) {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

      const language = req.body.language || 'ru';
      const ocrService = require('../services/ocrService');
      const ocrData = await ocrService.processBookCover(req.file.path, language);
      
      res.json({
        book_id: uuidv4(),
        status: 'processed',
        image_url: `/uploads/${req.file.filename}`,
        ocr_data: {
          title: ocrData.title || '',
          author: ocrData.author || '',
          year: ocrData.year || '',
          publisher: ocrData.publisher || '',
          remaining_text: ocrData.remaining_text || '',
          extracted_text: ocrData.extracted_text || '',
          confidence: ocrData.confidence || 0,
          language
        }
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to process image' });
    }
  }

  async createBook(req, res) {
    try {
      const { title, author, year, publisher, description, language, image_url, ocr_data, confidence } = req.body;
      const bookId = uuidv4();
      
      db.run(
        `INSERT INTO books (
            id, title, author, year, publisher, description, language, cover_url,
            extracted_text, confidence, status, created_at, updated_at
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          bookId, 
          title || '', 
          author || '', 
          year || null, 
          publisher || '',
          description || '',
          language || 'ru', 
          image_url || '', 
          ocr_data?.extracted_text || '', 
          confidence || 0,
          'completed'
        ],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to save book: ' + err.message });
          }
          
          if (image_url) {
            db.run(
              `INSERT INTO book_images (book_id, image_url, image_type) VALUES (?, ?, ?)`,
              [bookId, image_url, 'cover']
            );
          }
          
          db.get(`SELECT * FROM books WHERE id = ?`, [bookId], (err, row) => {
            if (err) res.status(500).json({ error: 'Failed to retrieve book' });
            else res.status(201).json({ message: 'Book saved', book: row });
          });
        }
      );
      
    } catch (error) {
      console.error('Create book error:', error);
      res.status(500).json({ error: 'Failed to create book' });
    }
  }

  async getBook(req, res) {
    try {
      const { id } = req.params;
      const book = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!book) return res.status(404).json({ error: 'Book not found' });
      res.json(book);
    } catch (error) {
      console.error('Get book error:', error);
      res.status(500).json({ error: 'Failed to get book' });
    }
  }

  async getProcessedBook(req, res) {
    try {
      const { id } = req.params;
      const book = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!book) return res.status(404).json({ error: 'Book not found' });
      const images = await new Promise((resolve, reject) => {
        db.all(`SELECT * FROM book_images WHERE book_id = ?`, [id], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      res.json({ ...book, images, processing_complete: true });
    } catch (error) {
      console.error('Get processed book error:', error);
      res.status(500).json({ error: 'Failed to get processed book' });
    }
  }

  async updateBook(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const book = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      if (!book) return res.status(404).json({ error: 'Book not found' });
      
      const fields = [];
      const values = [];
      
      if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
      if (updates.author !== undefined) { fields.push('author = ?'); values.push(updates.author); }
      if (updates.year !== undefined) { fields.push('year = ?'); values.push(updates.year); }
      if (updates.publisher !== undefined) { fields.push('publisher = ?'); values.push(updates.publisher); }
      if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
      if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
      
      if (fields.length === 0) return res.json(book);
      
      fields.push('updated_at = CURRENT_TIMESTAMP');
      values.push(id);
      
      await new Promise((resolve, reject) => {
        db.run(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, values, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      
      const updatedBook = await new Promise((resolve, reject) => {
        db.get(`SELECT * FROM books WHERE id = ?`, [id], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      
      res.json(updatedBook);
      
    } catch (error) {
      console.error('Update book error:', error);
      res.status(500).json({ error: 'Failed to update book' });
    }
  }

  async getProcessingStatus(req, res) {
    try {
      const { bookId } = req.params;
      const book = await new Promise((resolve, reject) => {
        db.get(`SELECT id, status, title, author FROM books WHERE id = ?`, [bookId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      if (!book) return res.status(404).json({ error: 'Book not found' });
      res.json({
        status: book.status,
        progress: 100,
        message: 'Обработка завершена',
        book_id: bookId,
        book
      });
    } catch (error) {
      console.error('Status check error:', error);
      res.status(500).json({ error: 'Failed to get status' });
    }
  }
}

module.exports = new UploadController();