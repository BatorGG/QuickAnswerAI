require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const bcrypt = require('bcrypt');
const jsonfile = require('jsonfile');
const jwt = require('jsonwebtoken');

const cors = require('cors');
app.use(cors());

// CORS middleware
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); // Replace '*' with your domain in production
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS'); // Add other methods as needed
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type'); // Add any other headers you need
    next();
});




//https://platform.openai.com/docs/guides/vision?lang=node

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OpenAI });

async function pre(imgurl) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {"role": "system", "content": ""},
      {
        role: "user",
        content: [
          { type: "text", text: "Turn the text on the image into text. Only reply with the text on the image. If there is no text, explain what is on the picture! If there was no text on the picture start your message with '0:'" },
          {
            type: "image_url",
            image_url: {
              "url": imgurl,
            },
          },
        ],
      },
    ],
    "max_tokens": 200
  });
  console.log(response.choices[0]);
  return response.choices[0];
}

async function main(text) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {"role": "system", "content": "Keep answers as short as possible. 3 sentences maximum! Answer in the same language as the input text, but default to english. Maximum tokens is 100 so please finish every sentence before running out of tokens!"},
      {
        role: "user",
        content: [
          { type: "text", text: text },
        ],
      },
    ],
    "max_tokens": 100
  });
  console.log(response.choices[0]);
  return response.choices[0];
}

async function multiple(aimsgs, humanmsgs) {

  let msgs = [];
  let totalCharacters = 0;

  msgs.push({"role": "system", "content": "Keep answers as short as possible. 3 sentences maximum! Answer in the same language as the input text, but default to english. Maximum tokens is 150 so please finish every sentence before running out of tokens!"})

  for (let i = 0; i < humanmsgs.length; i++){

    let toPush = {"role": "user", "content": humanmsgs[i]}
    msgs.push(toPush)

    totalCharacters += humanmsgs[i].length;

    if (i < aimsgs.length) {
      let toPush2 =  {"role": "assistant", "content": aimsgs[i]}
      msgs.push(toPush2)

      totalCharacters += aimsgs[i].length;
    }

  }

  console.log("Total characters:", totalCharacters);
  if (totalCharacters < 1000) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: msgs,
      "max_tokens": 150
    });
    console.log(response.choices[0]);
    return response.choices[0];
  }
  else {
    return false
  }
}

async function testy() {

  console.log("test");
  
  const completion = await openai.chat.completions.create({
    messages: [
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello how are you?"}
      ],
    "max_tokens": 50,
    model: "gpt-4o-mini",
  });

  console.log(completion.choices[0]);
  return completion.choices[0];
}

function test(msg) {

    const str = "Message was word word word wordword word word wordword word word wordword word word wordword word word wordword word word wordword word word wordword word word wordword word word wordword word word wordword word word word word word word wordword word word wordword word word word" + msg;

    return str

}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

app.get('/success', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'success.html'));
});

app.post('/getResponse', async (req, res) => {
    const img = req.body.image;

    
    const response1 = await pre(img)
    if (response1.message.content.substring(0, 2) == "0:"){
      var response = response1.message.content.substring(2);
      var hidden = "Photo";
    }
    else {
      var response = await main(response1.message.content)
      response = response.message.content;
      var hidden = response1.message.content
    }
    //.message.content
    
    //const response = await test(img);
    //const hidden = response;

    res.json({
        message: 'Success',
        data: {
          msg: response,
          hidden: hidden
        }
      });
});

app.post('/multiple', async (req, res) => {
  const ai = req.body.ai;
  const human = req.body.human;

  var response = await multiple(ai, human);

  if (response) {
    response = response.message.content;
  }
  else {
    response = "Conversation limit reached, plese start a new chat!"
  }

  res.json({
        message: 'Success',
        data: response
      });


});


//Login system
const mongoose = require('mongoose');
const mongoURI = process.env.mongoURI;

mongoose.connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB Atlas connected'))
  .catch(err => console.error('MongoDB connection error:', err));
  
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  subscription: { type: Boolean, default: false },
  canceled: { type: Boolean, default: false },
});

const User = mongoose.model('User', userSchema);


const USER_FILE = './users.json'; // File to store user data
const SECRET_KEY = process.env.JWT; // Replace with a strong secret key


// Route to register a new user
app.post('/register', async (req, res) => {
  const { email, password } = req.body;

  console.log(req.body)
  console.log(email, password);

  try {
    var user = await User.findOne({ email });

    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }
    else {
      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ email: email, password: hashedPassword, subscription: false, canceled: false});
      await user.save();
      console.log(user);

      const token = jwt.sign({ email: user.email, subscription: false, canceled: false }, SECRET_KEY, { expiresIn: '1h' });

      res.json({ success: true, message: 'User registered successfully', token });
    }
  }
  catch (error) {
    console.log("error occured");
    console.log(error);
    res.json({ success: false, message: 'Error registering user' });
  }
});

