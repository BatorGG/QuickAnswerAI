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

// Function to generate a basic unique ID (you can improve this if needed)
function generateUniqueId() {
  return Math.random().toString(36).substr(2, 9); // Basic unique ID generator
}

// Middleware to manage cookies and assign unique ID to users
app.use((req, res, next) => {
  // Extract the 'userId' cookie from the request headers
  let cookies = req.headers.cookie;
  let userId;

  if (cookies) {
    // Parse the cookie string manually to get the 'userId'
    cookies.split(';').forEach((cookie) => {
      let [name, value] = cookie.split('=');
      if (name.trim() === 'userId') {
        userId = value;
      }
    });
  }

  if (!userId) {
    // If no 'userId' found, generate a new one
    userId = generateUniqueId();
    // Set the 'userId' cookie in the response headers
    res.setHeader('Set-Cookie', `userId=${userId}; HttpOnly; Path=/`);
  }

  // Attach userId to the request object for logging
  req.userId = userId;

  // Log the request with the user's unique ID and timestamp
  const log = `${new Date().toISOString()} - User: ${req.userId} - ${req.method} ${req.url}`;
  console.log(log);

  next(); // Proceed to the next middleware
});







//https://platform.openai.com/docs/guides/vision?lang=node

const OpenAI = require('openai');
const openai = new OpenAI({ apiKey: process.env.OpenAI });

async function pre(imgurl) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
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
  //console.log(response.choices[0]);
  return response.choices[0];
}

async function main(imgurl) {
  const response = await openai.chat.completions.create({
    model: "gpt-4o-2024-08-06",
    messages: [
      {"role": "system", "content": "You are a versatile assistant helping users by analyzing image-based text or visual content. Respond according to these rules:\n\n1.Always answer in the language on the image. If you cannot identify the language answer in english.\n\n2. If the image contains a question, answer it directly and concisely.\n\n3. If the image contains a term or phrase, provide a brief, clear explanation of that term in the language detected in the image text.\n\n4. If the image contains no readable text, analyze the visual content and describe what you see.\n\n5. Keep answers short, maximum response is 400 tokens, so please finish your sentences before running out of tokens."},
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              "url": imgurl,
            },
          },
        ],
      },
    ],
    "max_tokens": 400
  });
  //console.log(response.choices[0]);
  return response.choices[0];
}

async function multiple(aimsgs, humanmsgs) {

  let msgs = [];
  let totalCharacters = 0;

  msgs.push({"role": "system", "content": "Keep answers as short as possible. Answer in the same language as the input. If you cannot identify the language, respond in english. Maximum tokens is 400 so please finish every sentence before running out of tokens!"})

  for (let i = 0; i < humanmsgs.length; i++){

    let toPush
    

    if (i == 0) {
      toPush = {"role": "user", "content": [
                    {
                      "type": "image_url",
                      "image_url": {
                        "url": humanmsgs[i],
                      },
                    },
                  ],
                }
    }
    else {
      toPush = {"role": "user", "content": humanmsgs[i]}
      totalCharacters += humanmsgs[i].length;
    }

    msgs.push(toPush)

    

    if (i < aimsgs.length) {
      let toPush2 =  {"role": "assistant", "content": aimsgs[i]}
      msgs.push(toPush2)

      totalCharacters += aimsgs[i].length;
    }

  }

  console.log("Total characters:", totalCharacters);
  if (totalCharacters < 1000) {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-2024-08-06",
      messages: msgs,
      "max_tokens": 400
    });
    //console.log(response.choices[0]);
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
    model: "gpt-4o-2024-08-06",
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

app.get('/download', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'download.html'));
});

app.get('/terms-of-service', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/privacy-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'privacy.html'));
});

app.get('/refund-policy', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'refunds.html'));
});

