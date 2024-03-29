/*
 * Frontend Logic for the aplication
 *
 */

// Content for the frontend application
const app = {};

//  Config
app.config = {
  'sessionToken': false
}

// AJAX Client (for the restful API)
app.client = {};

// Interface for making API calls
app.client.request = function (headers, path, method, queryStringObject, payload, callback) {
  // Set defaults
  headers = typeof (headers) == 'object' && headers !== null ? headers : {};
  path = typeof (path) === 'string' ? path : '/';
  method = typeof (method) === 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof (queryStringObject) === 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof (payload) === 'object' && payload !== null ? payload : {};
  callback = typeof (callback) == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  let requestUrl = path + '?';
  let counter = 0;
  for (let queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // If at list one query string parameter has already been added, prepend new ones with an ampersand
      if (counter > 1) {
        requestUrl += '&'
      }
      // Add the key value
      requestUrl += `${queryKey}=${queryStringObject[queryKey]}`;
    }
  }
  // form the http request as a JSON Type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-Type", "application/json");

  // For each header sent, add it to the request
  for (let headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // If there is a current session tokent set, add that as a header
  if (app.config.sessionToken) {
    xhr.setRequestHeader("token", app.config.sessionToken.tokenId);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      let statusCode = xhr.status;
      let responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          let parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (e) {
          callback(statusCode, e);
        }
      }
    }
  }
  // Send the payload as JSON
  let payloadString = JSON.stringify(payload);
  xhr.send(payloadString);

};

// Bind the logout button
app.bindLogoutButton = function () {
  document.getElementById('logoutButton').addEventListener("click", function (e) {

    // Stop it from redirecting anywhere
    e.preventDefault();

    app.logUserOut();
  });
};

// Bind the pagination button
app.bindPaginationButtons = function () {

  let pgSizeButtons = document.getElementsByClassName('pgSize');
  if (pgSizeButtons.length > 0) {
    // Add listener to the click event
    for (let i = 0; i < pgSizeButtons.length; i++) {
      pgSizeButtons[i].addEventListener('click', e => {
        // Stop it from redirecting anywhere.
        e.preventDefault();

        // Store State
        localStorage.setItem('pagination', pgSizeButtons[i].innerHTML)
        // Re-render messages
        app.changePageSize(pgSizeButtons[i].innerHTML);


      });
    }
  }
};

// Bind the page number button
app.bindPageNumberButtons = function () {

  let pgNumButtons = document.getElementsByClassName('pageNum');

  if (pgNumButtons.length > 0) {
    // Add listener to the click event
    for (let i = 0; i < pgNumButtons.length; i++) {
      pgNumButtons[i].addEventListener('click', e => {
        // Stop it from redirecting anywhere.
        e.preventDefault();

        // Store State
        localStorage.setItem('page', pgNumButtons[i].innerHTML);
        app.changePageNumber(pgNumButtons[i].innerHTML);
      });
    }
  }
}

app.changePageSize = function (pagination) {
  let page = localStorage.getItem('page') ? localStorage.getItem('page') : false;
  app.loadMessagesList(pagination, page);
};

app.changePageNumber = function (page) {
  let pagination = localStorage.getItem('pagination') ? localStorage.getItem('pagination') : false;
  app.loadMessagesList(pagination, page);
};

// Log the user out then redirect them
app.logUserOut = function () {
  // Get the current token ide
  let tokenId = typeof (app.config.sessionToken.id) === 'string' ? app.config.sessionToken.id : false;

  // Send the corrent token to the tokens endpoint to delete it
  const queryStringObject = {
    tokenId
  };

  app.client.request(undefined, 'api/tokens', 'DELETE', queryStringObject, undefined, (statusCode, responsePayload) => {
    // Set the app.config token as false
    app.setSessionToken(false);

    // Send the user to the logged out page
    window.location = '/session/deleted';
  });
};

// Bind the forms
app.bindForms = function () {
  if (document.querySelector("form")) {

    const allForms = document.querySelectorAll("form");
    for (let i = 0; i < allForms.length; i++) {
      allForms[i].addEventListener("submit", function (e) {
        // Stop from submitting
        e.preventDefault();
        let formId = this.id;
        let path = this.action
        let method = this.method.toUpperCase();

        // Hide the error message (if it's currently shown due to a previous error);
        document.querySelector(`#${formId} .formError`).style.display = 'none';

        // Hide the success message
        if (document.querySelector(`#${formId} .formSuccess`)) {
          document.querySelector(`#${formId} .formSuccess`).style.display = 'none';
        }

        // Turn the inputs into a payload
        const payload = {};
        const elements = this.elements;
        for (let i = 0; i < elements.length; i++) {
          if (elements[i].type !== 'submit') {
            let valueOfElement = elements[i].type == 'checkbox' ? elements[i].checked : elements[i].value;
            if (elements[i].name == '_method') {
              method = valueOfElement;
            } else {
              payload[elements[i].name] = valueOfElement;
            }
          }
        }

        // Call the API
        app.client.request(undefined, path, method, undefined, payload, function (statusCode, responsePayload) {
          // Display an error on the form if needed
          if (statusCode !== 200) {

            if (statusCode == 403) {
              // Log the user out
              app.logUserOut();
            } else {
              const error = typeof (responsePayload.Error) == 'string' ? responsePayload.Error : 'An error has ocurred, please try again';

              // Set the formError field with the error text
              document.querySelector(`#${formId} .formError`).innerHTML = error;

              // Show (unhide) the form error field on the form
              document.querySelector(`#${formId} .formError`).style.display = 'block';
            }
          } else {
            // If succesful, send to form response processor
            app.formResponseProcessor(formId, payload, responsePayload);
          }

        });
      });
    }
  }
};

