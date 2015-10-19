'use strict';

const express = require('express');
const ensureLoggedIn = require('connect-ensure-login').ensureLoggedIn();
const router = express.Router();
const _ = require('lodash');
const dotenv = require('dotenv');
const async = require("async");
const request = require('request');

dotenv.load();

/* GET user profile. */
router.get('/', ensureLoggedIn, function (req, res, next) {
    res.render('user', { user: req.user._json });
    });  

router.post('/linkUsers', ensureLoggedIn, function (req, res, next) {
    var user = req.user._json;
    if (user.email_verified) {
        var userApiUrl = 'https://' + process.env.AUTH0_DOMAIN + '/api/v2/users';
        var options = {
            url: userApiUrl,
            headers: {
                Authorization: 'Bearer ' + process.env.AUTH0_APIV2_TOKEN
            },
            qs: {
                search_engine: 'v2',
                q: 'email:"' + user.email + '" -user_id:"' + user.user_id + '"',
            }
        };
        
        //Get users with same email minus the current user id
        request(options, function (error, response, body) {
            if (error) return next(error);
            if (response.statusCode !== 200) return next(new Error(body));
            var targetUserList = JSON.parse(body);

            //atleast one user exists to link
            if (targetUserList.length > 0) {
                async.each(targetUserList, function (targetUser, callback) {
                    var aryTmp = targetUser.user_id.split('|');
                    var provider = aryTmp[0];
                    var targetUserId = aryTmp[1];
                    //using link a user api 
                    var options = {
                        url: userApiUrl + '/' + user.user_id + '/identities',
                        headers: {
                            Authorization: 'Bearer ' + process.env.AUTH0_APIV2_TOKEN
                        },
                        json: { provider: provider, user_id: targetUserId }
                    };
                    
                    request.post(options, function (error, response, body) {
                        if (error) callback(error);
                        if (response.statusCode !== 200) callback(new Error(body));
                        callback();
                    });
                }, function (err) {
                    if (err) next(err); 
                    else res.send("Linked accounts successfully");
                });
            }
            else
                res.send("Multiple accounts do not exist for your email id");
        });
    }
    else
        res.send("Your email id is not verified");
});

module.exports = router;