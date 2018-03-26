//MARK: ---------------- Initialize app and set Listeners -------------------

const admin = require('firebase-admin');
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request');
const app = express()
//const port = 3000


const {
  queryWit,
  firstEntity,
} = require('./shared');

var serviceAccount = require('./xxx-firebase-adminsdk-xxx.json'); //TODO: A valid firebase credentials file must be added.

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://xxx.firebaseio.com" //TODO: A valid firebase database URL must be added.
});
// Get the database
const db = admin.firestore();
var ref = admin.app().database().ref();
var refAssistantResponses = db.collection('AssistantResponses');

const PAGE_ACCESS_TOKEN = "xxx" //TODO: A valid facebook access token must be added
app.use(bodyParser.urlencoded({
    extended: true
}))
app.use(bodyParser.json())


app.get('/', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'verify_token') {
    console.log("token verified");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
})

app.get('/privacy', (req, res) => {
  //Show privacy stuff
  res.status(200).send("Facebook-Connect - Wir bieten Ihnen die Möglichkeit sich für unseren Dienst mit Facebook-Connect anzumelden. Eine zusätzliche Registrierung ist somit nicht möglich. Zur Anmeldung werden Sie auf die Seite von Facebook weitergeleitet, wo Sie sich mit ihren Nutzungsdaten anmelden können. Hierdurch werden ihre Facebook-Profil und unser Dienst verknüpft. Dadurch erhalten wir Einsicht auf die Informationen Ihres öffentlichen Profils. Diese Informationen werden anonymisiert und statistisch ausgewertet unseren Geschäftskunden zur Verfügung gestellt. Weitere Informationen zu Facebook-Connect und den Privatsphäre-Einstellungen entnehmen Sie bitte den Datenschutzhinweisen und den Nutzungsbedingungen der Facebook Inc.");
})

app.get('/challengedone', (req, res) => {
  //Show privacy stuff
  res.status(200).send("Task done");
  try{
  console.log("Request: "+req.query["sender"]);
  console.log("Request: "+req.query["challenge"]);

  var senderId = req.query["sender"];
  var challengeId = req.query["challenge"];

  if(challengeId && senderId){
    //Do some stuff
    var query = db.collection("Challenges").doc(challengeId).get().then(snapshot => {
          var intent = snapshot.data()["intent"];
          console.log("Open intent: "+intent);

          createRespond(senderId, "", intent);
      })
      .catch(err => {
          console.log('Error getting challenge intent', err);

      });
  }

}catch(err) {
    console.log('Error with challenge done url', err);
}
})

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});


app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'verify_token') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

/* Handling all messenges */
app.post('/', (req, res) => {
  console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});






//MARK: ---------------- handle Message -------------------

function sendMessage(event) {

  let sender = event.sender.id;
  let text = event.message.text;
  var payload = "";

  if(typeof event.message.quick_reply !== 'undefined' && typeof event.message.quick_reply.payload !== 'undefined'){
    //Do something
    payload = event.message.quick_reply.payload;
    console.log("Response payload: " + payload);
}


  console.log("Response text: " + text);


  analyseMessage(sender, text, payload);
}







function analyseMessage(sender, message, payload){



  if (payload === ""){
    console.log("Analyse no payload");
    //First get getUsersContext
    getUsersContext(sender).then(function (context) {
      //Preprocessing must be done to get Name and other stuff out of answer
      //--> If chatbot asks something

      if(message === "#reset"){
        context = undefined;
      }

      if(context){
        console.log("Analyse with context: "+context);

      //Here intent-recognition
      askWit(message).then(function (witResponse) {
        console.log("Analyse after asking wit");
        if(witResponse.intent){
          switch (witResponse.intent) {
            case "user_name":
              if(witResponse.task){
                //TODO: Got intent and task -> do intent
                db.collection("Users").doc(sender).set({name: witResponse.task}, { merge: true }).then(ref => {
                  if (context === "firstMessage" ){
                    setUsersContext("2Message");
                    createRespond(sender, message, "2Message");
                  }else{
                    doNormalRespond(sender, "Hallo "+witResponse.task+".");
                  }


                });



              }else{
                //TODO: Only got intent -> ask for task, then do intent
                doNormalRespond(sender, "Hmmm... was soll ich da drauf antworten?");
              }

              break;
            default:
            doNormalRespond(sender, "Hmmm... was soll ich da drauf antworten?")
              break;
          }

        }else{

          if(witResponse.task){
            //TODO: Got intent and task -> do intent
            db.collection("Users").doc(sender).set({name: witResponse.task}, { merge: true });

            if (context === "firstMessage" ){
              setUsersContext("2Message");
              createRespond(sender, message, "2Message");
            }else{
              doNormalRespond(sender, "Hallo "+witResponse.task+".");
            }


            //TODO: Got only task -> wit learning -> ask for intent -> then do it

          }else{
            //TODO: Got nothing -> Do random answer
            doNormalRespond(sender, "Hmmm... was soll ich da drauf antworten?");

          }
        }

      }).catch(function (error) {
        console.log("Wit error: "+error);
      });


    }else{
      console.log("Analyse no context yet");
      //No context yet
      setUsersContext("firstMessage");
      createRespond(sender, message, "firstMessage");

    }

    }).catch(function (error) {
      console.log("Error getting context: "+error);
      setUsersContext("firstMessage");
      createRespond(sender, message, "firstMessage");
    });


  }else{
    console.log("Payload was detected");
  //Payload was detected

  //Set current context
  setUsersContext(payload);
  createRespond(sender, message, payload);

}



function setUsersContext(context){
  var userRef = db.collection('Users').doc(sender);

  var setWithOptions = userRef.set({
      context: context
    }, { merge: true });

  }
}

