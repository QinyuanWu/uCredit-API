//TODO:
//process user attribute
require("dotenv").config();
const express = require("express");
const passport = require("passport");
const saml = require("passport-saml");
const session = require("express-session");
const bodyParser = require("body-parser");

const { returnData, errorHandler } = require("./helperMethods.js");
const users = require("../model/User.js");
//const fs = require("fs");
//const path = require("path");

const router = express.Router();

const secret = process.env.SESSION_SECRET;
const PbK = process.env.PUBLIC_KEY;
const PvK = process.env.PRIVATE_KEY;

const JHU_SSO_URL = "https://idp.jh.edu/idp/profile/SAML2/Redirect/SSO";
const SP_NAME = "https://ucredit-api.herokuapp.com";
const BASE_URL = "https://ucredit-api.herokuapp.com";

const displayName = "urn:oid:2.16.840.1.113730.3.1.241";
const grade = "user_field_job_title";
const email = "email";
const school = "urn:oid:1.3.6.1.4.1.5923.1.1.1.4";
const affiliation = "user_field_affiliation";
const JHEDid = "uid";

// Setup SAML strategy
const samlStrategy = new saml.Strategy(
  {
    // config options here
    entryPoint: JHU_SSO_URL,
    issuer: SP_NAME,
    callbackUrl: `${BASE_URL}/api/login/callback`,
    decryptionPvk: PvK,
    privateCert: PvK,
  },
  (profile, done) => {
    return done(null, profile);
  }
);

// Tell passport to use the samlStrategy
passport.use("samlStrategy", samlStrategy);

// Serialize and deserialize user for paqssport
passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (user, done) {
  done(null, user);
});

// Middleware
router.use(bodyParser.urlencoded({ extended: false }));
router.use(session({ secret: secret, resave: false, saveUninitialized: true }));
router.use(passport.initialize({}));
router.use(passport.session({}));

// login route
router.get(
  "/api/login",
  (req, res, next) => {
    next();
  },
  passport.authenticate("samlStrategy")
);

// callback route, return user object
router.post(
  "/api/login/callback",
  (req, res, next) => {
    next();
  },
  passport.authenticate("samlStrategy"),
  async (req, res) => {
    // the user data is in req.user
    const id = req.user[JHEDid];
    let user = await users.findById(id).exec();
    if (user === null) {
      user = {
        _id: id,
        name: req.user[displayName],
        email: req.user[email],
        affiliation: req.user[affiliation],
        grade: req.user[grade],
        school: req.user[school],
      };
      users
        .create(user)
        .then((user) => returnData(user, res))
        .catch((err) => errorHandler(res, 400, err));
    } else {
      returnData(user, res);
    }
    /*
    res.send(
      `welcome ${req.user[displayName]}, JHED id: ${req.user[JHEDid]}, affiliation: ${req.user[affiliation]}, school: ${req.user[school]}, year: ${req.user[grade]}, email: ${req.user[email]}`
    );
    */
  }
);

// route to metadata
router.get("/api/metadata", (req, res) => {
  res.type("application/xml");
  res.status(200);
  res.send(samlStrategy.generateServiceProviderMetadata(PbK, PbK));
});

module.exports = router;
