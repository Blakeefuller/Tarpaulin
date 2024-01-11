const { Router } = require('express')
const sequelize = require('../lib/sequelize')
const { createWriteStream } = require('fs');
const csv = require('fast-csv');
const { ValidationError } = require('sequelize')

const { Course, CourseClientFields } = require('../models/course')
const { Assignment } = require('../models/assignment')
const { User } = require('../models/user')
const { Enrollment, enrollStudent, unenrollStudent } = require('../models/enrollment')


const { 
  getUserById,
} = require('../models/user')

const { requireAuthentication } = require("../lib/auth")

const router = Router()


//* /courses - fetch list of all courses
router.get('/', async function (req, res, next) {
  /*
  * Compute page number based on optional query string parameter `page`.
  * Make sure page is within allowed bounds.
  */
  let page = parseInt(req.query.page) || 1
  page = page < 1 ? 1 : page
  const numPerPage = 10
  const offset = (page - 1) * numPerPage
  // if (req.user) {
    try {
      const result = await Course.findAndCountAll({
        limit: numPerPage,
        offset: offset
      })

      /*
      * Generate HATEOAS links for surrounding pages.
      */
      const lastPage = Math.ceil(result.count / numPerPage)
      const links = {}
      if (page < lastPage) {
        links.nextPage = `/courses?page=${page + 1}`
        links.lastPage = `/courses?page=${lastPage}`
      }
      if (page > 1) {
        links.prevPage = `/courses?page=${page - 1}`
        links.firstPage = '/courses?page=1'
      }

      /*
      * Construct and send response.
      */
      res.status(200).json({
        courses: result.rows,
        pageNumber: page,
        totalPages: lastPage,
        pageSize: numPerPage,
        totalCount: result.count,
        links: links
      })
    } catch (e) {
      next(e)
    }
  // } else {
  //   res.status(403).send({err: "Unauthorized to access specified resource"})
  // } 
})

//* /courses - create a new course
router.post('/', requireAuthentication, async function (req, res, next) {
  const { subject, number, title, term, instructorId } = req.body

  try {
    const authUser = await getUserById(req.user)
    if (authUser.role === "admin") {
      if (subject && number && title && term && instructorId) {
        try {
          const result = await User.findOne({where: {id: instructorId}}) 
          if (!result) {
            return res.status(404).send({err: `no instructor with id ${instructorId}`})
          }
        } catch (e) {
          next(e)
        }
        try {
          const result = await Course.create(req.body)
          res.status(201).json({
            id: result.id,
            links: {
              course: `/courses/${result.id}`
            }
          });
        } catch (e) {
          if (e instanceof ValidationError) {
            res.status(400).send({
              err: e.message
            })
          } else {
            throw e
          }
        }
      } else {
        res.status(400).json({
          error: "Request body is not a valid business object"
        });
      }
    } else {
      res.status(403).send({err: "Unauthorized to access specified resource"})
    }
  } catch (e) {
    next(e)
  }
})

//* /courses/{id} - fetch data about a specific course 
router.get('/:id', async function (req, res, next) {
  const courseId  = req.params.id
  try {
    const course = await Course.findByPk(courseId)
    if (course) {
      res.status(200).send(course)
    } else {
      res.status(404).send({err: "Specified course Id not found"})
    }
  } catch (e) {
    next(e)
  }
})

//* /courses/{id} - update data about a specific course 
router.patch('/:id', requireAuthentication, async function (req, res, next) {
  const courseId = req.params.id
  const { subject, number, title, term, instructorId } = req.body
  
  try {
    const authUser = await getUserById(req.user)

    try {
      const course = await Course.findByPk(courseId)
      if (!course) {
        res.status(404).send({err: "Specified Course id not found"})
      }
      
      if (authUser.role !== "admin" && authUser.role !== "instructor") {
        res.status(403).send({err: "Unauthorized to access specified resource"})
      }
      if (course.instructorId !== instructorId && authUser.role !== "admin") {
        res.status(403).send({err: "Specified instructor id not found"})
      }
    } catch (e) {
      next(e)
    }

    if (subject && number && title && term && instructorId) {
      try {
        const result = await User.findOne({where: {id: instructorId}}) 
        if (!result) {
          return res.status(403).send({err: `instructor with id ${instructorId} does not match `})
        }
      } catch (e) {
        next(e)
      }
      try {
        const result = await Course.update(req.body, {
          where: { id: courseId },
          fields: CourseClientFields
        })
        if (result[0] > 0) {
          res.status(204).send()
        } else {
          next()
        }
      } catch (e) {
        next(e)
      }
    } else {
      res.status(400).json({
        error: "Request body is not a valid business object"
      });
    }
  } catch (e) {
    next(e)
  }
})