//var context = "";

function createRespond(sender, message, payload){

  var query = refAssistantResponses.where('intent', '==', payload).get()//doc(payload).get()//
    .then(snapshot => {
      //console.log("snapshot: "+snapshot);
        snapshot.forEach(doc => {
            console.log(doc.id, '=>', doc.data());
            console.log(doc.data().message);
            doUniversalRespond(sender, doc.id, doc.data())
        });
        /*
        doUniversalRespond(sender, payload, snapshot.data())
        */
    })
    .catch(err => {
        console.log('Error getting documents', err);
    });


}




function askWit(message){
  console.log("Wit function");
  return new Promise(function(resolve,reject) {

    //Here intent-recognition


    queryWit(message).then(({entities}) => {
      console.log("Entities: "+JSON.stringify(entities));

      const intent = firstEntity(entities, 'intent');
      const task = firstEntity(entities, 'contact');
      //const dateTime = firstEntity(entities, 'datetime') || {};

      var output = {};

      if(intent){
        output["intent"] = intent.value
      }
      if(task){
        output["task"] = task.value
      }

      resolve(output);
    }).catch(err => {
        console.log('Error asking wit', err);
        reject();
    });


  });
}

function getUsersContext(sender){
  return new Promise(function(resolve,reject) {

    var query = db.collection("Users").doc(sender).get().then(snapshot => {
          /*snapshot.forEach(doc => {
              console.log('Group id:',doc.id, '=>', doc.data());
              resolve(doc.id);
          });*/
          console.log('Doc id:',snapshot.id, '=>', snapshot.data());
          resolve(snapshot.data()["context"]);
      })
      .catch(err => {
          console.log('Error getting documents', err);
          reject();
      });


});
}



//MARK: ---------------- Create Facebook Response -------------------

function doNormalRespond(sender, message){
  request({
    url: 'https://graph.facebook.com/v2.6/me/messages',
    qs: {access_token: PAGE_ACCESS_TOKEN},
    method: 'POST',
    json: {
      recipient: {id: sender},
      message: {text: message}
    }
  }, function (error, response) {
    if (error) {
        console.log('Error sending message: ', error);
    } else if (response.body.error) {
        console.log('Error: ', response.body.error);
    }
  });
}

function doUniversalRespond(sender, id, answer){

  var shortResponsesJsonArray = []
  if (answer.shortResponses) {
      answer.shortResponses.forEach(function(item)
      {
          var jsonData = {};
          jsonData["content_type"] = "text";
          jsonData["title"] = item.title;
          jsonData["payload"] = item.payload;
          shortResponsesJsonArray.push(jsonData);
      });
    }

      if (answer.message){
        //Normal Respond
        getMessageWithVariables(sender, answer.message).then(function (finalMessage) {
          var message = {};

          //Check message if variable is included \()
          message["text"] = finalMessage;

          if (shortResponsesJsonArray.length > 0) {
          message["quick_replies"] =  shortResponsesJsonArray

        }

          request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: PAGE_ACCESS_TOKEN},
            method: 'POST',
            json: {
              recipient: {id: sender},
              message: message
          }
        }, function (error, response) {
        if (error) {
            console.log('Error sending message: ', error);
        } else if (response.body.error) {
            console.log('Error: ', response.body.error);
        }else{
          console.log("No error sending the message");
          //Check if other message should be sender
          checkForAutoResponse(sender, answer);
        }
      });


    }).catch(function (error) {
                    console.log("Error getting message with variable: "+error);
                  });


  }else{
    //Respond with attachment
    var query = refAssistantResponses.doc(id).collection("attachments").get()
      .then(snapshot => {
        //console.log("snapshot2: "+snapshot+refAssistantResponses.doc(id).collection("shortResponses"));
          snapshot.forEach(doc => {
              console.log(doc.id, '=>', doc.data());

          });
          respondWithAttachment(sender, snapshot, shortResponsesJsonArray, answer);
      })
      .catch(err => {
          console.log('Error getting documents', err);
      });
  }
}

