const { DataTypes } = require('sequelize')

const sequelize = require('../lib/sequelize')
const { Course } = require('./course')

const Assignment = sequelize.define('assignment', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  due: {
    type: DataTypes.DATE,
    allowNull: false
  }
})

Course.hasMany(Assignment, { foreignKey: { name: 'courseId', type: DataTypes.INTEGER }, allowNull: false });
Assignment.belongsTo(Course, { foreignKey: 'courseId' });

exports.Assignment = Assignment

/*
 * Export an array containing the names of fields the client is allowed to set
 * on assignmentes.
 */
exports.AssignmentClientFields = [
  'courseId',
  'title',
  'points',
  'due'
]