//* /courses/{id} - remove a specific course from DB 
router.delete('/:id', requireAuthentication,  async function (req, res, next) {
  const courseId = req.params.id
  let courseResult, enrollmentResult
  try {
    const authUser = await getUserById(req.user)
    try {
      const course = await Course.findByPk(courseId)
      if (!course) {
        res.status(404).send({err: "Specified Course id not found"})
      }
      if (authUser.role !== "admin") {
        res.status(403).send({err: "Unauthorized to access specified resource"})
      } else {
        try {
          await sequelize.transaction(async (transaction) => {
            courseResult = await Course.destroy({ where: { id: courseId }})
            enrollmentResult = await Enrollment.destroy({ where: { courseId: courseId }, transaction });
          })
          // * ADD removing students enrolled in course
          if (courseResult > 0 || enrollmentResult > 0) {
            res.status(204).send()
          } else {
            next()
          }
        } catch (e) {
          next(e)
        }
      }
    } catch (e) {
      next(e)
    }
  } catch (e) {
    next(e)
  }

})

//* /courses/{id}/students - fetch a list of all students enrolled in course
router.get('/:id/students', requireAuthentication, async function (req, res, next) {
  const courseId = req.params.id
  let course, authUser

  try {
    authUser = await getUserById(req.user)

    try {
      course = await Course.findByPk(courseId)
      if (!course) {
        return res.status(404).send({err: "Specified Course id not found"})
      }
      if (authUser.role !== "admin" && authUser.role !== "instructor") {
        return res.status(403).send({err: "Unauthorized to access specified resource"})
      }
      if (course.instructorId !== authUser.id  && authUser.role !== "admin") {
        return res.status(403).send({err: "Specified instructor id does not match auth user"})
      }
    } catch (e) {
      next(e)
    }
  } catch(e) {
    next(e)
  }

  try {
    const result = await Enrollment.findAll({ where: { courseId: courseId }})
    res.status(200).send({students: result})
  } catch(e) {
    next(e)
  }

})

//* /courses/{id}/students - update enrollment for a course {id} - course id
router.post('/:id/students', requireAuthentication, async function (req, res, next) {
  const courseId = req.params.id
  const enroll = req.body.add
  const unenroll = req.body.remove
  let resultEnrolled, resultUnenrolled, authUser, course

  if (!enroll || !unenroll) {
    return res.status(400).send({error: "The request body was either not present or did not contain the fields described above"})
  }

  try {
    authUser = await getUserById(req.user)

    try {
      course = await Course.findByPk(courseId)
      if (!course) {
        return res.status(404).send({err: "Specified Course id not found"})
      }
      if (authUser.role !== "admin" && authUser.role !== "instructor") {
        return res.status(403).send({err: "Unauthorized to access specified resource"})
      }
      if (course.instructorId !== authUser.id && authUser.role !== "admin") {
        return res.status(403).send({err: "Specified instructor id does not match auth user"})
      }
    } catch (e) {
      next(e)
    }
  } catch(e) {
    next(e)
  }


  try {
    resultEnrolled = await enrollStudent(enroll, courseId)
  } catch (e) {
    return next(e);
  }
  
  try {
    resultUnenrolled = await unenrollStudent(unenroll, courseId)          
  } catch (e) {
    return next(e);
  }
  return res.status(201).send({added: resultEnrolled, removed: resultUnenrolled})
  
})

//* /courses/{id}/roster - fetch a CSV file containing list of students enrolled in course
router.get('/:id/roster', requireAuthentication, async function (req, res, next) {
  const courseId = req.params.id
  let course, authUser

  try {
    authUser = await getUserById(req.user)

    try {
      course = await Course.findByPk(courseId)
      if (!course) {
        return res.status(404).send({err: "Specified Course id not found"})
      }
      if (authUser.role !== "admin" && authUser.role !== "instructor") {
        return res.status(403).send({err: "Unauthorized to access specified resource"})
      }
      if (course.instructorId !== authUser.id  && authUser.role !== "admin") {
        return res.status(403).send({err: "Specified instructor id does not match auth user"})
      }
    } catch (e) {
      next(e)
    }
  } catch(e) {
    next(e)
  }

  try {
    const enrollments = await Enrollment.findAll({ where: { courseId: courseId }})
    const studentIds = enrollments.map(enrollment => enrollment.studentId);
    const students = await User.findAll({
      attributes: ['id', 'name', 'email'],
      where: {
        id: studentIds,
        role: 'student',
      },
    })

    const csvStream = csv.format({ headers: true });
    const writableStream = createWriteStream('./students.csv');
    csvStream.pipe(writableStream);

    students.forEach(student => {
      csvStream.write({
        ID: student.id,
        Name: student.name,
        Email: student.email
      })
    })

    csvStream.end();

    res.status(200).download('students.csv', 'students.csv')
  } catch(e) {
    next(e)
  }
  
})

//* /courses/{id}/assignments - fetch a list of all assignments for the course
router.get('/:id/assignments', async function (req, res, next) {
  const courseId = req.params.id
  let course
  try {
    course = await Course.findByPk(courseId)
    if (!course) {
      return res.status(404).send({err: "Specified Course id not found"})
    }
  } catch (e) {
    return next(e)
  }

  try {
    const assignments = await Assignment.findAll({where: {courseId: courseId}}) 
    res.status(200).send({assignments: assignments})
  } catch (e) {
    next()
  }
})

module.exports = router