# Chardjinn project at digital product school

This repository generates a basic chatbot with interaction via facebook messenger. In the following lines the steps how the responses are generated are described:

The input from the user can either be text or tapping a short response button or a command.

## 1. Analysing the message

###### 1.1 Commands

In the case the message is a command e.g. "#reset" it's action is performed.

###### 1.2 Short response buttons

In the case the user responded via short response button the information from this button is received.

###### 1.3 Text response

In the case the user responds with normal text the message is analysed, intents are detected and keywords extracted. For these tasks wit.ai is used.

## 2. Contextualization & message memory

In the next step the contextualization is done. Therefore the information from the short response buttons or the detected intents and keywords are sended to the message memory, which stores information about the previour interactions.

## 3. Responses database

Then the message memory queries the responses database for fitting responses and outputs text, short response buttons for further interactions and attachments like images. For this database firebase is used.

## 4. Learning from the user (not implemented yet)

In a next step a feedback loop for the user should be implemented. There are three possible scenarios where this is very important:

###### 4.1 intents are not detected.

###### 4.2 keywords are not detected.

###### 4.3 responses are not accurate.

This can be done by displaying the user the most likely responses as clickable buttons, determining thresholds for good responses and implementing a simple rating system for the responses. In this way the chatbot can be trained by the user.

![What is this](information-procress.png)

To build a working chatbot all the credentials must be filled in and a webhook from a Facebook page at developers.facebook.com must be created. This article can help: https://medium.com/crowdbotics/how-to-create-your-very-own-facebook-messenger-bot-with-dialogflow-and-node-js-in-just-one-day-f5f2f5792be5
