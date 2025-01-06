db.schools.updateMany({ invitedAdministratorEmails: null }, { $set: { invitedAdministratorEmails: [] } })
db.schools.updateMany({ invitedTeacherEmails: null }, { $set: { invitedTeacherEmails: [] } })
db.schools.updateMany({ invitedStudentEmails: null }, { $set: { invitedStudentEmails: [] } })
// Add the requestingStudentIds field to the classes in the schools
db.schools.updateMany({ 'yearGroups.courses.classes.requestingStudentIds': null }, { $set: { 'yearGroups.$[].courses.$[].classes.$[i].requestingStudentIds': [] } }, { arrayFilters: [{ 'i.requestingStudentIds': null }] })
