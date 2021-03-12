//all routes related to retrieve, update, delete courses
const { addSampleUsers } = require("../data/userSamples.js");
const { addSampleDistributions } = require("../data/distributionSamples.js");
const { addSampleCourses } = require("../data/courseSamples.js");
const {
  returnData,
  errorHandler,
  distributionCreditUpdate,
} = require("./helperMethods.js");
const courses = require("../model/Course.js");
const distributions = require("../model/Distribution.js");
const users = require("../model/User.js");

import Express from "express";
const router = Express.Router();

// define interface for some type of object
// export interface Course {}

router.get("/api/addSamples", (_req, res) => {
  addSampleUsers(users).catch((err) => errorHandler(res, 500, err));
  addSampleDistributions(distributions).catch((err) =>
    errorHandler(res, 500, err)
  );
  addSampleCourses(courses).catch((err) => errorHandler(res, 500, err));
});

//return all courses of the user
router.get("/api/courses/user/:user_id", (req, res) => {
  const user_id = req.params.user_id;
  courses
    .findByUserId(user_id)
    .then((courses) => returnData(courses, res))
    .catch((err) => errorHandler(res, 500, err));
});

//if distribution_id is not found data field would be an empty array
router.get("/api/courses/distribution/:distribution_id", (req, res) => {
  const d_id = req.params.distribution_id;
  courses
    .findByDistributionId(d_id)
    .then((courses) => returnData(courses, res))
    .catch((err) => errorHandler(res, 500, err));
});

router.get("/api/courses/:course_id", (req, res) => {
  const c_id = req.params.course_id;
  courses
    .findById(c_id)
    .then((course) => returnData(course, res))
    .catch((err) => errorHandler(res, 500, err));
});

//get courses by term. provide user id, year, and term
router.get("/api/courses/term/:user_id", (req, res) => {
  const user_id = req.params.user_id;
  const year = req.query.year;
  const term = req.query.term;
  console.log("route called");
  users
    .findCoursesByTerm(user_id, year, term)
    .then((courses) => returnData(courses, res))
    .catch((err) => errorHandler(res, 500, err));
});

//add course, need to provide course info as json object in request body
//distribution field is also updated
router.post("/api/courses", async (req, res) => {
  const course = req.body;
  await users
    .findById(course.user_id)
    .then((user) => {
      course.distribution_ids.forEach((id) => {
        if (!user.distributions.includes(id)) {
          errorHandler(res, 400, {
            message: "Invalid combination of user_id and distribution_ids.",
          });
        }
      });
    })
    .catch((err) => errorHandler(res, 500, err));
  courses
    .create(course)
    .then((course) => {
      course.distribution_ids.forEach((id) => {
        distributions
          .findByIdAndUpdate(
            id,
            { $push: { courses: course._id } },
            { new: true, runValidators: true }
          )
          .then((distribution) =>
            distributionCreditUpdate(distribution, course, true)
          )
          .catch((err) => errorHandler(res, 500, err));
      });
      //add course id to user's year array
      let query = {};
      query[course.year] = course._id; //e.g. { freshman: id }
      users.findByIdAndUpdate(course.user_id, { $push: query }).exec();
      returnData(course, res);
    })
    .catch((err) => errorHandler(res, 400, err));
});

//switch the "taken" status of a course, need to provide status in req body
//update distribution credits accordingly
router.patch("/api/courses/changeStatus/:course_id", (req, res) => {
  const c_id = req.params.course_id;
  const taken = req.body.taken;
  if (typeof taken !== "boolean") {
    errorHandler(res, 400, { message: "Invalid taken status." });
  } else {
    courses
      .findByIdAndUpdate(c_id, { taken }, { new: true, runValidators: true })
      .then((course) => {
        course.distribution_ids.forEach((id) => {
          distributions.findById(id).then((distribution) => {
            if (taken) {
              distribution.current += course.credits;
            } else {
              distribution.current -= course.credits;
            }
            distribution.save();
          });
        });
        returnData(course, res);
      })
      .catch((err) => errorHandler(res, 404, err));
  }
});

//change course's distribution, need to provide distribution_ids in req body
//!!!does not update credit!!! need to consider whether the user can change or not
router.patch("/api/courses/changeDistribution/:course_id"),
  (req: any, res: any) => {
    const c_id: string = req.params.course_id;
    const distribution_ids: string[] = req.body.distribution;
    if (!distribution_ids) {
      errorHandler(res, 400, { message: "Invalid distribution." });
    } else {
      courses
        .findByIdAndUpdate(
          c_id,
          { distribution_ids },
          { new: true, runValidators: true }
        )
        .then((course) => returnData(course, res))
        .catch((err) => errorHandler(res, 404, err));
    }
  };

//delete a course given course id
router.delete("/api/courses/:course_id", (req, res) => {
  const c_id = req.params.course_id;
  courses
    .findByIdAndDelete(c_id)
    .then((course) => {
      course.distribution_ids.forEach((id) => {
        distributions
          .findByIdAndUpdate(
            id,
            { $pull: { courses: c_id } },
            { new: true, runValidators: true }
          )
          .then((distribution) =>
            distributionCreditUpdate(distribution, course, false)
          )
          .catch((err) => errorHandler(res, 500, err));
      });
      //delete course id to user's year array
      let query = {};
      query[course.year] = course._id; //e.g. { freshman: id }
      users.findByIdAndUpdate(course.user_id, { $pull: query }).exec();
      returnData(course, res);
    })
    .catch((err) => errorHandler(res, 500, err));
});

module.exports = router;
