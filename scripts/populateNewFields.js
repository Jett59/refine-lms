db.schools.updateMany({invitedAdministratorEmails: null}, {$set: {invitedAdministratorEmails: []}})
db.schools.updateMany({invitedTeacherEmails: null}, {$set: {invitedTeacherEmails: []}})
db.schools.updateMany({invitedStudentEmails: null}, {$set: {invitedStudentEmails: []}})