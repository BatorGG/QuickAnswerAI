const baseURL = window.location.origin;

const checkoutBtn = document.getElementById('checkout-button');
if (checkoutBtn) {
  checkoutBtn.addEventListener('click', function () {
    const token = localStorage.getItem('jwt');
    const decodedToken = decodeJWT(token);
    const email = decodedToken.email
    
    fetch('/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ 
        email: email,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => response.json())
    .then(session => {
      // Redirect to Stripe Checkout
      window.location.href = session.url;
    })
    .catch(error => console.error('Error:', error));
});
}

const loginBtn = document.getElementById("login");
if (loginBtn) {
  loginBtn.addEventListener('click', () => {

    loginBtn.innerText = "Please wait..."
  
    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;

  
    fetch(baseURL + '/login', {
      method: 'POST',
      body: JSON.stringify({ 
        email: email,
        password: password
      }),
      headers: { 'Content-Type': 'application/json' }
    }).then(response => response.json())
      .then((data) => {
        console.log('Success:', data)

          if (data.success) {
            const token = data.token;
            // Store the token in chrome.storage
            localStorage.setItem('jwt', token);
            window.location.href = baseURL + "/dashboard";
          }
          else {
            document.getElementById("error-message").innerText = data.message;
            loginBtn.innerText = "Login"
          }
          
      })
      .catch(error => console.error('Error:', error));
  
});
} 

const registerBtn = document.getElementById("register");
if (registerBtn) {
  registerBtn.addEventListener('click', () => {

    const email = document.getElementById("username").value;
    const password = document.getElementById("password").value;
    const passwordAgain = document.getElementById("passwordAgain").value;
    const errorMessage = document.getElementById("error-message")

    if (!validateEmail(email)) {
      errorMessage.innerText = "Invalid email address"
    }
    else if (password.length < 5) {
      errorMessage.innerText = "Password too short"
    }
    else if (password != passwordAgain) {
      errorMessage.innerText = "Passwords must match"
    }
    else {

      registerBtn.innerText = "Please wait..."
  
      fetch(baseURL + "/register", {
        method: 'POST',
        body: JSON.stringify({ 
          email: email,
          password: password
        }),
        headers: { 'Content-Type': 'application/json' }
      }).then(response => response.json())
        .then((data) => {
          console.log('Success:', data)
            
            if (data.success) {
              // Store the token in chrome.storage
              const token = data.token;
              localStorage.setItem('jwt', token);
              window.location.href = baseURL + "/dashboard";
            }
            else {
              errorMessage.innerText = data.message;
              registerBtn.innerText = "Register"
            }
            
        })
        .catch(error => console.error('Error:', error));
    }
  
  });
  
}

const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
  console.log("logoutbtn");
  console.log(logoutBtn)
  logoutBtn.addEventListener('click', (e) => {
    console.log(e);
    console.log("clicked");
      localStorage.removeItem('jwt');
      window.location.href = baseURL;
      
      console.log(window.location.href);
  });
}

  
function decodeJWT(token) {
    if (!token) return null;
    const payloadBase64 = token.split('.')[1];
    const decodedPayload = JSON.parse(atob(payloadBase64)); // Decodes the token
    return decodedPayload;
}

const checkBtn = document.getElementById("check");
if (checkBtn) {
  checkBtn.addEventListener('click', () => {
    const token = localStorage.getItem('jwt');
    const decodedToken = decodeJWT(token);
    const email = decodedToken.email

    fetch(baseURL + '/check-subscription', {
        method: 'POST',
        body: JSON.stringify({ 
          email: email
        }),
        headers: { 'Content-Type': 'application/json' }
      }).then(response => response.json())
        .then((data) => {
          console.log('Success:', data)
        })
        .catch(error => console.error('Error:', error));
});
}

document.addEventListener("DOMContentLoaded", (event) => {
  console.log("conent loaded");
  if (window.location.href == baseURL + "/dashboard") {
    updateDashboard();
  }
  else {
    console.log(window.location.href);
  }
})

const cancelBtn = document.getElementById("cancel-subscription");
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    const token = localStorage.getItem('jwt');
    const decodedToken = decodeJWT(token);
    const email = decodedToken.email;

    fetch(baseURL + '/cancel-subscription', {
      method: 'POST',
      body: JSON.stringify({ 
        email: email
      }),
      headers: { 'Content-Type': 'application/json' }
    }).then(response => response.json())
      .then((data) => {
        console.log('Success:', data)
        if (data.success) {
          document.getElementById("cancel-response").innerText = "Success! Your subscription will be canceled at the end of the period."
        }
      })
      .catch(error => console.error('Error:', error));
  });
}

function goToLogin() {
  window.location.href = baseURL + "/login";
}

function goToRegister() {
  window.location.href = baseURL + "/register";
}

function updateDashboard() {
  const token = localStorage.getItem('jwt');
  const decodedToken = decodeJWT(token);

  if (decodedToken) {
    const email = decodedToken.email
    const dashboard = document.getElementsByClassName("dashboard")[0];
    document.getElementById("showemail").innerText = "Welcome " + email;

    if (decodedToken.subscription) {
      document.getElementById("plan-select").classList.add("hidden");
      document.getElementById("hasSubscription").classList.remove("hidden");
    }
    else {
      document.getElementById("plan-select").classList.remove("hidden");
      document.getElementById("hasSubscription").classList.add("hidden");
    }
  }
 
}

function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
