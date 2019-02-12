'use strict';
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const User = require('../models/user');


/* POST/CREATE user on /api/users */
router.post('/', (req, res, next) => {

  console.log('here')
  const requiredFields = ['username', 'password'];
  const missingField = requiredFields.find(field => !(field in req.body));
        
  if (missingField) {
    const err = new Error(`missing '${missingField}' in request body`);
    err.status = 422;
    return next(err);
  }

  const stringFields = ['username', 'password', 'firstName', 'lastName'];
  const nonStringField = stringFields.find(
    field => field in req.body && typeof req.body[field] !== 'string');
        
  if (nonStringField) {
    const err = new Error(`'${nonStringField}' must be a string`);
    err.status = 422;
    return next(err);
  }

  // Validate username and password have no whitespace
  const explicityTrimmedFields = ['username', 'password'];
  const nonTrimmedField = explicityTrimmedFields.find(
    field => {
      return req.body[field].trim() !== req.body[field];
    }
  );
          
  if (nonTrimmedField) {
    const err = new Error(`'${nonTrimmedField}' cannot have white space.`);
    err.status = 422;
    return next(err);
  }

  // Validate lengths of username and password
  const sizedFields = {
    username: {
      min: 1
    },
    password: {
      min: 10,
      max: 72
    }
  };
        
  const tooSmallField = Object.keys(sizedFields).find(field => 
    'min' in sizedFields[field] && 
            req.body[field].trim().length < sizedFields[field].min);
        
  const tooLargeField = Object.keys(sizedFields).find(field => 
    'max' in sizedFields[field] &&
              req.body[field].trim().length > sizedFields[field].max
  );
        
  if (tooSmallField) {
    const min = sizedFields[tooSmallField].min;
    const err = new Error(`Field: '${tooSmallField}' must be at least ${min} characters long`);
    err.status = 422;
    return next(err);
  }
        
  if (tooLargeField) {
    const max = sizedFields[tooLargeField].max;
    const err = new Error(`Field: '${tooLargeField}' must be at most ${max} characters long`);
    err.status = 422;
    return next(err);
  }

  let { username, password, name} = req.body;

  if (name) {
    name = name.trim();
  }

  console.log(username, password, name)
  return User.hashPassword(password)
    .then(digest => {
      console.log('digest', digest)
      const newUser = {
        username,
        password: digest,
      }
      return User.create(newUser);
    })
    .then(user => {
      console.log('user',)
      return res.status(201).json(user.serialize());
    })
    .catch( err => {
      if(err.code === 11000 ) { //11000 is a mongo error code that checks for duplicate username
        err = new Error('The username already exists');
        err.status = 422;
        err.location = 'username';
        err.reason = 'ValidationError';

        return Promise.reject(err);
      }
      next(err);
    });
});

//DELETE WHEN IT COMES TO PRODUCTION TIME!!!!!!!!!!!
router.get('/', (req, res) => {
  return User.find()
    .then(users => res.json(users.map(user => user.serialize())))
    .catch(err => res.status(500).json({message: 'Internal server error'}));
});


module.exports = router;