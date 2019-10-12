const express = require('express');
const bodyParser = require('body-parser');
const graphqlHttp = require('express-graphql');
const {buildSchema} = require('graphql');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Event = require('./models/event');
const User = require('./models/user');

const dBUrl = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@cluster0-wuxiw.mongodb.net/${process.env.MONGO_DB}?retryWrites=true&w=majority`;



const app = express();

app.use(bodyParser.json());

app.use('/graphql', graphqlHttp({

     schema: buildSchema(`

        type Event {
            _id: ID!
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        type User {
            _id: ID!
            email: String!
            password: String
        }

        input EventInput {
            title: String!
            description: String!
            price: Float!
            date: String!
        }

        input UserInput {
            email: String!
            password: String!
        }

        type RootQuery{
            events: [Event!]!
        }

        type RootMutation{
            createEvent(eventInput: EventInput): Event
            createUser(userInput: UserInput): User
        }
        schema{
            query: RootQuery
            mutation: RootMutation  
        }
     `),
     rootValue: {
         events: ()=>{
             return Event.find()
              .then(events => {
                  return events.map(event => {
                      return {...event._doc,date: event._doc.date.toString(), _id: event._doc._id.toString()}
                      
                  })
              })
              .catch(err => {
                throw err;
              })
         },
         createEvent: (args)=>{
            const event = new Event({
                title: args.eventInput.title,
                description: args.eventInput.description,
                price: +args.eventInput.price, // + is to number or Float , Ex: const a = '123'; console.log(typeof(+a));
                date: new Date(args.eventInput.date),
                creator: '5da1cefd41fd3405db9c0f2c' 
            });
            let createdEvent;
           return event
            .save()
            .then(result => { 
                createdEvent = {...result._doc, _id: event._doc._id.toString()};
                return User.findById('5da1cefd41fd3405db9c0f2c');
            })
            .then(user => {
                if (!user){
                    throw new Error('User not found.')
                }
                user.createdEvents.push(event); // you cand pash event.id or only event, it will take id of event automaclly 
                return user.save();   
            })
            .then(result => {
                return createdEvent;
            })
            .catch(err => {
                 console.log(err);
                 throw err;
                 
                 
            });

            
        },
        createUser: args => {
           return User.findOne({email:args.userInput.email})
                .then(user => {
                if (user){
                    throw new Error('User exists already.')
                }
                return bcrypt.hash(args.userInput.password, 12)
                 })
                .then(hashedPassword => {
                    const user = new User({
                        email: args.userInput.email,
                        password: hashedPassword
                    });
                    return user.save(); // save to db
                })
                .then(result => {
                    return {...result._doc, password: null, _id: result.id}; // here is only reutrn to GraphQL not change anything in DB or return anything from db
                })
                .catch(err => {
                    throw err;
                });
            
        }
     },
     graphiql:true

}));

mongoose.connect(dBUrl, { useNewUrlParser: true, useUnifiedTopology: true})
    .then(() => {
        app.listen(3000);
        console.log('you connected to DB and running on 3000 ');})
    .catch(err => {
        console.log(err);
});
 




