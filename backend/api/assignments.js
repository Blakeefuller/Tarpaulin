const { Router } = require('express')
const { ValidationError } = require('sequelize')

const { Assignment, AssignmentClientFields } = require('../models/assignment')
const { User } = require('../models/user')
const { Course } = require('../models/course')
const { Submission } = require('../models/submission')

const { 
  getUserById,
} = require('../models/user')

const { requireAuthentication } = require("../lib/auth")

const router = Router()

/*Assignment submission creation – this action, implemented by the POST
/assignments/{id}/submissions endpoint, allows authorized student Users
to upload a file submission for a specific assignment.  Importantly, 
the file uploaded for each Submission must be stored by the API in such
a way that it can be later downloaded via URL.  Specifically, when storing
the submission file, the API should generate the URL with which that file
can later be accessed.  This URL will be returned along with the rest of
the information about the Submission from the GET 
/assignments/{id}/submissions endpoint.*/

//* /assignments - create a new assignment
router.post('/', requireAuthentication, async function (req, res, next) {
  try {
    const assignment = await Assignment.create(req.body)
    res.status(201).send({
      success: true,
      data: assignment.toJSON(),
    })
  } catch (err) {
    if (err instanceof ValidationError) {
      res.status(400).send({
        success: false,
        error: 'Invalid request body',
      })
    } else {
      next(err)
    }
  }

})


//* /assignments/{id} - fetch data about a specific assignment
router.get('/:id', requireAuthentication, async function (req, res, next) {
  try {
    const assignment = await Assignment.findOne({
      where: {
        id: req.params.id
      }
    })
    if (assignment) {
      res.status(200).send({
        success: true,
        data: assignment.toJSON(),
      })
    } else {
      next()
    }
  } catch (err) {
    next(err)
  }
})

//* /assignments/{id} - update data for a specific assignment
router.patch('/:id', requireAuthentication, async function (req, res, next) {
  const { courseId } = req.body
  let authUser, assignment
  try {
    authUser = await User.findOne({where: {id: req.user}})
  }
  catch (e) {
    next(e)
  }

  try {
    assignment = await Assignment.findOne({
      where: {
        id: req.params.id
    }})
  } catch(e) {
    next(e)
  }
  if (assignment) {
    if (authUser.role === "admin" || authUser.role === "instructor") {
      if (authUser.role === "instructor") {
        try {
          const course = await Course.findOne({where: { id: courseId}})
          if (course.instructorId !== authUser.id) {
            res.status(403).send({err: "Unauthorized to access specified resource"})
          }
        } catch (e) {
          next(e)
        }
      }
      
      if (assignment) {
        await assignment.update(req.body, {
          fields: AssignmentClientFields
        })
        res.status(200).send({
          success: true,
          data: assignment.toJSON(),
        })
      } else {
        next()
      }
    } else {
      res.status(403).send({err: "Unauthorized to access specified resource"})
    }
  } else {
    res.status(404).send({err: "course not found"})
  }
})

//* /assignments/{id} - delete a specific assignment from DB
router.delete('/:id', requireAuthentication, async function (req, res, next) {
  let authUser, assignment
  try {
    authUser = await User.findOne({where: {id: req.user}})
  } catch(e) {
    next(e)
  }

  try {
    assignment = await Assignment.findOne({
      where: {
        id: req.params.id
    }})
  } catch(e) {
    next(e)
  }

  if (assignment) {
    if (authUser.role === "admin" || authUser.role === "instructor") {
      if (authUser.role === "instructor") {
        try {
          const course = await Course.findOne({where: { id: assignment.courseId}})
          if (course.instructorId !== authUser.id) {
            res.status(403).send({err: "Unauthorized to access specified resource"})
          }
        } catch (e) {
          next(e)
        }
      }
      try {
        const assignment = await Assignment.findOne({
          where: {
            id: req.params.id
          }
        })
        if (assignment) {
          const result = await assignment.destroy({where: {id: req.params.id}})
          res.status(204).send()
        } else {
          next()
        }
      } catch (err) {
        next(err)
      }
    } else {
      res.status(403).send({err: "Unauthorized to access specified resource"})
    }
  } else {
    res.status(404).send({err: `Specified Assignment ${req.params.id} not found`})
  }
  
})


// * SUBMISSION

//* /assignments/{id}/submissions - fetch a list of submissions for an assignment
router.get('/:id/submissions', requireAuthentication, async function (req, res, next) {
  
  const studentId = req.body.studentId
  const currUser = await User.findOne({where: {id: req.user} })
  if (currUser.role === "admin" || currUser.role === "instructor") {
    try {
      const assignment = await Assignment.findOne({
        where: {
          id: req.params.id
        }
      })
      if (assignment) {
        let page = parseInt(req.query.page) || 1;
        const numPerPage = 10;
        page = page < 1 ? 1 : page
        const offset = (page - 1) * numPerPage
  
        try {
          const result = await Submission.findAndCountAll({
            where: {assignmentId: req.params.id},
            limit: numPerPage,
            offset: offset
          })

          const lastPage = Math.ceil(result.count / numPerPage)
          const links = {}
          if (page < lastPage) {
            links.nextPage = `/submissions?page=${page + 1}`
            links.lastPage = `/submissions?page=${lastPage}`
          }
          if (page > 1) {
            links.prevPage = `/submissions?page=${page - 1}`
            links.firstPage = '/submissions?page=1'
          }
          if (result) {
            res.send({submissions: result})
          }
        } catch (e) {
          next(e)
        }
      } else {
        next()
      }
    } catch (err) {
      next(err)
    }
  }
  else {
    // cannot access
    res.status(403).send({
      success: false,
      error: 'unable to post if you are not an instructor or admin',
    })
  }
})

//* /assignments/{id}/submissions - create a new submission for an assignment
router.post('/:id/submissions', requireAuthentication, async function (req, res, next) {
  const id = req.params.id
  // find user given studentId
  const currUser = await User.findOne({ where: {id: req.user }})
  // permissible if student
  if (currUser.role === "student") {
    // find assignment given assignment id
    try {
      const assignment = await Assignment.findOne({
        where: {
          id: id
        }
      })
      if (assignment) {
        const submission = await Submission.create(req.body)
        res.status(201).send({
          success: true,
          data: submission.toJSON(),
        })
      } else {
        next()
      }
    } catch (err) {
      if (err instanceof ValidationError) {
        res.status(400).send({
          success: false,
          error: 'Invalid request body',
        })
      } else {
        next(err)
      }
    }
  }

  // no permissions
  else {
    res.status(403).send({
      success: false,
      error: 'unable to post if you are not a student',
    })
  }
  
})


module.exports = router

 
