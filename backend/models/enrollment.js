const { DataTypes, Op } = require('sequelize');
const sequelize = require('../lib/sequelize');
const { User, getUserById } = require('./user');
const { Course } = require('./course');

const Enrollment = sequelize.define('enrollment', {
  studentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: User,
      key: 'id',
    },
  },
  courseId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: Course,
      key: 'id',
    },
  },
});

Course.belongsToMany(User, { through: Enrollment, foreignKey: 'courseId' });
User.belongsToMany(Course, { through: Enrollment, foreignKey: 'studentId' });

exports.Enrollment = Enrollment;

/*
 * Export an array containing the names of fields the client is allowed to set
 * on Course.
 */
exports.EnrollmentClientFields = [
  'studentId',
  'courseId',
];

exports.enrollStudent = async(studentIds, courseId) => {
  try {
    const enrollments = await Promise.all(studentIds.map(async (studentId) => {
      const user = await getUserById(studentId);
      if (!user) {
        throw new Error(`User with ID ${studentId} not found`);
      }
      if (user.role !== 'student') {
        throw new Error(`User with ID ${studentId} is not a student`);
      }
      return { studentId, courseId };
    }));
  
    const result = await Enrollment.bulkCreate(enrollments);
    return result;
  } catch (e) {
    throw e;
  }
  
  // try {
  //   const enrollments = studentIds.map((studentId) => ({ studentId, courseId }));
  //   console.log("==enrollments: ", enrollments)
    
  //   const result = await Enrollment.bulkCreate(enrollments);
  //   return result;
  // } catch (e) {
  //   throw e;
  // }
}

exports.unenrollStudent = async(studentIds, courseId) => {
  try {
    const result = await Enrollment.destroy({
      where: {
        studentId: { [Op.in]: studentIds },
        courseId: courseId
      }
    })
    return result;
  } catch (e) {
    throw e;
  }
}
