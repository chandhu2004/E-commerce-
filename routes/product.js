const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { ObjectId } = require('mongodb');
const verifyToken = require('../middleware/authmiddleware');
const { getDb } = require('../db');

// Multer storage config
// middleware/upload.js


// Create absolute path to 'uploads' folder
const uploadPath = path.join(__dirname, '..', 'uploads');

// Ensure the uploads folder exists
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
  console.log('Uploads folder created at:', uploadPath);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadPath); // use absolute path
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname);
  }
});

const upload = multer({ storage: storage });

//module.exports = upload;


/**
 * @route   POST /product/upload
 * @desc    Upload a new product (with image)
 * @access  Protected
 */
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { name, price, description, stock } = req.body;
    const image = req.file;

    if (!name || !price || !stock || !image) {
      return res.status(400).json({
        message: 'All fields (name, price, stock, image) are required'
      });
    }

    const db = getDb();
    const imagePath = `uploads/${image.filename}`;

    const product = {
      name,
      price: parseFloat(price),
      stock: parseInt(stock),
      description: description || '',
      imagePath,
      user: req.user.email,
      uploadedAt: new Date()
    };

    await db.collection('products').insertOne(product);

    res.status(201).json({
      message: 'Product uploaded successfully',
      product
    });
  } catch (err) {
    console.error('Product upload error:', err);
    res.status(500).json({ message: 'Failed to upload the product' });
  }
});

/**
 * @route   DELETE /products/delete/:id
 * @desc    Delete a product (and image)
 * @access  Protected
 */
router.delete('/delete/:id', verifyToken, async (req, res) => {
    const productId = req.params.id;

    if (!ObjectId.isValid(productId)) {
        return res.status(400).json({ message: 'Invalid product ID' });
    }

    try {
        const db = getDb();

        const product = await db.collection('products').findOne({
            _id: new ObjectId(productId),
            email: req.user.userId
        });

        if (!product) {
            return res.status(404).json({ message: 'Product not found or not authorized' });
        }

        // Delete the product from DB
        await db.collection('products').deleteOne({ _id: new ObjectId(productId) });

        // Delete the image file if it exists
        const imagePath = path.resolve(__dirname, '..', product.imagePath); // Absolute path

        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        } else {
            console.warn('Image file not found:', imagePath);
        }

        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (err) {
        console.error('Delete error:', err);
        res.status(500).json({
            message: 'Error deleting product.',
            error: err.message,
            stack: err.stack
        });
    }
});
/**
 * @route   GET /product/update/:id
 * @desc    Render the update form for a product
 * @access  Protected
 */
router.get('/update/:id', verifyToken, async (req, res) => {
  const productId = req.params.id;

  if (!ObjectId.isValid(productId)) {
    return res.status(400).send('Invalid product ID');
  }

  try {
    const db = getDb();
    const product = await db.collection('products').findOne({
      _id: new ObjectId(productId),
      user: req.user.email,
    });

    if (!product) {
      return res.status(404).send('Product not found or not authorized');
    }

    res.render('editProduct', {
      title: 'Edit Product',
      product,
    });
  } catch (err) {
    console.error('Product fetch error:', err);
    res.status(500).send('Failed to load product for editing');
  }
});

/**
 * @route   PUT /product/update/:id
 * @desc    Update the product
 * @access  Protected
 */
router.put('/update/:id', verifyToken, upload.single('image'), async (req, res) => {
  const productId = req.params.id;
  const { name, price, stock, description } = req.body;
  const image = req.file;

  if (!ObjectId.isValid(productId)) {
    return res.status(400).send('Invalid product ID');
  }

  try {
    const db = getDb();
    const product = await db.collection('products').findOne({
      _id: new ObjectId(productId),
      user: req.user.email,
    });

    if (!product) {
      return res.status(404).send('Product not found or not authorized');
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (price) updateData.price = parseFloat(price);
    if (stock) updateData.stock = parseInt(stock, 10);
    if (description) updateData.description = description;

    // If new image is uploaded
    if (image) {
      const newImagePath = `uploads/${image.filename}`;

      // Delete old image if it exists
      if (product.imagePath) {
        const oldImagePath = path.join(__dirname, '..', product.imagePath);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      updateData.imagePath = newImagePath;
    }

    const result = await db.collection('products').updateOne(
      { _id: new ObjectId(productId) },
      { $set: updateData }
    );

    const updatedProduct = { ...product, ...updateData };

    if (result.modifiedCount === 0) {
      return res.render('editProduct', {
        title: 'Edit Product',
        product: updatedProduct,
        errorMessage: 'No changes made or update failed',
      });
    }

    // Return JSON if request is from Postman or other API client
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.status(200).json({ message: 'Product updated successfully', productId });
    }

    // Otherwise, render updated form with success message
    res.render('editProduct', {
      title: 'Edit Product',
      product: updatedProduct,
      successMessage: 'Product updated successfully!',
    });

  } catch (err) {
    console.error('Product update error:', err);
    res.status(500).send('Failed to update product');
  }
});





module.exports = router;