// Form response processor
app.formResponseProcessor = function (formId, requestPayload, responsePayload) {
  let functionToCall = false;
  if (formId == 'accountCreate') {
    // Take the phone and password, and use it to log the user in
    const newPayload = {
      'phone': requestPayload.phone,
      'password': requestPayload.password
    };

    app.client.request(undefined, 'api/tokens', 'POST', undefined, newPayload, function (newStatusCode, newResponsePayload) {
      // Display an error on the form if needed
      if (newStatusCode !== 200) {

        // Set the formError field with the error text
        document.querySelector(`#${formId} .formError`).innerHTML = 'Sorry, an error has ocurred. Please try again';

        // Show (unhide), the form error field on the form
        document.querySelector(`#${formId} .formError`).style.display = 'block';

      } else {
        app.setSessionToken(newResponsePayload);
        window.location = '/messages/all'
      }
    });
  }

  // If login was succesful, set the token in localStorage and redirect the user
  if (formId == 'sessionCreate') {
    app.setSessionToken(responsePayload);
    window.location = '/messages/all';
  }

  let formsWithSuccessMessages = ['accountEdit1', 'accountEdit2'];
  if (formsWithSuccessMessages.indexOf(formId) > -1) {
    document.querySelector(`#${formId} .formSuccess`).style.display = 'block';
  }

  if (formId == 'messagesCreate') {
    window.location = 'messages/all';
  }

};

// Get the session token from localstorage and set it in the app.config object
app.getSessionToken = function () {
  let tokenString = localStorage.getItem('token');
  if (typeof (tokenString) == 'string') {
    try {
      let token = JSON.parse(tokenString);
      app.config.sessionToken = token;
      if (typeof (token) == 'object') {
        app.setLoggedInClass(true);
      } else {
        app.setLoggedInClass(false);
      }
    } catch (e) {
      app.config.sessionToken = false;
      app.setLoggedInClass(false);
    }
  }
}

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function (add) {
  let target = document.querySelector("body");

  if (add) {
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn')
  }
}

// Set the session token in the app.config object as well as localstorage
app.setSessionToken = function (token) {
  app.config.sessionToken = token;
  let tokenString = JSON.stringify(token);
  localStorage.setItem('token', tokenString);
  if (typeof (token) == 'object') {
    app.setLoggedInClass(true);
  } else {
    app.setLoggedInClass(false);
  }
};

// Renew the token
app.renewToken = function (callback) {
  const currentToken = typeof (app.config.sessionToken) === 'object' ? app.config.sessionToken : false;
  if (currentToken) {
    // Update the token with a new expiration
    const payload = {
      'tokenId': currentToken.tokenId,
      'extend': true
    };


    app.client.request(undefined, 'api/tokens', 'PUT', undefined, payload, (statusCode, responsePayload) => {
      // Display an error on the form if needed
      if (statusCode === 200) {
        // Get the new token details
        let queryStringObject = { 'tokenId': currentToken.tokenId };
        app.client.request(undefined, 'api/tokens', 'GET', queryStringObject, undefined, statusCode, responsePayload => {
          // Display an error on the form if needed
          if (statusCode === 200) {
            app.setSessionToken(responsePayload);
          } else {
            app.setSessionToken(false);
            callback(true);
          }
        });
      } else {
        app.setSessionToken(false);
        callback(true);
      }
    });

  } else {
    app.setSessionToken(false);
    callback(true);
  }
};

// Load data on the page
app.loadDataOnPage = function () {
  // Get the curren page from the body class
  let bodyClasses = document.querySelector("body").classList;
  let primaryClass = typeof (bodyClasses[0]) == 'string' ? bodyClasses[0] : false;
  // Logic for account settings page
  if (primaryClass == 'accountEdit') {
    app.loadAccountEditPage();
  }

  if (primaryClass == 'messagesCreate') {
    app.loadMessageCreatePage();
  }

  if (primaryClass == 'messagesList') {
    let pagination = localStorage.getItem('pagination') ? localStorage.getItem('pagination') : false;
    let pageNumber = localStorage.getItem('pageNumber') ? localStorage.getItem('pageNumber') : false;
    app.loadMessagesListPage(pagination, pageNumber);

  }
};

