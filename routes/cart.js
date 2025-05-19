const express = require('express');
const { ObjectId } = require('mongodb');
const router = express.Router();
const verifyToken = require('../middleware/authmiddleware');
const { getDb } = require('../db');

// Add product to cart
// Add to Cart Route
router.post('/add', verifyToken, async (req, res) => {
const { productId, quantity } = req.body;

if (!productId || quantity <= 0) {
return res.status(400).json({ message: 'Valid product ID and quantity are required' });
}

try {
const db = getDb();
const cartItem = await db.collection('cart').findOne({ user: req.user.email, productId: new ObjectId(productId) });

if (cartItem) {
  // If the product is already in the cart, update the quantity
  await db.collection('cart').updateOne(
    { _id: cartItem._id },
    { $inc: { quantity: quantity } }
  );
} else {
  // Otherwise, add a new item to the cart
  await db.collection('cart').insertOne({
    user: req.user.email,
    productId: new ObjectId(productId),
    quantity,
  });
}

res.status(200).json({ message: 'Product added to cart' });


} catch (err) {
console.error('Error adding to cart:', err);
res.status(500).json({ message: 'Failed to add product to cart' });
}
});

// View cart items for the logged-in user
router.get('/view', verifyToken, async (req, res) => {
try {
const db = getDb();
const cartItems = await db.collection('cart').find({ user: req.user.email }).toArray();

if (cartItems.length === 0) {
        return res.status(404).json({ message: 'Your cart is empty' });
    }

    // Fetch product details for each cart item
    const productIds = cartItems.map(item => item.productId);
    const products = await db.collection('products').find({ _id: { $in: productIds } }).toArray();

    // Combine cart items and product details
    const cartDetails = cartItems.map(item => {
        const product = products.find(p => p._id.toString() === item.productId.toString());

        if (!product) return null;
        return {
            productId: product._id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            imagePath: product.imagePath,
        };
    }).filter(Boolean);

    res.status(200).json(cartDetails);
} catch (err) {
    console.error('Error fetching cart items', err);
    res.status(500).json({ message: 'Failed to fetch cart items' });
}


});

// Update cart item quantity
router.put('/update/\:cartItemId', verifyToken, async (req, res) => {
const { cartItemId } = req.params;
const { quantity } = req.body;

if (quantity === undefined || quantity <= 0) {
    return res.status(400).json({ message: 'Valid quantity is required' });
}

try {
    const db = getDb();
    
    // Fetch the cart item
    const cartItem = await db.collection('cart').findOne({ _id: new ObjectId(cartItemId), user: req.user.email });

    if (!cartItem) {
        return res.status(404).json({ message: 'Product not found in cart' });
    }

    const product = await db.collection('products').findOne({ _id: new ObjectId(cartItem.productId) });

    if (!product) {
        return res.status(404).json({ message: 'Product not found' });
    }

    // Check if the stock is sufficient before updating
    const stockChange = quantity - cartItem.quantity; // how much the quantity is changing
    if (product.stock < stockChange) {
        return res.status(400).json({ message: 'Insufficient stock available' });
    }

    // Update the quantity in the cart
    await db.collection('cart').updateOne(
        { _id: cartItem._id },
        { $set: { quantity: quantity } }
    );

    // Update the stock in the products collection
    await db.collection('products').updateOne(
        { _id: new ObjectId(cartItem.productId) },
        { $inc: { stock: -stockChange } }
    );

    res.status(200).json({ message: 'Cart updated successfully' });
} catch (err) {
    console.error('Error updating cart', err);
    res.status(500).json({ message: 'Failed to update cart' });
}


});

// Remove product from cart
router.delete('/remove', verifyToken, async (req, res) => {
const { productId } = req.body;

if (!productId) {
    return res.status(400).json({ message: 'Product ID is required' });
}

try {
    const db = getDb();
    const cartItem = await db.collection('cart').findOne({ user: req.user.email, productId: new ObjectId(productId) });

    if (!cartItem) {
        return res.status(404).json({ message: 'Product not found in cart' });
    }

    await db.collection('cart').deleteOne({ _id: cartItem._id });

    const product = await db.collection('products').findOne({ _id: new ObjectId(productId) });
    await db.collection('products').updateOne(
        { _id: new ObjectId(productId) },
        { $inc: { stock: cartItem.quantity } }
    );

    res.status(200).json({ message: 'Product removed from cart' });
} catch (err) {
    console.error('Error removing product from cart', err);
    res.status(500).json({ message: 'Failed to remove product from cart' });
}


});

module.exports = router;