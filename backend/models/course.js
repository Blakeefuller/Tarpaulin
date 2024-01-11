const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')
const { User } = require('./user')

const Course = sequelize.define('course', {
  subject: {
    type: DataTypes.STRING(10),
    allowNull: false
  },
  number: {
    type: DataTypes.STRING(3),
    allowNull: false
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  term: {
    type: DataTypes.STRING(4),
    allowNull: false
  }
})

User.hasMany(Course, { foreignKey: { name: 'instructorId', type: DataTypes.INTEGER }, allowNull: false });
Course.belongsTo(User, { foreignKey: 'instructorId' });

exports.Course = Course

/*
 * Export an array containing the names of fields the client is allowed to set
 * on Course.
 */
exports.CourseClientFields = [
 'subject',
 'number',
 'title',
 'term',
 'instructorId'
]

