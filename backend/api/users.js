const { Router } = require("express");
const { ValidationError } = require("sequelize");
const bcrypt = require("bcryptjs");
const { Course } = require('../models/course')
const { Enrollment } = require('../models/enrollment')


const {
  User,
  UserClientFields,
  insertNewUser,
  getUserById,
  validateUser,
} = require("../models/user");

const { generateAuthToken, requireAuthentication } = require("../lib/auth");

const router = Router();

// *  /users - create a new user
router.post("/", requireAuthentication, async function (req, res, next) {
  try {
    if (req.body.role == "admin" || req.body.role == "instructor") {
      const userCheck = await User.findAll({
        where: { id: req.user },
      });
      console.log("==user: ", userCheck);
      if (userCheck[0].dataValues.role != "admin") {
        res.status(403).send({
          error: "Unauthorized to create this user.",
        });
      }
    }

    const password = req.body.password;

    req.body.password = await bcrypt.hash(password, 8);
    console.log("Inserting new user:", req.body);

    const user = await User.create(req.body);
    res.status(201).send({ id: user.id });
  } catch (e) {
    if (e instanceof ValidationError) {
      res.status(400).send({ error: e.message });
    } else {
      next(e);
    }
  }
});

// *  /users/login - log in a user
router.post("/login", async function (req, res, next) {
  const user = await User.findOne({
    where: { email: req.body.email },
  });

  try {
    const authenticated =
      user && (await bcrypt.compare(req.body.password, user.password));

    if (authenticated) {
      const token = generateAuthToken(user.id);
      res.status(200).send({ token: token });
    } else {
      res.status(401).send({ error: "Invalid authentication credentials" });
    }
  } catch (e) {
    res.status(500).send({
      error: "Error logging in.  Try again later.",
    });
  }
});

// *  /users/{id}: fetch data about a specific user
router.get("/:id", requireAuthentication, async function (req, res, next) {
  if (req.user == req.params.id) {
    try {
      const user = await User.findByPk(req.params.id);
      if (user.role == "instructor") {
        const courses = await Course.findAll({
          where: { instructorId: req.params.id },
        });
        res.status(200).json({
          courses: courses,
        });
      } else if (user.role == "student") {
        const enrollment = await Enrollment.findAll({where: {studentId: user.id}})
        res.status(200).json({
          courses: enrollment,
        });
      } else if (user.role == "admin") {
        res.status(200).json({
          user: user,
        });
      } else {
        next();
      }
    } catch (e) {
      next(e);
    }
  } else {
    res.status(403).send({
      error: "Unauthorized to access this resource",
    });
  }
});

module.exports = router;
