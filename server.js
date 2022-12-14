import express from 'express';
import connectDatabase from './config/db';
import { check, validationResult } from 'express-validator';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from 'config';
import User from './models/User';
import Post from './models/Post';
import auth from './middleware/auth';

//initialize express application
const app = express();

//connect database
connectDatabase();

//configure middleware
app.use(express.json({extended: false}));
app.use(
    cors({
        origin: 'http://localhost:5000'
    })
);

//API endpoints
/**
 * @route GET/
 * @desc Test endpoint
 */
app.get('/', (req, res) => res.send('http get request sent to root api endpoint'));

/**
 * @route GET /
 * @desc Test endpoint
 */

app.post('/api/users', 
[
    check('name', 'Please enter your name').not().isEmpty(),
    check('email', 'Please enter a valid email').isEmail(),
    check('password', 'Please enter a password with 6 or more characters').isLength({ min: 6 })
],
async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    } else {
    const { name, email, password } = req.body;
    try {
        //check if user exists
        let user = await User.findOne({ email: email});
        if (user) {
            return res  
                .status(400)
                .json({errors: [{ msg: 'User already exists' }] });
        }

        //create a new user
        user = new User({
            name: name,
            email: email,
            password: password
        });

        //encrypt the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        //save to the db and return
        await user.save();
        
        //generate and return jwt token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(
            payload,
            config.get('jwtSecret'),
            { expiresIn: '10hr' },
            (err, token) => {
                if (err) throw err;
                res.json({ token: token });
            }
        );
    
    } catch (error) {
        res.status(500).send('Server error');
    }
    
    }
    
});

//Post endpoints

/**
 * @route Post api/posts
 * @deasc Create post
 */

app.post(
    '/api/posts',
    [
        auth,
        [
            check('title', 'Title text is required')
                .not()
                .isEmpty(),
            check('body', 'Body text is required')
                .not()
                .isEmpty()
        ]
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()){
            res.status(400).json({ errors: errors.array() });
        } else {
            const { title, body } = req.body;
            try {
                //get the user who created the post
                const user = await User.findById(req.user.id);

                //create a new post
                const post = new Post({
                    user: user.id,
                    title: title,
                    body: body
                });

                //save the db and return
                await post.save();

                res.json(post);
            } catch (error) {
                console.error(error);
                res.status(500).send('Server error');
            }
        }
    }
);

//connection listener
const port = 5000;
app.listen(port, () => console.log(`Express server running on port ${port}`));