// Load the account edit page specifically
app.loadAccountEditPage = function () {
  // Get the phone number from the current token, or log the user out if none is there
  let phone = typeof (app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;
  if (phone) {
    // Fetch the user data

    var queryStringObject = {
      'phone': phone
    };

    app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {

      if (statusCode == 200) {
        // Put the data into the forms as values where needed
        document.querySelector(`#accountEdit1 .firstNameInput`).value = responsePayload.firstName;
        document.querySelector(`#accountEdit1 .lastNameInput`).value = responsePayload.lastName;
        document.querySelector(`#accountEdit1 .displayPhoneInput`).value = responsePayload.phone;

        // Put the hidden phone fiel into both forms
        let hiddenPhoneInputs = document.querySelectorAll("input.hiddenPhoneNumberInput");
        for (let i = 0; i < hiddenPhoneInputs.length; i++) {
          hiddenPhoneInputs[i].value = responsePayload.phone;
        }

      } else {
        // If the request comes back as something other than 200, log the user out
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }

};

// Load the message create page specifically
app.loadMessageCreatePage = function () {
  // Get the phone number from the current token, or log the user out if none is there
  let phone = typeof (app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;
  if (phone) {
    // Fetch the user data

    var queryStringObject = {
      'phone': phone
    };

    app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, (statusCode, responsePayload) => {

      if (statusCode == 200) {
        // Put the hidden phone field into form
        document.querySelector(`input.hiddenPhoneNumberInput`).value = responsePayload.phone;


      } else {
        // If the request comes back as something other than 200, log the user out
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }

};

// Load the data for Dashboard loading
app.loadMessagesListPage = function () {
  app.loadMessagesList();
};


// Render the messages list
app.loadMessagesList = function (pagination, page) {
  console.log(page)
  // Get the phone number from the current token, or log the user out if none is there
  let phone = typeof(app.config.sessionToken.phone) == 'string' ? app.config.sessionToken.phone : false;
  pagination = typeof(pagination) == 'string' ? parseInt(pagination) : false;
  page = typeof(page) == 'string' ? page : false;
  if (phone) {

    let payload = {
      'getAll': true,
      phone,
      pagination,
      page
    };
    console.log(payload)
    // Accessing template element
    let messagesContainter = document.querySelector('#messagesContainer');
    let messageTemplate = document.querySelector("#messageTemplate");
    let paginationContainer = document.querySelector(".paginationLinks");
    let paginationTemplate = document.querySelector(".pagTemplate");


    app.client.request(undefined, 'api/messages', 'POST', undefined, payload, (statusCode, responsePayload) => {

      if (statusCode == 200) {

        let allMessages = typeof (responsePayload.messages) == 'object' && responsePayload.messages instanceof Array && responsePayload.messages.length > 0 ? responsePayload.messages : [];
        let numPages = typeof (responsePayload.numPages) == 'number' && responsePayload.numPages > 0 ? responsePayload.numPages : 1;
        if (allMessages.length > 0) {

          // Remove existing list of messages to re render paginated messages
          while (messagesContainter.firstChild) {
            messagesContainter.removeChild(messagesContainter.firstChild);
          }

          // Remove existing list of messages to re render paginated messages
          while (paginationContainer.firstChild) {
            paginationContainer.removeChild(paginationContainer.firstChild);
          }

          // Create pagination
          for (let i = 1; i <= numPages; i++) {
            // Access template
            let clonedTemplate = paginationTemplate.content.cloneNode(true);
            let pagNumber = clonedTemplate.querySelector('.pageNum');
            // Assign template value
            pagNumber.innerText = parseInt(i);
            // Append cloned fragment to the DOM
            paginationContainer.appendChild(clonedTemplate);

          }

          // Create messages
          let messagesArray = responsePayload.messages;
          messagesArray.forEach(message => {
            // Access template
            let clonedTemplate = messageTemplate.content.cloneNode(true);
            let msgName = clonedTemplate.querySelector('#msgName')
            let msgDate = clonedTemplate.querySelector('#msgDate');
            let msgTitle = clonedTemplate.querySelector('#msgTitle');
            let msgContent = clonedTemplate.querySelector("#msgContent");
            // Assign template value
            msgName.innerHTML = message.phone;
            msgDate.innerHTML = message.creationDate;
            msgTitle.innerHTML = message.title;
            msgContent.innerHTML = message.content;
            // Append cloned fragment to the DOM
            messagesContainter.appendChild(clonedTemplate);
          });
        } else {
          console.log(responsePayload)
        }
        app.bindPageNumberButtons();
      } else {
        console.log(statusCode)
        // If the request comes back as something other than 200, log the user out
        app.logUserOut();
      }
    });
  } else {
    app.logUserOut();
  }

};

app.tokenRenewalLoop = function () {
  setInterval(function () {
    app.renewToken(err => {
      if (!err) {
        console.log(`Token renewed succesfully @${Date.now()}`);
      }
    });
  }, 1000 * 60)
};

// Init (bootstrapping)
app.init = function () {
  // Bind all form submissions
  app.bindForms();

  // Bind logout button
  app.bindLogoutButton();
  app.bindPaginationButtons();
  

  // Get the token from localstorage
  app.getSessionToken();

  // Renew token
  app.tokenRenewalLoop();

  // Load data on page
  app.loadDataOnPage();
};

// Call the init processes after the window loads
window.onload = function () {
  app.init();
}