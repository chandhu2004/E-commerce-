const express = require('express');
const exphbs = require('express-handlebars');
const path = require('path');
const cookieParser = require('cookie-parser');
require('dotenv').config();

const authRouter = require('./routes/auth');
const productRouter = require('./routes/product');
const cartRouter = require('./routes/cart');
const { connectDB, getDb } = require('./db');
const verifyToken = require('./middleware/authmiddleware');
const { ObjectId } = require('mongodb'); 
const methodOverride=require('method-override');


const app = express();

app.use(express.static('public')); 

// Middleware
app.use(cookieParser());
app.use(express.json());

app.use(express.urlencoded({ extended: false }));
app.use(methodOverride('_method'));

// Serve uploaded images statically

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));



// View engine setup
app.engine('hbs', exphbs.engine({
    extname: '.hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views','layouts')
}));
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Connect to DB and define routes
connectDB().then(() => {
    // Routers
    app.use('/auth', authRouter);
    app.use('/product', productRouter);
    app.use('/cart', cartRouter);

    // Protected home page - product list
    app.get('/', verifyToken, async (req, res) => {
        try {
            const db = getDb();
            const products = await db.collection('products').find().toArray();
            console.log(products); // Log the products to see if all are being fetched
            res.render('product', { title: 'Products', products, user: req.user });
        } catch (err) {
            console.error(err);
            res.status(500).send('Failed to load products');
        }
    });

    

    //Auth routes
    app.get('/login', (req, res) => {
        res.render('login', { title: 'Login' });
    });

    app.get('/register', (req, res) => {
        res.render('register', { title: 'Register' });
    });

    // Cart page
    app.get('/cart', verifyToken, async (req, res) => {
        try {
            const db = getDb();
            const items = await db.collection('cart').find({ user: req.user.email }).toArray();
            res.render('cart', { title: 'Your Cart', items });
        } catch (err) {
            console.error('Failed to load cart:', err);
            res.status(500).send('Internal Server Error');
        }
    });

    // Upload product form
    app.get('/upload', verifyToken, (req, res) => {
        res.render('uploadProduct', { title: 'Upload Product' });
    });

    app.get('/login', (req, res) => {
        res.render('login', { layout: 'layout', cssFile: ['animation.css','form.css'] });
    });
    app.get('/register', (req, res) => {
        res.render('register', { layout: 'layout', cssFile: 'animation.css' });
    });
    app.get('/cart', (req, res) => {
        res.render('cart', { layout: 'layout', cssFile: 'cart.css' });
    });
    app.get('/products', (req, res) => {
        res.render('product-list', {
            layout: 'layout',        // common layout file// 
            cssFiles: ['product.css'], // only load product.css for this page
            title: 'Products'
        });
    });
    

    // Start server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}).catch((err) => {
    console.error('Failed to connect to DB', err);
});