// Route to authenticate a user
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log("Trying login with:", email, password);

  try {
    const user = await User.findOne({ email });
    console.log(user);

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }
    else {
      const isMatch = await bcrypt.compare(password, user.password);

      if (!isMatch) {
        return res.status(401).json({ success: false,  message: 'Wrong password' });
      }
      else {
        const hasSubscription = await checkUserSubscriptionByEmail(user.email);
        console.log("Subscription:", hasSubscription)

        const result = await User.updateOne(
          { email }, // Query to find the user
          { $set: { subscription: hasSubscription } } // Update operation
        );

        console.log(result);

        // Generate a JWT token
        const token = jwt.sign({ email: user.email, subscription: hasSubscription, canceled: user.canceled }, SECRET_KEY, { expiresIn: '1h' });
        res.status(200).json({ success: true, token });
      }
    }
  }
  catch (error) {
    res.status(500).json({ success: false, message: 'Error logging in' });
  }

});

function loginTest() {
  const data = {"email": "v@v.com", "password": "v"}

  axios.post('http://localhost:3000/register', data)
  .then(response => {
    console.log('Success:', response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
}

//loginTest();


//Subscription system
const Stripe = require('stripe');
const { checkServerIdentity } = require('tls');
const stripe = Stripe(process.env.Stripe);

// Create Stripe Checkout session
app.post('/create-checkout-session', async (req, res) => {

  try {
    const email = req.body.email;
    const tokenYes = jwt.sign({ email: email, subscription: true, canceled: false }, SECRET_KEY, { expiresIn: '1h' });
    const tokenNo = jwt.sign({ email: email, subscription: false, canceled: false }, SECRET_KEY, { expiresIn: '1h' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription', // subscription mode for recurring payments
      line_items: [
        {
          price: "price_1Q3OXILFfRbXlwIneUoowBEI", // The price ID from your Stripe Dashboard
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/dashboard?token=${tokenYes}`,
      cancel_url: `${req.headers.origin}/dashboard?token=${tokenYes}`,
      customer_email: email
    });

    const customer = await stripe.customers.create({
      email: email
    });


    res.json({ url: session.url});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
app.post('/update-subscription', async (req, res) => {
  const email = req.body.email;
  const subscription = req.body.subscription;

  const updatedUser = await User.findOneAndUpdate(
    { email }, 
    { $set: { subscription: subscription } }, 
    { new: true }
  );

  res.json({ success: true});

});



async function getCustomerIdByEmail(email) {
  const customers = await stripe.customers.list({ limit: 100 }); // Adjust limit as needed
  
  // Find the customer with the matching email
  const customer = customers.data.find(cust => cust.email === email);
  return customer ? customer.id : null; // Return Customer ID or null if not found
};

async function checkUserSubscriptionByEmail(email) {
  const customerId = await getCustomerIdByEmail(email);
  
  if (!customerId) {
      console.log('No customer found with that email.');
      return false; // No customer found
  }

  // Check for active subscriptions
  const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
  });

  console.log(subscriptions);

  return subscriptions.data.length > 0; // Returns true if active subscription exists
};

async function checkCanceled(email) {
  const customerId = await getCustomerIdByEmail(email);
  
  if (!customerId) {
      console.log('No customer found with that email.');
      return false; // No customer found
  }

  // Check for active subscriptions
  const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
  });

  console.log(subscriptions.data[0].cancel_at_period_end);

  return subscriptions.data[0].cancel_at_period_end; // Returns true if active subscription exists
};




app.post('/check-subscription', async (req, res) => {
  const email = req.body.email;
  const status = await checkUserSubscriptionByEmail(email);
  console.log(status)

  res.json({ status: status });
});

app.post('/cancel-subscription', async (req, res) => {
  const email = req.body.email;
  const customerId = await getCustomerIdByEmail(email);

  if (customerId) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
    });

    console.log(subscriptions)

    const subscriptionId = subscriptions.data[0].id;

    const canceledSubscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });

    const updatedUser = await User.findOneAndUpdate(
      { email }, 
      { $set: { canceled: true } }, 
      { new: true }
    );
    console.log(updatedUser);

    const token = jwt.sign({ email: updatedUser.email, subscription: updatedUser.subscription, canceled: updatedUser.canceled }, SECRET_KEY, { expiresIn: '1h' });
    
    res.json({ success: true, token});
  }
  else {
    res.json({ success: false});
  }
  
  

});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