app.post('/getResponse', async (req, res) => {
    const img = req.body.image;

    const response = await main(img)

    //console.log("User asked: " + hidden);
    console.log("Response: " + response);

    res.json({
        message: 'Success',
        data: {
          msg: response.message.content,
          hidden: req.body.image
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

  //console.log(req.body)
  //console.log(email, password);

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
          price: "price_1QNxFVLFfRbXlwInysRV5SQ4", // The price ID from your Stripe Dashboard
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7, // Set trial period here
      },
      payment_method_collection: 'always',
      success_url: `${req.headers.origin}/dashboard?token=${tokenYes}`,
      cancel_url: `${req.headers.origin}/dashboard?token=${tokenNo}`,
      customer_email: email
    });

    /*
    const customer = await stripe.customers.create({
      email: email
    });*/


    res.json({ url: session.url});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/create-checkout-session2', async (req, res) => {

  try {
    const email = req.body.email;
    const tokenYes = jwt.sign({ email: email, subscription: true, canceled: false }, SECRET_KEY, { expiresIn: '1h' });
    const tokenNo = jwt.sign({ email: email, subscription: false, canceled: false }, SECRET_KEY, { expiresIn: '1h' });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription', // subscription mode for recurring payments
      line_items: [
        {
          price: "price_1QNxFaLFfRbXlwInpy1vaetU", // The price ID from your Stripe Dashboard
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 7, // Set trial period here
      },
      payment_method_collection: 'always',
      success_url: `${req.headers.origin}/dashboard?token=${tokenYes}`,
      cancel_url: `${req.headers.origin}/dashboard?token=${tokenNo}`,
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

  console.log("user subscription updated:", updatedUser);

  res.json({ success: true});

});



async function getCustomerIdByEmail(email) {
  console.log("Get id by email")
  const customers = await stripe.customers.search({
    query: `email:'${email}'`,
  });
  
  // Return the first matching customer
  return customers.data.length > 0 ? customers.data[0].id : null;
}

async function checkUserSubscriptionByEmail(email) {
  console.log("Check activ subscription")
  const customerId = await getCustomerIdByEmail(email);

  if (!customerId) {
    console.log('No customer found with that email.');
    return false; // No customer found
  }

  // Check for active or trialing subscriptions
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all', // Fetch all statuses
  });

  // Check for relevant subscription states
  const hasActiveSubscription = subscriptions.data.some(sub => 
    ['active', 'trialing'].includes(sub.status)
  );

  console.log(subscriptions);
  return hasActiveSubscription; // Return true if relevant subscription exists
}

async function checkCanceled(email) {
  console.log("Checking if subscription is set to cancel at period end...");

  const customerId = await getCustomerIdByEmail(email);

  if (!customerId) {
    console.log("No customer found with that email.");
    return false; // No customer found
  }

  // Fetch all subscriptions for the customer
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all', // Include all statuses
  });

  // Check if there's any subscription
  if (!subscriptions.data.length) {
    console.log("No subscriptions found for this customer.");
    return false;
  }

  // Find the relevant subscription
  const subscription = subscriptions.data.find(sub =>
    ['active', 'trialing', 'past_due'].includes(sub.status)
  );

  if (!subscription) {
    console.log("No active or trialing subscription found.");
    return false;
  }

  // Return the cancel_at_period_end flag
  console.log(`Subscription cancel_at_period_end: ${subscription.cancel_at_period_end}`);
  return subscription.cancel_at_period_end;
}





app.post('/check-subscription', async (req, res) => {
  const email = req.body.email;
  const status = await checkUserSubscriptionByEmail(email);
  console.log(status)

  res.json({ status: status });
});

app.post('/cancel-subscription', async (req, res) => {
  const email = req.body.email;

  try {
    const customerId = await getCustomerIdByEmail(email);

    if (!customerId) {
      return res.json({ success: false, message: 'Customer not found' });
    }

    // Fetch subscriptions with relevant statuses
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all', // Include all statuses (active, trialing, etc.)
    });

    // Find the first subscription that's active or trialing
    const subscription = subscriptions.data.find(sub => 
      ['active', 'trialing'].includes(sub.status)
    );

    if (!subscription) {
      return res.json({ success: false, message: 'No active or trialing subscription found' });
    }

    // Cancel the subscription at the end of the billing period or trial
    const canceledSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });
    console.log(canceledSubscription);

    // Update user in the database
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { canceled: true } },
      { new: true }
    );
    console.log(updatedUser);

    // Generate updated JWT token
    const token = jwt.sign(
      { email: updatedUser.email, subscription: updatedUser.subscription, canceled: updatedUser.canceled },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error('Error canceling subscription:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/renew-subscription', async (req, res) => {
  const email = req.body.email;

  try {
    const customerId = await getCustomerIdByEmail(email);

    if (!customerId) {
      return res.json({ success: false, message: 'Customer not found.' });
    }

    // Fetch all subscriptions for the customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'all', // Include all statuses
    });

    // Find the relevant subscription to renew
    const subscription = subscriptions.data.find(sub =>
      ['active', 'trialing', 'past_due', 'canceled'].includes(sub.status)
    );

    if (!subscription) {
      return res.json({ success: false, message: 'No subscription found to renew.' });
    }

    // Set cancel_at_period_end to false
    const renewedSubscription = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: false,
    });
    console.log('Renewed Subscription:', renewedSubscription);

    // Update user in the database
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { canceled: false } },
      { new: true }
    );
    console.log('Updated User:', updatedUser);

    // Generate updated JWT token
    const token = jwt.sign(
      { email: updatedUser.email, subscription: updatedUser.subscription, canceled: updatedUser.canceled },
      SECRET_KEY,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error('Error renewing subscription:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});


app.post('/desktop', async (req, res) => {
    const img = req.body.image;

    console.log("request received");

    const response = "Image was " + img;

    res.json({ response: response});
 
});


app.get("/version", (req, res) => {
  res.json({ version: "test" });
});

app.post('/feedback', async (req, res) => {
  const feedback = req.body;

  console.log("Feedback:");
  console.log(feedback)

  res.json({ success: true});

});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