function respondWithAttachment(sender, answer, shortResponses, basicResponse){


          var attachmentJsonArray = []
              answer.forEach(function(itemData)
              {
                var item = itemData.data()

                  var attachmentJsonData = {};
                  attachmentJsonData["title"] = item.title;
                  attachmentJsonData["subtitle"] = item.subtitle;
                  attachmentJsonData["image_url"] = item.imageUrl;

                  if(item.url){
                  var default_action = {};
                  default_action["type"] = "web_url";
                  default_action["url"] = item.url;
                  default_action["messenger_extensions"] = false;
                  default_action["webview_height_ratio"] = "tall";
                  //default_action["fallback_url"] = item.url;

                  attachmentJsonData["default_action"] = default_action;
                }

                  if (item.buttons !== null && item.buttons !== undefined){
                  var buttonsJsonArray = []
                      item.buttons.forEach(function(buttonItem)
                      {
                        var buttonJsonObject = {};
                        buttonJsonObject["type"] = "web_url";
                        buttonJsonObject["url"] = buttonItem.url;
                        buttonJsonObject["title"] = buttonItem.title

                        buttonsJsonArray.push(buttonJsonObject);
                      });
                      if (buttonsJsonArray.length > 0){

                  attachmentJsonData["buttons"] = buttonsJsonArray;
                }
                }


                  attachmentJsonArray.push(attachmentJsonData);
              });


              var message = {};

              var attachment = {};
              attachment["type"] = "template";

              var payload = {};
              payload["template_type"] = "generic";
              payload["elements"] = attachmentJsonArray;

              attachment["payload"] = payload;

              message["attachment"] = attachment;

              if (shortResponses.length > 0) {
              message["quick_replies"] =  shortResponses;
              console.log("quick_replies added.")
            }

          request({
            url: 'https://graph.facebook.com/v2.6/me/messages',
            qs: {access_token: PAGE_ACCESS_TOKEN},
            method: 'POST',
            json: {
              recipient: {id: sender},
              message: message
        }
        }, function (error, response) {
            if (error) {
                console.log('Error sending message: ', error);
            } else if (response.body.error) {
                console.log('Error: ', response.body.error);
            }else{
              console.log("No error sending the message");
              //Check if other message should be sender
              checkForAutoResponse(sender, basicResponse);
            }
          });


}

function checkForAutoResponse(sender, answer){
  setTimeout(function (){

  // Something you want delayed.
  console.log("Check for auto response: "+answer.autoResponse);
  if(answer.autoResponse){
    createRespond(sender, "", answer.autoResponse);
  }

}, 3000);

}

function getMessageWithVariables(sender, message){
  return new Promise(function(resolve,reject) {

  var substring1 = "\(";
  var substring2 = "\)"
  var index1 = message.indexOf(substring1);
  var index2 = message.indexOf(substring2);

  if(index1 !== -1 && index2 !==-1){
    var variable = message.substring(index1+1, index2-1);
    var textArray = variable.split(".");
    console.log(textArray[0]);
    console.log(textArray);

    var query = db.collection(textArray[0]).doc(sender).get().then(snapshot => {
          /*snapshot.forEach(doc => {
              console.log('Group id:',doc.id, '=>', doc.data());
              resolve(doc.id);
          });*/
          console.log('User id:',snapshot.id, '=>', snapshot.data());
          //message.split("\(")[0]
          resolve(message.substring(0, index1-1)  + snapshot.data()[textArray[1]] + message.split("\)")[1]);
      })
      .catch(err => {
          console.log('Error getting documents', err);
          reject();
      });
  }else{
    resolve(message);
  }

});
}
